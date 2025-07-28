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

// Request interceptor to add auth token (always required)
apiClient.interceptors.request.use(
  (config) => {
    const authToken = localStorage.getItem('authToken');
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    } else {
      // If no token is available, we should redirect to login
      // This shouldn't happen with AuthGuard, but it's a safety net
      console.error('No authentication token found');
      window.location.reload(); // Force re-authentication
      return Promise.reject(new Error('Authentication required'));
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
    if (error.response?.status === 401) {
      // Token expired, invalid, or missing
      console.error('Authentication failed:', error.response.data);
      
      // Remove invalid token
      localStorage.removeItem('authToken');
      
      // Show user-friendly message
      alert('Your session has expired. Please log in again.');
      
      // Force page reload to trigger AuthGuard
      window.location.reload();
    } else if (error.response?.status === 403) {
      // User doesn't have permission
      console.error('Access forbidden:', error.response.data);
      alert('You do not have permission to perform this action.');
    }
    
    return Promise.reject(error);
  }
);

// Remove the auth API since we only use tokens
// No need for login/logout functions

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

// Status API
export const statusAPI = {
  getStatus: () => apiClient.get('/status/'),
  getMetrics: () => apiClient.get('/status/metrics'),
  getKafkaDetails: () => apiClient.get('/status/kafka-details'),
  getJupyterDetails: () => apiClient.get('/status/jupyter'),
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

export default apiClient;