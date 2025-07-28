import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Plus, 
  AlertCircle, 
  Edit3,
  Save,
  X,
  FileText,
  Trash2
} from 'lucide-react';
import { organizationsAPI, searchAPI } from '../services/api';

// Create a simple dataset API client since it's not in the existing api.js
const datasetAPI = {
  create: (data, server = 'local') => {
    const apiClient = require('../services/api').default;
    return apiClient.post('/dataset', data, { params: { server } });
  },
  
  update: (datasetId, data, server = 'local') => {
    const apiClient = require('../services/api').default;
    return apiClient.put(`/dataset/${datasetId}`, data, { params: { server } });
  },
  
  partialUpdate: (datasetId, data, server = 'local') => {
    const apiClient = require('../services/api').default;
    return apiClient.patch(`/dataset/${datasetId}`, data, { params: { server } });
  },
  
  delete: (datasetId, server = 'local') => {
    const apiClient = require('../services/api').default;
    // Use the same endpoint as resources since datasets are resources in CKAN
    return apiClient.delete('/resource', { 
      params: { resource_id: datasetId, server } 
    });
  }
};

/**
 * Dataset Management component for creating and managing general datasets
 * Provides full CRUD operations for datasets with flexible schema
 */
const DatasetManagement = () => {
  const [datasets, setDatasets] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDataset, setEditingDataset] = useState(null);
  const [selectedServer] = useState('local'); // Fixed to local for consistency

  // Form state for creating/editing dataset
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    owner_org: '',
    notes: '',
    extras: {},
    resources: []
  });

  // JSON editor states for complex fields
  const [extrasJson, setExtrasJson] = useState('{}');
  const [resourcesJson, setResourcesJson] = useState('[]');

  /**
   * Fetch organizations for dropdown
   */
  const fetchOrganizations = useCallback(async () => {
    try {
      const response = await organizationsAPI.list({ server: selectedServer });
      setOrganizations(response.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  }, [selectedServer]);

  /**
   * Fetch all datasets (filtered to show only general datasets)
   */
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use search to get all datasets
      const response = await searchAPI.searchByTerms([''], null, selectedServer);
      
      // Filter out specific resource types to show only general datasets
      const filteredDatasets = (response.data || []).filter(dataset => {
        const extras = dataset.extras || {};
        const resources = dataset.resources || [];
        
        // Exclude if it's a Kafka topic
        if (extras.kafka_topic || extras.kafka_host) {
          return false;
        }
        
        // Exclude if it's in the services organization
        if (dataset.owner_org === 'services') {
          return false;
        }
        
        // Exclude if it has S3 resources
        if (resources.some(resource => 
          resource.url && (
            resource.url.startsWith('s3://') || 
            resource.url.includes('s3.amazonaws.com') ||
            resource.url.includes('.s3.')
          )
        )) {
          return false;
        }
        
        // Exclude if it's primarily a URL resource (single URL resource with no other content)
        if (resources.length === 1 && 
            resources[0].url && 
            !resources[0].url.startsWith('s3://') &&
            Object.keys(extras).length === 0 &&
            (!dataset.notes || dataset.notes.trim() === '')) {
          return false;
        }
        
        // Include everything else (general datasets)
        return true;
      });
      
      setDatasets(filteredDatasets);
      
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setError('Failed to load datasets: ' + 
        (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }, [selectedServer]);

  /**
   * Fetch organizations and datasets on component mount
   */
  useEffect(() => {
    fetchOrganizations();
    fetchDatasets();
  }, [fetchOrganizations, fetchDatasets]);

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Parse JSON string safely
   */
  const parseJsonSafely = (jsonString, fallback = {}) => {
    try {
      return jsonString.trim() === '' ? fallback : JSON.parse(jsonString);
    } catch {
      return fallback;
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setFormData({
      name: '',
      title: '',
      owner_org: '',
      notes: '',
      extras: {},
      resources: []
    });
    setExtrasJson('{}');
    setResourcesJson('[]');
    setEditingDataset(null);
    setShowCreateForm(false);
  };

  /**
   * Prepare form data for submission
   */
  const prepareFormData = () => {
    // Parse JSON fields
    const extras = parseJsonSafely(extrasJson, {});
    const resources = parseJsonSafely(resourcesJson, []);

    // Prepare final data
    const requestData = {
      ...formData,
      extras: Object.keys(extras).length > 0 ? extras : undefined,
      resources: resources.length > 0 ? resources : undefined
    };

    // Remove empty fields
    Object.keys(requestData).forEach(key => {
      if (requestData[key] === '' || requestData[key] === undefined) {
        delete requestData[key];
      }
    });

    return requestData;
  };

  /**
   * Handle form submission for creating dataset
   */
  const handleCreate = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const requestData = prepareFormData();
      await datasetAPI.create(requestData, selectedServer);
      
      setSuccess('Dataset created successfully!');
      resetForm();
      fetchDatasets();
      
    } catch (err) {
      console.error('Error creating dataset:', err);
      setError('Failed to create dataset: ' + 
        (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle form submission for updating dataset
   */
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const requestData = prepareFormData();
      await datasetAPI.partialUpdate(editingDataset.id, requestData, selectedServer);
      
      setSuccess('Dataset updated successfully!');
      resetForm();
      fetchDatasets();
      
    } catch (err) {
      console.error('Error updating dataset:', err);
      setError('Failed to update dataset: ' + 
        (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Start editing a dataset
   */
  const startEditing = (dataset) => {
    setEditingDataset(dataset);
    setFormData({
      name: dataset.name || '',
      title: dataset.title || '',
      owner_org: dataset.owner_org || '',
      notes: dataset.notes || '',
      extras: dataset.extras || {},
      resources: dataset.resources || []
    });
    
    // Set JSON fields
    setExtrasJson(JSON.stringify(dataset.extras || {}, null, 2));
    setResourcesJson(JSON.stringify(dataset.resources || [], null, 2));
    setShowCreateForm(true);
  };

  /**
   * Handle sending dataset to pre-ckan server
   */
  const handleSendToPreCkan = async (dataset) => {
    const displayName = dataset.title || dataset.name || 'Unnamed Dataset';
    
    if (!window.confirm(
      `Send dataset "${displayName}" to Pre-CKAN server? This will create a copy of the dataset on the pre-ckan server with required Pre-CKAN metadata.`
    )) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // Debug: Log the dataset being sent
      console.log('Attempting to send dataset to pre-ckan:', dataset);
      
      // Prepare the dataset data for pre-ckan with all required fields
      const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const existingExtras = dataset.extras || {};
      
      // Ensure all required Pre-CKAN fields are present
      const datasetForPreCkan = {
        name: dataset.name,
        title: dataset.title,
        owner_org: dataset.owner_org,
        // Required: notes
        notes: dataset.notes || 'Dataset transferred from local CKAN server',
        // Optional fields
        version: dataset.version,
        // Required and optional extras for Pre-CKAN
        extras: {
          // Keep existing extras
          ...existingExtras,
          // Required Pre-CKAN extras
          uploadType: existingExtras.uploadType || 'manual',
          dataType: existingExtras.dataType || 'dataset',
          purpose: existingExtras.purpose || 'Data sharing and analysis',
          publisherName: existingExtras.publisherName || 'Local CKAN Administrator',
          publisherEmail: existingExtras.publisherEmail || 'admin@example.com',
          creatorName: existingExtras.creatorName || 'Local CKAN System',
          creatorEmail: existingExtras.creatorEmail || 'system@example.com',
          pocName: existingExtras.pocName || 'Local CKAN Administrator',
          pocEmail: existingExtras.pocEmail || 'admin@example.com',
          otherLicense: existingExtras.otherLicense || 'Standard license terms apply',
          issueDate: existingExtras.issueDate || currentDate,
          lastUpdateDate: existingExtras.lastUpdateDate || currentDate
        },
        // Required: resources with required fields
        resources: (dataset.resources && dataset.resources.length > 0) 
          ? dataset.resources.map(resource => {
              console.log('Processing resource:', resource); // Debug log
              return {
                url: resource.url || 'http://example.com/placeholder',
                // Required resource fields for Pre-CKAN
                name: resource.name || 'Transferred Resource',
                description: resource.description || 'Resource transferred from local CKAN server',
                mimetype: resource.mimetype || resource.format 
                  ? `application/${(resource.format || 'octet-stream').toLowerCase()}`
                  : 'application/octet-stream',
                status: resource.status || 'active',
                // Optional resource fields
                format: resource.format || 'Unknown'
              };
            })
          : [
              // Default placeholder resource if none exist
              {
                url: 'http://example.com/placeholder',
                name: 'Placeholder Resource',
                description: 'This dataset was transferred without resources from local CKAN',
                mimetype: 'text/plain',
                status: 'active',
                format: 'TXT'
              }
            ]
      };
      
      // If no resources exist, add a placeholder
      if (!datasetForPreCkan.resources || datasetForPreCkan.resources.length === 0) {
        datasetForPreCkan.resources = [{
          url: 'http://example.com/placeholder',
          name: 'Placeholder Resource',
          description: 'This dataset was transferred without resources from local CKAN',
          mimetype: 'text/plain',
          status: 'active',
          format: 'TXT'
        }];
      }
      
      // Debug: Log each resource to verify required fields
      console.log('Final resources being sent to Pre-CKAN:');
      datasetForPreCkan.resources.forEach((resource, index) => {
        console.log(`Resource ${index + 1}:`, {
          name: resource.name,
          description: resource.description,
          mimetype: resource.mimetype,
          status: resource.status,
          url: resource.url,
          format: resource.format
        });
      });
      
      console.log('Sending dataset to pre-ckan with Pre-CKAN required fields:');
      console.log('Dataset basics:', {
        name: datasetForPreCkan.name,
        title: datasetForPreCkan.title,
        notes: datasetForPreCkan.notes,
        license_id: datasetForPreCkan.license_id
      });
      console.log('Dataset extras:', datasetForPreCkan.extras);
      console.log('Dataset resources count:', datasetForPreCkan.resources.length);
      
      // Send to pre-ckan server
      await datasetAPI.create(datasetForPreCkan, 'pre_ckan');
      
      setSuccess(`Dataset "${displayName}" sent to Pre-CKAN server successfully! Note: Some fields were auto-filled to meet Pre-CKAN requirements.`);
      
    } catch (err) {
      console.error('Error sending dataset to pre-ckan:', err);
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to send dataset to Pre-CKAN: ';
      
      if (err.response?.status === 409) {
        errorMessage += `Dataset "${displayName}" already exists on Pre-CKAN server.`;
      } else if (err.response?.status === 400) {
        const detail = err.response?.data?.detail || 'Unknown validation error';
        errorMessage += 'Invalid dataset data. ' + detail;
        
        // If it's still missing fields, show which ones
        if (detail.includes('Missing required fields')) {
          errorMessage += '\n\nTip: Some Pre-CKAN fields may need to be manually configured. Please check the Pre-CKAN documentation for specific requirements.';
        }
      } else if (err.response?.status === 401) {
        errorMessage += 'Authentication required. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage += 'You do not have permission to create datasets on Pre-CKAN server.';
      } else if (err.response?.status === 404) {
        errorMessage += 'Pre-CKAN server is not available or configured.';
      } else {
        errorMessage += (err.response?.data?.detail || err.message);
      }
      
      setError(errorMessage);
    }
  };

  /**
   * Handle dataset deletion
   */
  const handleDeleteDataset = async (dataset) => {
    const displayName = dataset.title || dataset.name || 'Unnamed Dataset';
    
    if (!window.confirm(
      `Are you sure you want to delete dataset "${displayName}"? This will also delete all associated resources. This action cannot be undone.`
    )) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      
      // Debug: Log the dataset being deleted
      console.log('Attempting to delete dataset with ID:', dataset.id);
      console.log('Using endpoint: DELETE /resource?resource_id=' + dataset.id + '&server=local');
      
      // Use the resource deletion endpoint since datasets are resources in CKAN
      await datasetAPI.delete(dataset.id, 'local'); // Always use local for deletion
      
      setSuccess(`Dataset "${displayName}" deleted successfully!`);
      
      // Refresh the datasets list
      fetchDatasets();
      
    } catch (err) {
      console.error('Error deleting dataset:', err);
      console.error('Full error object:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Failed to delete dataset: ';
      
      if (err.response?.status === 404) {
        errorMessage += `Dataset "${displayName}" not found. It may have been already deleted.`;
      } else if (err.response?.status === 405) {
        errorMessage += 'Dataset deletion method not allowed.';
      } else if (err.response?.status === 401) {
        errorMessage += 'Authentication required. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage += 'You do not have permission to delete this dataset.';
      } else {
        errorMessage += (err.response?.data?.detail || err.message);
      }
      
      setError(errorMessage);
    }
  };

  /**
   * Get dataset type badge
   */
  const getDatasetTypeBadge = (dataset) => {
    const extras = dataset.extras || {};
    
    // Check for specific resource types
    if (dataset.resources && dataset.resources.length > 0) {
      const resource = dataset.resources[0];
      if (extras.kafka_topic) return { type: 'Kafka', color: 'status-info' };
      if (resource.url && resource.url.startsWith('s3://')) return { type: 'S3', color: 'status-warning' };
      if (resource.url) return { type: 'URL', color: 'status-success' };
    }
    
    return { type: 'General', color: 'status-info' };
  };

  return (
    <div className="dataset-management-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">
          <Database size={32} style={{ marginRight: '0.5rem' }} />
          Dataset Management
        </h1>
        <p className="page-subtitle">
          Create and manage general datasets (excludes URL, S3, Kafka, and Service resources)
        </p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      {/* Controls */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Controls</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#64748b',
              padding: '0.375rem 0.75rem',
              backgroundColor: '#f1f5f9',
              borderRadius: '6px',
              border: '1px solid #e2e8f0'
            }}>
              📍 Local Server Only
            </span>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary"
            >
              <Plus size={16} />
              {showCreateForm ? 'Cancel' : 'Create Dataset'}
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Dataset Form */}
      {showCreateForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              {editingDataset ? (
                <>
                  <Edit3 size={20} />
                  Edit Dataset: {editingDataset.title}
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Create New Dataset
                </>
              )}
            </h3>
            <button
              onClick={resetForm}
              className="btn btn-secondary"
            >
              <X size={16} />
              Cancel
            </button>
          </div>

          <form onSubmit={editingDataset ? handleUpdate : handleCreate}>
            {/* Basic Information */}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Dataset Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="my_dataset_name"
                  required
                  disabled={editingDataset} // Cannot change name when editing
                />
                <small style={{ color: '#64748b' }}>
                  Unique identifier (lowercase, no spaces)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Dataset Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="My Dataset Title"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Organization *</label>
              <select
                name="owner_org"
                value={formData.owner_org}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Select an organization</option>
                {organizations.map(org => (
                  <option key={org} value={org}>{org}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                className="form-input form-textarea"
                placeholder="Description of the dataset..."
              />
            </div>

            {/* Advanced Configuration */}
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Extras (JSON)</label>
                <textarea
                  value={extrasJson}
                  onChange={(e) => setExtrasJson(e.target.value)}
                  className="form-input form-textarea"
                  placeholder='{"version": "1.0", "project": "research"}'
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem', minHeight: '120px' }}
                />
                <small style={{ color: '#64748b' }}>
                  Additional metadata as JSON
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Resources (JSON)</label>
                <textarea
                  value={resourcesJson}
                  onChange={(e) => setResourcesJson(e.target.value)}
                  className="form-input form-textarea"
                  placeholder='[{"url": "http://example.com/data.csv", "name": "main_data", "format": "CSV"}]'
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem', minHeight: '120px' }}
                />
                <small style={{ color: '#64748b' }}>
                  List of resources as JSON array
                </small>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner" />
                  {editingDataset ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {editingDataset ? 'Update Dataset' : 'Create Dataset'}
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Datasets List */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">
            Datasets ({datasets.length})
          </h3>
        </div>

        {loading && !showCreateForm ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: '1rem' }}>Loading datasets...</p>
          </div>
        ) : datasets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            <Database size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No general datasets found</p>
            <p>Create your first general dataset using the form above, or check other pages for specific resource types (URL, S3, Kafka, Services)</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Dataset</th>
                  <th>Type</th>
                  <th>Organization</th>
                  <th>Resources</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset, index) => {
                  const typeBadge = getDatasetTypeBadge(dataset);
                  
                  return (
                    <tr key={`${dataset.id}-${index}`}>
                      <td>
                        <div>
                          <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                            {dataset.title || dataset.name}
                          </div>
                          {dataset.title && dataset.name && dataset.title !== dataset.name && (
                            <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                              {dataset.name}
                            </div>
                          )}
                          {dataset.notes && (
                            <div style={{ 
                              fontSize: '0.875rem', 
                              color: '#64748b',
                              marginTop: '0.25rem',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {dataset.notes}
                            </div>
                          )}
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#94a3b8',
                            marginTop: '0.25rem',
                            fontFamily: 'monospace'
                          }}>
                            ID: {dataset.id}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="status-indicator status-info">
                          General
                        </span>
                      </td>
                      <td>
                        <span className="status-indicator status-success">
                          {dataset.owner_org || 'No organization'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FileText size={14} />
                          <span>{dataset.resources?.length || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => startEditing(dataset)}
                            className="btn btn-secondary"
                            style={{ padding: '0.375rem 0.75rem' }}
                            title="Edit dataset"
                          >
                            <Edit3 size={14} />
                            <span style={{ fontSize: '0.75rem' }}>Edit</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteDataset(dataset)}
                            className="btn btn-danger"
                            style={{ padding: '0.375rem 0.75rem' }}
                            title="Delete dataset"
                          >
                            <Trash2 size={14} />
                            <span style={{ fontSize: '0.75rem' }}>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetManagement;