import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Server, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { statusAPI } from '../services/api';

/**
 * Dashboard component showing system overview and status
 * Displays key metrics, system health, and quick actions
 */
const Dashboard = () => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [kafkaDetails, setKafkaDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch system status and metrics on component mount
   */
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch all dashboard data in parallel
        const [statusResponse, metricsResponse, kafkaResponse] = 
          await Promise.allSettled([
            statusAPI.getStatus(),
            statusAPI.getMetrics(),
            statusAPI.getKafkaDetails()
          ]);

        // Handle status response
        if (statusResponse.status === 'fulfilled') {
          setSystemStatus(statusResponse.value.data);
        }

        // Handle metrics response
        if (metricsResponse.status === 'fulfilled') {
          setMetrics(metricsResponse.value.data);
        }

        // Handle Kafka details response
        if (kafkaResponse.status === 'fulfilled') {
          setKafkaDetails(kafkaResponse.value.data);
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  /**
   * Render loading state
   */
  if (loading) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System overview and status</p>
        </div>
        
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem' }}>Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
    return (
      <div className="dashboard">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">System overview and status</p>
        </div>
        
        <div className="alert alert-error">
          <AlertCircle size={20} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          System overview and status - Last updated: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-3">
        {/* API Status Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">API Status</h3>
            <Server size={24} />
          </div>
          <div className="status-indicator status-success">
            <CheckCircle size={16} />
            Online
          </div>
          <p style={{ marginTop: '0.5rem', color: '#64748b' }}>
            API is responding normally
          </p>
        </div>

        {/* CKAN Status Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Catalog Status</h3>
            <Database size={24} />
          </div>
          {systemStatus ? (
            <div className="status-indicator status-success">
              <CheckCircle size={16} />
              Connected
            </div>
          ) : (
            <div className="status-indicator status-warning">
              <Clock size={16} />
              Checking...
            </div>
          )}
        </div>

        {/* Kafka Status Card */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Streaming Status</h3>
            <Activity size={24} />
          </div>
          {kafkaDetails ? (
            <div>
              <div className="status-indicator status-success">
                <CheckCircle size={16} />
                Connected
              </div>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                Host: {kafkaDetails.host || 'N/A'}<br />
                Port: {kafkaDetails.port || 'N/A'}
              </p>
            </div>
          ) : (
            <div className="status-indicator status-warning">
              <Clock size={16} />
              Checking...
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
        </div>
        <div className="grid grid-2">
          <div>
            <h4 style={{ marginBottom: '1rem', color: '#374151' }}>
              Data Management
            </h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/organizations" className="btn btn-primary">
                Manage Organizations
              </a>
              <a href="/kafka-topics" className="btn btn-secondary">
                Add Kafka Topic
              </a>
              <a href="/search" className="btn btn-secondary">
                Search Resources
              </a>
            </div>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '1rem', color: '#374151' }}>
              Resource Management
            </h4>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <a href="/url-resources" className="btn btn-secondary">
                Add URL Resource
              </a>
              <a href="/s3-resources" className="btn btn-secondary">
                Add S3 Resource
              </a>
              <a href="/services" className="btn btn-secondary">
                Register Service
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* System Information */}
      {(systemStatus || metrics) && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">System Information</h3>
          </div>
          <div className="grid grid-2">
            {systemStatus && (
              <div>
                <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>
                  System Status
                </h4>
                <pre style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(systemStatus, null, 2)}
                </pre>
              </div>
            )}
            
            {metrics && (
              <div>
                <h4 style={{ marginBottom: '0.5rem', color: '#374151' }}>
                  Metrics
                </h4>
                <pre style={{ 
                  background: '#f8fafc', 
                  padding: '1rem', 
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  overflow: 'auto'
                }}>
                  {JSON.stringify(metrics, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;