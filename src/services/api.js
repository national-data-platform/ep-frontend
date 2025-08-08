import axios from 'axios';

// Base URL of your API - configurable via environment variable
const BASE_URL = process.env.REACT_APP_API_BASE_URL || '__NDP_EP_API_URL__' || 'http://localhost:8003';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// List of endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/status/',
  '/status/metrics',
  '/status/kafka-details',
  '/status/jupyter'
];

// Request interceptor to add auth token (with exceptions for public endpoints)
apiClient.interceptors.request.use(
  (config) => {
    // Check if this is a public endpoint that doesn't need authentication
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url.startsWith(endpoint)
    );
    
    if (!isPublicEndpoint) {
      // Private endpoint - require authentication
      const authToken = localStorage.getItem('authToken');
      
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      } else {
        // If no token is available for private endpoints, we should redirect to login
        console.error('No authentication token found for private endpoint:', config.url);
        window.location.reload(); // Force re-authentication
        return Promise.reject(new Error('Authentication required'));
      }
    } else {
      // Public endpoint - no authentication required
      console.log('Making public API call to:', config.url);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle auth errors for private endpoints
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      error.config?.url?.startsWith(endpoint)
    );
    
    if (!isPublicEndpoint && error.response?.status === 401) {
      // Token expired, invalid, or missing for private endpoint
      console.error('Authentication failed:', error.response.data);
      
      // Remove invalid token
      localStorage.removeItem('authToken');
      
      // Show user-friendly message
      alert('Your session has expired. Please log in again.');
      
      // Force page reload to trigger AuthGuard
      window.location.reload();
    } else if (!isPublicEndpoint && error.response?.status === 403) {
      // User doesn't have permission for private endpoint
      console.error('Access forbidden:', error.response.data);
      alert('You do not have permission to perform this action.');
    }
    
    return Promise.reject(error);
  }
);

// Organizations API
export const organizationsAPI = {
  list: (params = {}) => 
    apiClient.get('/organization', { params }),
  
  create: (data, server = 'local') => 
    apiClient.post('/organization', data, { params: { server } }),
  
  delete: (organizationName, server = 'local') => 
    apiClient.delete(`/organization/${organizationName}`, { 
      params: { server } 
    }),
};

// Kafka Topics API
export const kafkaAPI = {
  create: (data, server = 'local') => 
    apiClient.post('/kafka', data, { params: { server } }),
  
  update: (datasetId, data, server = 'local') => 
    apiClient.put(`/kafka/${datasetId}`, data, { params: { server } }),
};

// URL Resources API
export const urlAPI = {
  create: (data, server = 'local') => 
    apiClient.post('/url', data, { params: { server } }),
  
  update: (resourceId, data, server = 'local') => 
    apiClient.put(`/url/${resourceId}`, data, { params: { server } }),
};

// S3 Resources API
export const s3API = {
  create: (data, server = 'local') => 
    apiClient.post('/s3', data, { params: { server } }),
  
  update: (resourceId, data, server = 'local') => 
    apiClient.put(`/s3/${resourceId}`, data, { params: { server } }),
};

// Services API
export const servicesAPI = {
  create: (data, server = 'local') => 
    apiClient.post('/services', data, { params: { server } }),
};

// Search API
export const searchAPI = {
  searchByTerms: (terms, keys = null, server = 'global') => {
    console.log('searchByTerms called with:', { terms, keys, server }); // Debug log
    
    // Build URL manually to ensure correct format
    let url = '/search?';
    
    // Add terms as individual parameters
    if (terms && Array.isArray(terms)) {
      terms.forEach(term => {
        url += `terms=${encodeURIComponent(term)}&`;
      });
    }
    
    // Add keys if provided
    if (keys && Array.isArray(keys) && keys.length > 0) {
      keys.forEach(key => {
        if (key !== null && key !== undefined) {
          url += `keys=${encodeURIComponent(key)}&`;
        } else {
          url += `keys=&`;
        }
      });
    }
    
    // Add server
    url += `server=${encodeURIComponent(server)}`;
    
    console.log('Final URL:', url); // Debug log
    
    return apiClient.get(url);
  },
  
  searchAdvanced: (searchData) => {
    console.log('searchAdvanced called with:', searchData); // Debug log
    return apiClient.post('/search', searchData);
  },
};

// Resources management API
export const resourcesAPI = {
  deleteById: (resourceId, server = 'local') => 
    apiClient.delete('/resource', { 
      params: { resource_id: resourceId, server } 
    }),
  
  deleteByName: (resourceName, server = 'local') => 
    apiClient.delete(`/resource/${resourceName}`, { 
      params: { server } 
    }),
};

// Status API - Now properly configured as public endpoints
export const statusAPI = {
  getStatus: () => apiClient.get('/status/'),
  getMetrics: () => apiClient.get('/status/metrics'),
  getKafkaDetails: () => apiClient.get('/status/kafka-details'),
  getJupyterDetails: () => apiClient.get('/status/jupyter'),
};

// User API - NEW: Added for user information and token validation
export const userAPI = {
  /**
   * Get current user information - requires valid Bearer token
   * Used for both user info display and token validation
   */
  getUserInfo: () => apiClient.get('/user/info'),
};

// Authentication API - Enhanced with proper user info validation
export const authAPI = {
  /**
   * Validate token by attempting to get user info
   * Returns user data if token is valid, throws error if invalid
   */
  validateToken: async (token) => {
    // Temporarily set the token for this request
    const tempClient = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    
    // Try to get user info with the provided token
    const response = await tempClient.get('/user/info');
    return response.data;
  },
  
  /**
   * Set authentication token and validate it
   * @param {string} token - The Bearer token to set and validate
   * @returns {Promise<Object>} User information if token is valid
   */
  setAndValidateToken: async (token) => {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new Error('Invalid token: Token cannot be empty');
    }
    
    try {
      // Validate the token by getting user info
      const userInfo = await authAPI.validateToken(token.trim());
      
      // If validation succeeds, store the token
      localStorage.setItem('authToken', token.trim());
      
      return userInfo;
    } catch (error) {
      // Remove any existing invalid token
      localStorage.removeItem('authToken');
      
      // Re-throw with user-friendly message
      if (error.response?.status === 401) {
        throw new Error('Invalid token: Authentication failed');
      } else if (error.response?.status === 403) {
        throw new Error('Invalid token: Insufficient permissions');
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        throw new Error('Cannot connect to API server');
      } else {
        throw new Error('Token validation failed: ' + (error.message || 'Unknown error'));
      }
    }
  },
  
  /**
   * Clear authentication data
   */
  logout: () => {
    localStorage.removeItem('authToken');
  }
};

// Redirect API
export const redirectAPI = {
  redirectToService: (serviceName) => 
    apiClient.get(`/redirect/${serviceName}`),
};

// Utility function to check if token exists
export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  return token && token.trim().length > 0;
};

// Utility function to get current token
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

// Utility function to clear authentication
export const clearAuth = () => {
  localStorage.removeItem('authToken');
};

// Utility function to get API base URL for documentation links
export const getApiBaseUrl = () => {
  return BASE_URL;
};

export default apiClient;