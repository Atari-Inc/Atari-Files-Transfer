import React, { useState, useEffect, useCallback } from 'react';
import { 
  listS3Objects, 
  uploadFileToS3, 
  deleteS3Object, 
  createS3Folder, 
  getDownloadUrl,
  moveS3Object,
  getUserAccessibleFolders,
  hasAccessToFolder 
} from '../../utils/s3';
import { formatFileSize, formatTimeAgo, getFileIcon } from '../../utils';
import { USER_ROLES, VIEW_MODES, SORT_OPTIONS, SORT_ORDERS } from '../../constants';
import './FileManager.css';

const FileManager = ({ user, onNotification }) => {
  // State management
  const [viewMode, setViewMode] = useState(VIEW_MODES.GRID);
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState(SORT_OPTIONS.NAME);
  const [sortOrder, setSortOrder] = useState(SORT_ORDERS.ASC);
  const [selectedItems, setSelectedItems] = useState([]);
  const [accessibleFolders, setAccessibleFolders] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Initialize accessible folders based on user role
  useEffect(() => {
    // For now, don't use hardcoded folders - we'll load real S3 folders
    setAccessibleFolders([]);
    
    // Set initial path based on user role
    if (user?.role === USER_ROLES.ADMIN) {
      setCurrentPath('');
    } else {
      setCurrentPath(`users/${user?.username || 'default'}`);
    }
  }, [user]);

  // Load folder contents when path changes
  useEffect(() => {
    loadFolderContents();
  }, [currentPath]);

  // Load folder contents from S3
  const loadFolderContents = useCallback(async () => {
    if (!user) {
      console.log('No user available, skipping folder load');
      return;
    }
    
    console.log(`Loading folder contents for path: "${currentPath}", user:`, user);
    setLoading(true);
    try {
      const result = await listS3Objects(currentPath, user);
      console.log('S3 API result:', result);
      setFolders(result.folders || []);
      setFiles(result.files || []);
      setSelectedItems([]);
      console.log(`Loaded ${result.folders?.length || 0} folders and ${result.files?.length || 0} files`);
    } catch (error) {
      console.error('Error loading folder contents:', error);
      onNotification(error.message || 'Failed to load folder contents', 'error');
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath, user, onNotification]);

  // Navigate to folder
  const navigateToFolder = useCallback((folderPath, folderName) => {
    if (!hasAccessToFolder(user, folderPath)) {
      onNotification('Access denied to this folder', 'error');
      return;
    }

    setPathHistory(prev => [...prev, { path: currentPath, name: getCurrentFolderName() }]);
    setCurrentPath(folderPath);
  }, [user, currentPath, onNotification]);

  // Navigate back
  const navigateBack = useCallback(() => {
    if (pathHistory.length > 0) {
      const previousPath = pathHistory[pathHistory.length - 1];
      setCurrentPath(previousPath.path);
      setPathHistory(prev => prev.slice(0, -1));
    }
  }, [pathHistory]);

  // Get current folder name for breadcrumb
  const getCurrentFolderName = () => {
    if (!currentPath) return 'Home';
    const parts = currentPath.split('/');
    return parts[parts.length - 1] || 'Root';
  };

  // Get breadcrumb trail
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ name: 'Home', path: '' }];
    
    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      let buildPath = '';
      
      parts.forEach(part => {
        buildPath += (buildPath ? '/' : '') + part;
        breadcrumbs.push({ name: part, path: buildPath });
      });
    }
    
    return breadcrumbs;
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files);
    if (selectedFiles.length === 0) return;

    if (!hasAccessToFolder(user, currentPath)) {
      onNotification('Access denied to upload to this folder', 'error');
      return;
    }

    for (const file of selectedFiles) {
      try {
        setUploadProgress({ fileName: file.name, progress: 0 });
        
        await uploadFileToS3(file, currentPath, user, (progress) => {
          setUploadProgress({ fileName: file.name, progress });
        });
        
        onNotification(`File "${file.name}" uploaded successfully`, 'success');
      } catch (error) {
        console.error('Upload error:', error);
        onNotification(`Failed to upload "${file.name}": ${error.message}`, 'error');
      }
    }
    
    setUploadProgress(null);
    loadFolderContents();
    event.target.value = ''; // Reset file input
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      onNotification('Please enter a folder name', 'error');
      return;
    }

    if (!hasAccessToFolder(user, currentPath)) {
      onNotification('Access denied to create folder here', 'error');
      return;
    }

    try {
      await createS3Folder(currentPath, newFolderName.trim(), user);
      onNotification(`Folder "${newFolderName}" created successfully`, 'success');
      setNewFolderName('');
      setShowCreateFolder(false);
      loadFolderContents();
    } catch (error) {
      console.error('Create folder error:', error);
      onNotification(`Failed to create folder: ${error.message}`, 'error');
    }
  };

  // Handle file download
  const handleDownload = async (filePath, fileName) => {
    try {
      const downloadUrl = await getDownloadUrl(filePath, user);
      
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      onNotification(`Downloading "${fileName}"`, 'success');
    } catch (error) {
      console.error('Download error:', error);
      onNotification(`Failed to download "${fileName}": ${error.message}`, 'error');
    }
  };

  // Handle file/folder deletion
  const handleDelete = async (objectPath, objectName) => {
    if (!window.confirm(`Are you sure you want to delete "${objectName}"?`)) return;

    try {
      await deleteS3Object(objectPath, user);
      onNotification(`"${objectName}" deleted successfully`, 'success');
      loadFolderContents();
    } catch (error) {
      console.error('Delete error:', error);
      onNotification(`Failed to delete "${objectName}": ${error.message}`, 'error');
    }
  };

  // Filter and sort items
  const getFilteredAndSortedItems = () => {
    let allItems = [...folders, ...files];
    
    // Filter by search term
    if (searchTerm) {
      allItems = allItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sort items
    allItems.sort((a, b) => {
      // Folders first
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      
      let compareValue = 0;
      switch (sortBy) {
        case SORT_OPTIONS.NAME:
          compareValue = a.name.localeCompare(b.name);
          break;
        case SORT_OPTIONS.SIZE:
          compareValue = (a.size || 0) - (b.size || 0);
          break;
        case SORT_OPTIONS.DATE:
          compareValue = new Date(a.modified || 0) - new Date(b.modified || 0);
          break;
        default:
          compareValue = 0;
      }
      
      return sortOrder === SORT_ORDERS.DESC ? -compareValue : compareValue;
    });
    
    return allItems;
  };

  const filteredAndSortedItems = getFilteredAndSortedItems();

  return (
    <div className="file-manager">
      {/* Header with Breadcrumbs and Actions */}
      <div className="file-manager-header">
        <div className="breadcrumb">
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={index}>
              <button
                className={`breadcrumb-item ${index === getBreadcrumbs().length - 1 ? 'active' : ''}`}
                onClick={() => setCurrentPath(crumb.path)}
                disabled={index === getBreadcrumbs().length - 1}
              >
                <span className="breadcrumb-icon">📁</span>
                <span>{crumb.name}</span>
              </button>
              {index < getBreadcrumbs().length - 1 && (
                <span className="breadcrumb-separator">/</span>
              )}
            </React.Fragment>
          ))}
          
          {pathHistory.length > 0 && (
            <button 
              className="btn btn-sm btn-secondary back-btn"
              onClick={navigateBack}
              title="Go Back"
            >
              ← Back
            </button>
          )}
        </div>
        
        <div className="file-manager-actions">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept="*/*"
          />
          <label htmlFor="file-upload" className="btn btn-primary">
            <span>📤</span>
            Upload Files
          </label>
          
          <button 
            className="btn btn-secondary"
            onClick={() => setShowCreateFolder(true)}
          >
            <span>📁</span>
            New Folder
          </button>
          
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === VIEW_MODES.GRID ? 'active' : ''}`}
              onClick={() => setViewMode(VIEW_MODES.GRID)}
              title="Grid View"
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === VIEW_MODES.LIST ? 'active' : ''}`}
              onClick={() => setViewMode(VIEW_MODES.LIST)}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Folders for Users */}
      {currentPath === '' && accessibleFolders.length > 0 && (
        <div className="quick-access">
          <h3>Quick Access</h3>
          <div className="quick-access-folders">
            {accessibleFolders.map((folder, index) => (
              <button
                key={index}
                className="quick-access-folder"
                onClick={() => navigateToFolder(folder.path, folder.name)}
              >
                <span className="folder-icon">{folder.icon}</span>
                <span className="folder-name">{folder.name}</span>
                <span className="folder-permission">{folder.permission}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="file-manager-content">
        {/* Toolbar */}
        <div className="files-toolbar">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search files and folders..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="sort-controls">
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value={SORT_OPTIONS.NAME}>Sort by Name</option>
              <option value={SORT_OPTIONS.SIZE}>Sort by Size</option>
              <option value={SORT_OPTIONS.DATE}>Sort by Date</option>
            </select>
            
            <button
              className="sort-order-btn"
              onClick={() => setSortOrder(sortOrder === SORT_ORDERS.ASC ? SORT_ORDERS.DESC : SORT_ORDERS.ASC)}
              title={`Sort ${sortOrder === SORT_ORDERS.ASC ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === SORT_ORDERS.ASC ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="upload-progress">
            <div className="upload-info">
              <span>Uploading: {uploadProgress.fileName}</span>
              <span>{uploadProgress.progress}%</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading folder contents...</p>
          </div>
        )}

        {/* Files Container */}
        {!loading && (
          <div className={`files-container ${viewMode}`}>
            {filteredAndSortedItems.map((item, index) => (
              <div 
                key={index} 
                className={`file-item ${item.type} ${!item.canAccess ? 'restricted' : ''}`}
                onDoubleClick={() => {
                  if (item.type === 'folder') {
                    navigateToFolder(item.path, item.name);
                  }
                }}
              >
                <div className="file-icon">
                  {item.icon}
                  {!item.canAccess && <span className="restriction-badge">🔒</span>}
                </div>
                
                <div className="file-info">
                  <div className="file-name" title={item.name}>
                    {item.name}
                  </div>
                  {viewMode === VIEW_MODES.LIST && (
                    <>
                      <div className="file-size">
                        {item.type === 'file' ? formatFileSize(item.size) : '-'}
                      </div>
                      <div className="file-date">
                        {item.modified ? formatTimeAgo(item.modified) : '-'}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="file-actions">
                  {item.type === 'folder' ? (
                    <button 
                      className="file-action-btn"
                      onClick={() => navigateToFolder(item.path, item.name)}
                      title="Open Folder"
                      disabled={!item.canAccess}
                    >
                      📂
                    </button>
                  ) : (
                    <>
                      <button 
                        className="file-action-btn"
                        onClick={() => handleDownload(item.path, item.name)}
                        title="Download"
                        disabled={!item.canAccess}
                      >
                        ⬇️
                      </button>
                      <button 
                        className="file-action-btn"
                        title="Share"
                        disabled={!item.canAccess}
                      >
                        🔗
                      </button>
                    </>
                  )}
                  
                  {hasAccessToFolder(user, currentPath) && (
                    <button 
                      className="file-action-btn delete"
                      onClick={() => handleDelete(item.path, item.name)}
                      title="Delete"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredAndSortedItems.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>
              {searchTerm ? 'No items found' : 'This folder is empty'}
            </h3>
            <p>
              {searchTerm 
                ? `No files or folders match "${searchTerm}"`
                : hasAccessToFolder(user, currentPath) 
                  ? 'Upload some files or create folders to get started'
                  : 'You don\'t have access to this folder'
              }
            </p>
            {hasAccessToFolder(user, currentPath) && !searchTerm && (
              <div className="empty-actions">
                <label htmlFor="file-upload" className="btn btn-primary">
                  <span>📤</span>
                  Upload Files
                </label>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFolder(true)}
                >
                  <span>📁</span>
                  Create Folder
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create New Folder</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateFolder(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folder-name" className="form-label">
                  Folder Name
                </label>
                <input
                  id="folder-name"
                  type="text"
                  className="form-input"
                  placeholder="Enter folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateFolder();
                    }
                  }}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateFolder(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;