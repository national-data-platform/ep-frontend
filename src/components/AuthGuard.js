import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * AuthGuard component that requires authentication before accessing the app
 * Only accepts JWT tokens, no username/password login
 * FIXED: Token visibility toggle now works correctly
 */
const AuthGuard = ({ children, onAuthenticated }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');

  /**
   * Check if user is already authenticated on component mount
   */
  useEffect(() => {
    const checkAuth = () => {
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
    };

    checkAuth();
  }, [onAuthenticated]); // Added missing dependency

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
   * FIXED: Improved toggle functionality for textarea
   */
  const handleToggleTokenVisibility = () => {
    setShowToken(!showToken);
  };

  /**
   * Show loading state
   */
  if (loading) {
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
          Checking authentication...
        </p>
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

          {/* Token Form */}
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
                    backgroundColor: 'white',
                    // FIXED: Proper text masking implementation
                    WebkitTextSecurity: showToken ? 'none' : 'disc',
                    textSecurity: showToken ? 'none' : 'disc',
                    // Fallback for browsers that don't support text-security
                    ...(showToken ? {} : {
                      fontFamily: 'text-security-disc, -webkit-small-control, monospace',
                      letterSpacing: '0.125em'
                    })
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                
                <button
                  type="button"
                  onClick={handleToggleTokenVisibility}
                  style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  title={showToken ? 'Hide token' : 'Show token'}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f1f5f9';
                    e.target.style.color = '#374151';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#64748b';
                  }}
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* FIXED: Added visual indicator of token visibility state */}
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
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#1d4ed8';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <Lock size={18} />
              Authenticate
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
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated, render the app
  return children;
};

export default AuthGuard;