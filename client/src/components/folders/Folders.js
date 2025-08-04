import React, { useState, useEffect } from 'react';
import { formatTimeAgo, formatFileSize } from '../../utils';
import './Folders.css';

const Folders = ({ user, onNotification }) => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPermission, setFilterPermission] = useState('all');
  
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    permission: 'private',
    allowedUsers: [],
    maxSize: '',
    allowedTypes: []
  });

  // Generate mock folder data
  useEffect(() => {
    const generateMockFolders = () => {
      const permissions = ['public', 'private', 'admin_only', 'user_specific'];
      const mockUsers = ['admin', 'john_doe', 'jane_smith', 'mike_wilson', 'sarah_jones'];
      const fileTypes = ['images', 'documents', 'videos', 'archives', 'all'];
      
      const mockData = [
        {
          id: 1,
          name: 'Public Shared',
          description: 'Publicly accessible shared folder for all users',
          permission: 'public',
          path: '/shared/public',
          size: 2547893248, // ~2.4GB
          fileCount: 156,
          allowedUsers: [],
          maxSize: 5368709120, // 5GB
          allowedTypes: ['all'],
          createdAt: new Date('2024-01-15T10:30:00Z'),
          updatedAt: new Date('2024-01-20T14:22:00Z'),
          createdBy: 'admin',
          isActive: true
        },
        {
          id: 2,
          name: 'Documents',
          description: 'Corporate documents and files',
          permission: 'user_specific',
          path: '/shared/documents',
          size: 892376548,
          fileCount: 89,
          allowedUsers: ['admin', 'jane_smith', 'mike_wilson'],
          maxSize: 2147483648, // 2GB
          allowedTypes: ['documents'],
          createdAt: new Date('2024-01-10T09:15:00Z'),
          updatedAt: new Date('2024-01-18T16:45:00Z'),
          createdBy: 'admin',
          isActive: true
        },
        {
          id: 3,
          name: 'Project Assets',
          description: 'Images, videos and design assets for projects',
          permission: 'private',
          path: '/users/john_doe/projects',
          size: 4293742592,
          fileCount: 234,
          allowedUsers: ['john_doe'],
          maxSize: 10737418240, // 10GB
          allowedTypes: ['images', 'videos'],
          createdAt: new Date('2024-01-08T11:20:00Z'),
          updatedAt: new Date('2024-01-19T13:10:00Z'),
          createdBy: 'john_doe',
          isActive: true
        },
        {
          id: 4,
          name: 'System Backups',
          description: 'System backup files and archives',
          permission: 'admin_only',
          path: '/system/backups',
          size: 15728640000,
          fileCount: 45,
          allowedUsers: ['admin'],
          maxSize: 53687091200, // 50GB
          allowedTypes: ['archives'],
          createdAt: new Date('2024-01-05T08:00:00Z'),
          updatedAt: new Date('2024-01-21T02:30:00Z'),
          createdBy: 'admin',
          isActive: true
        },
        {
          id: 5,
          name: 'Team Collaboration',
          description: 'Shared workspace for team members',
          permission: 'user_specific',
          path: '/shared/team',
          size: 1456789123,
          fileCount: 167,
          allowedUsers: ['jane_smith', 'mike_wilson', 'sarah_jones'],
          maxSize: 5368709120, // 5GB
          allowedTypes: ['all'],
          createdAt: new Date('2024-01-12T14:45:00Z'),
          updatedAt: new Date('2024-01-20T11:30:00Z'),
          createdBy: 'jane_smith',
          isActive: true
        },
        {
          id: 6,
          name: 'Archives',
          description: 'Long-term storage for old files',
          permission: 'admin_only',
          path: '/system/archives',
          size: 8594573312,
          fileCount: 78,
          allowedUsers: ['admin'],
          maxSize: 21474836480, // 20GB
          allowedTypes: ['archives', 'documents'],
          createdAt: new Date('2024-01-03T16:20:00Z'),
          updatedAt: new Date('2024-01-15T09:15:00Z'),
          createdBy: 'admin',
          isActive: false
        },
        {
          id: 7,
          name: 'Temporary',
          description: 'Temporary file storage',
          permission: 'public',
          path: '/temp',
          size: 234567890,
          fileCount: 23,
          allowedUsers: [],
          maxSize: 1073741824, // 1GB
          allowedTypes: ['all'],
          createdAt: new Date('2024-01-20T12:00:00Z'),
          updatedAt: new Date('2024-01-21T10:30:00Z'),
          createdBy: 'admin',
          isActive: true
        }
      ];

      return mockData;
    };

    setTimeout(() => {
      setFolders(generateMockFolders());
      setLoading(false);
    }, 800);
  }, []);

  // Filter folders based on search and permission
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         folder.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPermission = filterPermission === 'all' || folder.permission === filterPermission;
    return matchesSearch && matchesPermission;
  });

  const getPermissionIcon = (permission) => {
    switch (permission) {
      case 'public': return '🌐';
      case 'private': return '🔒';
      case 'admin_only': return '👑';
      case 'user_specific': return '👥';
      default: return '📁';
    }
  };

  const getPermissionColor = (permission) => {
    switch (permission) {
      case 'public': return 'var(--success-color)';
      case 'private': return 'var(--warning-color)';
      case 'admin_only': return 'var(--error-color)';
      case 'user_specific': return 'var(--primary-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getTypeIcons = (types) => {
    const iconMap = {
      'all': '📄',
      'images': '🖼️',
      'videos': '🎥',
      'documents': '📝',
      'archives': '🗜️'
    };
    return types.map(type => iconMap[type] || '📄').join(' ');
  };

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const newFolder = {
      id: Date.now(),
      ...createForm,
      path: `/custom/${createForm.name.toLowerCase().replace(/\s+/g, '_')}`,
      size: 0,
      fileCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user?.username || 'admin',
      isActive: true,
      maxSize: parseInt(createForm.maxSize) * 1073741824 // Convert GB to bytes
    };
    
    setFolders(prev => [...prev, newFolder]);
    setShowCreateModal(false);
    setCreateForm({
      name: '',
      description: '',
      permission: 'private',
      allowedUsers: [],
      maxSize: '',
      allowedTypes: []
    });
    onNotification(`Folder "${newFolder.name}" created successfully`, 'success');
  };

  const handleDeleteFolder = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (window.confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      setFolders(prev => prev.filter(f => f.id !== folderId));
      onNotification(`Folder "${folder.name}" deleted successfully`, 'success');
    }
  };

  const toggleFolderStatus = (folderId) => {
    setFolders(prev => prev.map(folder => 
      folder.id === folderId 
        ? { ...folder, isActive: !folder.isActive, updatedAt: new Date() }
        : folder
    ));
    const folder = folders.find(f => f.id === folderId);
    onNotification(`Folder "${folder.name}" ${folder.isActive ? 'disabled' : 'enabled'}`, 'info');
  };

  if (loading) {
    return (
      <div className="folders-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading folders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="folders">
      <div className="folders-header">
        <div className="header-info">
          <h2>Folder Management</h2>
          <p>Configure shared folders and access permissions</p>
        </div>
        
        <div className="header-actions">
          <button 
            className="create-button"
            onClick={() => setShowCreateModal(true)}
          >
            📁 Create Folder
          </button>
        </div>
      </div>

      <div className="folders-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search folders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="filters">
          <select 
            value={filterPermission} 
            onChange={(e) => setFilterPermission(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Permissions</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="user_specific">User Specific</option>
            <option value="admin_only">Admin Only</option>
          </select>
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      <div className={`folders-content ${viewMode}`}>
        {filteredFolders.map(folder => (
          <div key={folder.id} className={`folder-card ${!folder.isActive ? 'disabled' : ''}`}>
            <div className="folder-header">
              <div className="folder-icon">
                {getPermissionIcon(folder.permission)}
              </div>
              <div className="folder-info">
                <h3 className="folder-name">{folder.name}</h3>
                <p className="folder-description">{folder.description}</p>
              </div>
              <div className="folder-status">
                <span 
                  className="permission-badge"
                  style={{ backgroundColor: getPermissionColor(folder.permission) }}
                >
                  {folder.permission.replace('_', ' ')}
                </span>
              </div>
            </div>
            
            <div className="folder-details">
              <div className="detail-row">
                <span className="detail-label">Path:</span>
                <code className="detail-value">{folder.path}</code>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Size:</span>
                <span className="detail-value">
                  {formatFileSize(folder.size)} ({folder.fileCount} files)
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Max Size:</span>
                <span className="detail-value">{formatFileSize(folder.maxSize)}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Allowed Types:</span>
                <span className="detail-value">{getTypeIcons(folder.allowedTypes)}</span>
              </div>
              
              {folder.allowedUsers.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Users:</span>
                  <span className="detail-value">
                    {folder.allowedUsers.join(', ')}
                  </span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">Created:</span>
                <span className="detail-value">
                  {formatTimeAgo(folder.createdAt)} by {folder.createdBy}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Updated:</span>
                <span className="detail-value">{formatTimeAgo(folder.updatedAt)}</span>
              </div>
            </div>
            
            <div className="folder-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${Math.min((folder.size / folder.maxSize) * 100, 100)}%`,
                    backgroundColor: folder.size > folder.maxSize * 0.9 ? 'var(--error-color)' : 'var(--primary-color)'
                  }}
                ></div>
              </div>
              <span className="progress-text">
                {Math.round((folder.size / folder.maxSize) * 100)}% used
              </span>
            </div>
            
            <div className="folder-actions">
              <button 
                className="action-btn edit"
                onClick={() => {
                  setSelectedFolder(folder);
                  setShowEditModal(true);
                }}
              >
                ✏️ Edit
              </button>
              
              <button 
                className={`action-btn ${folder.isActive ? 'disable' : 'enable'}`}
                onClick={() => toggleFolderStatus(folder.id)}
              >
                {folder.isActive ? '⏸️ Disable' : '▶️ Enable'}
              </button>
              
              <button 
                className="action-btn delete"
                onClick={() => handleDeleteFolder(folder.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
        
        {filteredFolders.length === 0 && (
          <div className="empty-folders">
            <div className="empty-icon">📂</div>
            <h3>No Folders Found</h3>
            <p>No folders match your search criteria</p>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Folder</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateFolder} className="modal-form">
              <div className="form-group">
                <label>Folder Name:</label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({...prev, name: e.target.value}))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description:</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({...prev, description: e.target.value}))}
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Permission:</label>
                <select
                  value={createForm.permission}
                  onChange={(e) => setCreateForm(prev => ({...prev, permission: e.target.value}))}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                  <option value="user_specific">User Specific</option>
                  <option value="admin_only">Admin Only</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Max Size (GB):</label>
                <input
                  type="number"
                  value={createForm.maxSize}
                  onChange={(e) => setCreateForm(prev => ({...prev, maxSize: e.target.value}))}
                  min="1"
                  max="100"
                  required
                />
              </div>
              
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary">
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Folders;