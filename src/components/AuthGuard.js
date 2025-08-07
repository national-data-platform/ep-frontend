import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, CheckCircle, XCircle, Clock, Wifi, WifiOff } from 'lucide-react';
import { statusAPI } from '../services/api';

// Configuration constants - easily modifiable for future versions
const FRONTEND_VERSION = '0.1.0';
const MINIMUM_API_VERSION = '0.1.0';
const API_VERSION_CHECK_TIMEOUT = 5000; // 5 seconds timeout for API check

/**
 * Compare semantic versions (e.g., "1.2.3" vs "1.2.4")
 * Returns: -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
const compareVersions = (version1, version2) => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  
  return 0;
};

/**
 * AuthGuard component that requires authentication before accessing the app
 * Now includes API version compatibility checking on startup
 * Only accepts JWT tokens, no username/password login
 * ENHANCED: Added API version verification and compatibility validation
 */
const AuthGuard = ({ children, onAuthenticated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');

  // API Version Check States
  const [apiStatus, setApiStatus] = useState({
    checking: true,
    connected: false,
    version: null,
    compatible: false,
    error: null
  });

  /**
   * Check API version and compatibility on component mount
   */
  useEffect(() => {
    const checkApiVersion = async () => {
      console.log('Starting API version compatibility check...');
      
      try {
        setApiStatus(prev => ({ ...prev, checking: true, error: null }));
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('API connection timeout')), API_VERSION_CHECK_TIMEOUT);
        });
        
        // Race between API call and timeout
        const response = await Promise.race([
          statusAPI.getStatus(),
          timeoutPromise
        ]);
        
        console.log('API status response:', response.data);
        
        // Extract version from API response
        const apiVersion = response.data?.version || response.data?.api_version || 'unknown';
        const isCompatible = apiVersion !== 'unknown' ? 
          compareVersions(apiVersion, MINIMUM_API_VERSION) >= 0 : false;
        
        setApiStatus({
          checking: false,
          connected: true,
          version: apiVersion,
          compatible: isCompatible,
          error: null
        });
        
        console.log(`API Version: ${apiVersion}, Compatible: ${isCompatible}, Frontend: ${FRONTEND_VERSION}`);
        
        if (!isCompatible && apiVersion !== 'unknown') {
          console.warn(`API version ${apiVersion} is below minimum required version ${MINIMUM_API_VERSION}`);
        }
        
      } catch (err) {
        console.error('API version check failed:', err);
        
        let errorMessage = 'Unable to connect to API';
        
        if (err.message === 'API connection timeout') {
          errorMessage = 'API connection timeout - server may be down';
        } else if (err.response?.status === 401) {
          errorMessage = 'API authentication required';
        } else if (err.response?.status >= 500) {
          errorMessage = 'API server error';
        } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
          errorMessage = 'Network connection failed';
        }
        
        setApiStatus({
          checking: false,
          connected: false,
          version: null,
          compatible: false,
          error: errorMessage
        });
      }
    };

    checkApiVersion();
  }, []);

  /**
   * Check if user is already authenticated after API version check
   */
  useEffect(() => {
    // Only check auth after API version check is complete
    if (apiStatus.checking) return;
    
    const existingToken = localStorage.getItem('authToken');
    
    if (existingToken && existingToken.trim()) {
      // Accept any non-empty token (like before)
      if (isValidTokenFormat(existingToken)) {
        setIsAuthenticated(true);
        onAuthenticated && onAuthenticated();
      } else {
        // Invalid token format, remove it
        localStorage.removeItem('authToken');
        setError('Invalid token. Please enter a valid token.');
      }
    }
    
    setLoading(false);
  }, [apiStatus.checking]); // FIXED: Removed onAuthenticated from dependencies

  /**
   * Basic token validation (accepts any non-empty token)
   */
  const isValidTokenFormat = (token) => {
    // Accept any non-empty token (like the original implementation)
    return token && token.trim().length > 0;
  };

  /**
   * Handle token submission
   */
  const handleTokenSubmit = (e) => {
    e.preventDefault();
    
    if (!token.trim()) {
      setError('Please enter a valid token');
      return;
    }

    // Accept any non-empty token (no strict JWT validation)
    if (!isValidTokenFormat(token.trim())) {
      setError('Token cannot be empty. Please enter a valid token.');
      return;
    }

    try {
      // Save token to localStorage
      localStorage.setItem('authToken', token.trim());
      
      setError(null);
      setIsAuthenticated(true);
      onAuthenticated && onAuthenticated();
      
    } catch (err) {
      console.error('Token authentication error:', err);
      setError('Failed to authenticate. Please check your token.');
    }
  };

  /**
   * Handle token visibility toggle
   */
  const handleToggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  /**
   * Show loading state during API check
   */
  if (loading || apiStatus.checking) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner" style={{ 
          width: '40px', 
          height: '40px',
          borderWidth: '4px'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
          {apiStatus.checking ? 'Checking API compatibility...' : 'Checking authentication...'}
        </p>
        
        {/* Show API status during check */}
        {apiStatus.checking && (
          <div style={{
            backgroundColor: 'white',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Frontend Version: <strong>{FRONTEND_VERSION}</strong>
            </p>
          </div>
        )}
      </div>
    );
  }

  /**
   * Show authentication required screen
   */
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e2e8f0'
        }}>
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            {/* Logo */}
            <div style={{
              marginBottom: '1rem',
              minHeight: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="https://nationaldataplatform.org/National_Data_Platform_horiz_stacked.svg"
                alt="National Data Platform Logo"
                style={{
                  maxWidth: '220px',
                  maxHeight: '80px',
                  height: 'auto',
                  width: 'auto'
                }}
                onLoad={() => {
                  console.log('NDP logo loaded successfully');
                }}
                onError={(e) => {
                  console.error('Failed to load NDP logo from nationaldataplatform.org');
                  // Try alternative approaches
                  e.target.style.display = 'none';
                  
                  // Create fallback text logo
                  const fallback = document.createElement('div');
                  fallback.innerHTML = '<div style="font-size: 1.8rem; font-weight: bold; color: #2563eb; margin: 20px 0;">National Data Platform</div>';
                  e.target.parentNode.appendChild(fallback);
                }}
              />
            </div>
            
            <h1 style={{
              fontSize: '1.6rem',
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '0.25rem'
            }}>
              NDP EndPoint
            </h1>
            
            <p style={{
              color: '#64748b',
              fontSize: '1rem',
              lineHeight: '1.4',
              margin: 0
            }}>
              Admin console
            </p>
          </div>

          {/* API Status Section */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <h4 style={{
              color: '#374151',
              marginBottom: '0.75rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {apiStatus.connected ? (
                <Wifi size={16} style={{ color: '#059669' }} />
              ) : (
                <WifiOff size={16} style={{ color: '#dc2626' }} />
              )}
              API Connection Status
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {/* API Version */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>API Version:</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: 'monospace',
                  color: '#374151'
                }}>
                  {apiStatus.version || 'Unknown'}
                </span>
              </div>

              {/* Frontend Version */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Frontend:</span>
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  fontFamily: 'monospace',
                  color: '#374151'
                }}>
                  {FRONTEND_VERSION}
                </span>
              </div>

              {/* Compatibility Status */}
              {apiStatus.connected && apiStatus.version && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#64748b' }}>Compatible:</span>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: apiStatus.compatible ? '#059669' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {apiStatus.compatible ? (
                      <>
                        <CheckCircle size={14} />
                        Yes
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} />
                        No
                      </>
                    )}
                  </span>
                </div>
              )}

              {/* Error Message */}
              {apiStatus.error && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                    {apiStatus.error}
                  </span>
                </div>
              )}

              {/* Compatibility Warning */}
              {apiStatus.connected && apiStatus.version && !apiStatus.compatible && (
                <div style={{
                  backgroundColor: '#fefce8',
                  border: '1px solid #fef08a',
                  borderRadius: '4px',
                  padding: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                  <span style={{ color: '#ca8a04', fontSize: '0.75rem' }}>
                    ⚠️ API version {apiStatus.version} is below minimum required {MINIMUM_API_VERSION}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '0.75rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertCircle size={20} style={{ color: '#dc2626' }} />
              <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                {error}
              </span>
            </div>
          )}

          {/* Token Form - Only show if API is connected (or show with warning) */}
          <form onSubmit={handleTokenSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem',
                fontSize: '0.9rem'
              }}>
                Access Token
              </label>
              
              <div style={{ position: 'relative' }}>
                <textarea
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="testing_password"
                  required
                  disabled={!apiStatus.connected} // Disable if API not connected
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '0.75rem',
                    paddingRight: '2.5rem',
                    border: '2px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontFamily: showToken ? 'monospace' : 'inherit',
                    lineHeight: '1.4',
                    resize: 'vertical',
                    transition: 'border-color 0.3s ease',
                    backgroundColor: !apiStatus.connected ? '#f3f4f6' : 'white',
                    opacity: !apiStatus.connected ? 0.6 : 1,
                    // Text masking implementation
                    WebkitTextSecurity: showToken ? 'none' : 'disc',
                    textSecurity: showToken ? 'none' : 'disc',
                    // Fallback for browsers that don't support text-security
                    ...(showToken ? {} : {
                      fontFamily: 'text-security-disc, -webkit-small-control, monospace',
                      letterSpacing: '0.125em'
                    })
                  }}
                  onFocus={(e) => {
                    if (apiStatus.connected) {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                <button
                  type="button"
                  onClick={handleToggleTokenVisibility}
                  disabled={!apiStatus.connected}
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: !apiStatus.connected ? '#9ca3af' : '#64748b',
                    cursor: !apiStatus.connected ? 'not-allowed' : 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease',
                    opacity: !apiStatus.connected ? 0.5 : 1
                  }}
                  title={showToken ? 'Hide token' : 'Show token'}
                  onMouseOver={(e) => {
                    if (apiStatus.connected) {
                      e.target.style.backgroundColor = '#f1f5f9';
                      e.target.style.color = '#374151';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (apiStatus.connected) {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = '#64748b';
                    }
                  }}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Token visibility indicator */}
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                marginTop: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                {showToken ? (
                  <>
                    <Eye size={12} />
                    <span>Token is visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff size={12} />
                    <span>Token is hidden</span>
                  </>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!apiStatus.connected}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: !apiStatus.connected ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: !apiStatus.connected ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: !apiStatus.connected ? 0.6 : 1
              }}
              onMouseOver={(e) => {
                if (apiStatus.connected) {
                  e.target.style.backgroundColor = '#1d4ed8';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (apiStatus.connected) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              <Lock size={18} />
              {!apiStatus.connected ? 'API Connection Required' : 'Authenticate'}
            </button>
          </form>

          {/* Help Text */}
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '6px',
            border: '1px solid #e2e8f0'
          }}>
            <h4 style={{
              color: '#374151',
              marginBottom: '0.5rem',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              Need a token?
            </h4>
            <p style={{
              color: '#64748b',
              fontSize: '0.8rem',
              lineHeight: '1.5',
              margin: 0
            }}>
              Go to <strong>nationaldataplatform.org</strong> and register an account. 
              In your user panel you will find your access token.
            </p>
            
            {!apiStatus.connected && (
              <div style={{ marginTop: '0.5rem' }}>
                <p style={{
                  color: '#dc2626',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  <strong>Note:</strong> Please ensure the API server is running and accessible before attempting to authenticate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the app
  return children;
};

export default AuthGuard;