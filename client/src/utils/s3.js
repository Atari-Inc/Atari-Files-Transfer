import { S3_CONFIG, USER_FOLDERS, FOLDER_PERMISSIONS, USER_ROLES } from '../constants';
import { apiHelpers } from './api';
import apiClient from './api';

// S3 API endpoints - these would connect to your backend S3 service
const S3_ENDPOINTS = {
  LIST_OBJECTS: '/api/files',
  GET_OBJECT: '/api/files',
  PUT_OBJECT: '/api/files',
  DELETE_OBJECT: '/api/files',
  CREATE_FOLDER: '/api/folders',
  MOVE_OBJECT: '/api/files',
  COPY_OBJECT: '/api/files',
  GET_PRESIGNED_URL: '/api/files'
};

/**
 * Get accessible folders for a user based on their role
 * @param {Object} user - User object with role and username
 * @returns {Array} List of accessible folder paths
 */
export const getUserAccessibleFolders = (user) => {
  if (!user) return [];

  const baseFolders = [];

  if (user.role === USER_ROLES.ADMIN) {
    // Admin has access to all folders
    baseFolders.push(
      { path: USER_FOLDERS.ADMIN.HOME, name: 'Admin Home', icon: '👑', permission: FOLDER_PERMISSIONS.ADMIN_ONLY },
      { path: USER_FOLDERS.ADMIN.SHARED, name: 'Shared Files', icon: '🤝', permission: FOLDER_PERMISSIONS.PUBLIC },
      { path: USER_FOLDERS.ADMIN.USERS, name: 'All Users', icon: '👥', permission: FOLDER_PERMISSIONS.ADMIN_ONLY },
      { path: USER_FOLDERS.ADMIN.SYSTEM, name: 'System Files', icon: '⚙️', permission: FOLDER_PERMISSIONS.ADMIN_ONLY },
      { path: USER_FOLDERS.ADMIN.BACKUPS, name: 'Backups', icon: '💾', permission: FOLDER_PERMISSIONS.ADMIN_ONLY },
      { path: USER_FOLDERS.ADMIN.LOGS, name: 'System Logs', icon: '📋', permission: FOLDER_PERMISSIONS.ADMIN_ONLY }
    );
  } else {
    // Regular user access
    const userHome = USER_FOLDERS.USER.HOME.replace('{username}', user.username);
    const userPersonal = USER_FOLDERS.USER.PERSONAL.replace('{username}', user.username);
    const userProjects = USER_FOLDERS.USER.PROJECTS.replace('{username}', user.username);

    baseFolders.push(
      { path: userHome, name: 'My Files', icon: '🏠', permission: FOLDER_PERMISSIONS.USER_SPECIFIC },
      { path: userPersonal, name: 'Personal', icon: '👤', permission: FOLDER_PERMISSIONS.PRIVATE },
      { path: userProjects, name: 'Projects', icon: '📁', permission: FOLDER_PERMISSIONS.PRIVATE },
      { path: USER_FOLDERS.USER.SHARED, name: 'Shared Files', icon: '🤝', permission: FOLDER_PERMISSIONS.PUBLIC }
    );
  }

  return baseFolders;
};

/**
 * Check if user has permission to access a specific folder
 * @param {Object} user - User object
 * @param {string} folderPath - Folder path to check
 * @returns {boolean} Whether user has access
 */
export const hasAccessToFolder = (user, folderPath) => {
  if (!user) return false;

  // Admin has access to everything including root path
  if (user.role === USER_ROLES.ADMIN) return true;

  // Handle empty path (root) - only admin can access
  if (!folderPath) return user.role === USER_ROLES.ADMIN;

  // Check shared folder access
  if (folderPath.startsWith('shared')) return true;

  // Check user-specific folder access
  const userPath = `users/${user.username}`;
  if (folderPath.startsWith(userPath)) return true;

  return false;
};

/**
 * List S3 objects in a folder with permission filtering
 * @param {string} folderPath - S3 folder path
 * @param {Object} user - Current user
 * @returns {Promise<Array>} List of files and folders
 */
export const listS3Objects = async (folderPath = '', user) => {
  try {
    // Check permissions first
    console.log(`Checking access for user ${user?.username} (${user?.role}) to path "${folderPath}"`);
    if (folderPath && !hasAccessToFolder(user, folderPath)) {
      throw new Error('Access denied to this folder');
    }
    console.log('Access granted - proceeding with API call');

    let response;
    
    // If no folder path, get all folders
    if (!folderPath) {
      response = await apiClient.get('/api/folders');
    } else {
      // Get files in specific folder
      response = await apiClient.get(`/api/files/${encodeURIComponent(folderPath)}`);
    }

    const data = response.data;
    console.log('API response data:', data);
    
    if (!folderPath) {
      // Root level - return folders
      return {
        folders: data.folders?.map(folder => ({
          name: folder.name,
          path: folder.name,
          type: 'folder',
          icon: '📁',
          size: folder.totalSize,
          modified: folder.lastModified,
          canAccess: hasAccessToFolder(user, folder.name)
        })) || [],
        files: []
      };
    } else {
      // Inside folder - return files and subfolders
      const folders = data.subfolders?.map(subfolder => ({
        name: subfolder.name,
        path: `${folderPath}/${subfolder.name}`,
        type: 'folder',
        icon: '📁',
        size: subfolder.size,
        modified: subfolder.lastModified,
        canAccess: hasAccessToFolder(user, `${folderPath}/${subfolder.name}`)
      })) || [];

      const files = data.files?.map(file => ({
        name: file.name,
        path: `${folderPath}/${file.name}`,
        type: 'file',
        icon: getFileIcon(file.name),
        size: file.size,
        modified: file.lastModified,
        canAccess: hasAccessToFolder(user, folderPath)
      })) || [];

      return { folders, files };
    }
  } catch (error) {
    console.error('Error listing S3 objects:', error);
    throw error;
  }
};

/**
 * Upload file to S3
 * @param {File} file - File to upload
 * @param {string} folderPath - Destination folder
 * @param {Object} user - Current user
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Upload result
 */
export const uploadFileToS3 = async (file, folderPath, user, onProgress) => {
  try {
    if (!hasAccessToFolder(user, folderPath)) {
      throw new Error('Access denied to upload to this folder');
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post(`/api/files/${encodeURIComponent(folderPath)}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      } : undefined,
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Delete file or folder from S3
 * @param {string} objectPath - Path to object to delete
 * @param {Object} user - Current user
 * @returns {Promise<Object>} Delete result
 */
export const deleteS3Object = async (objectPath, user) => {
  try {
    const pathParts = objectPath.split('/');
    const folderPath = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    if (!hasAccessToFolder(user, folderPath)) {
      throw new Error('Access denied to delete this object');
    }

    let response;
    if (fileName) {
      // Delete file
      response = await apiClient.delete(`/api/files/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}`);
    } else {
      // Delete folder
      response = await apiClient.delete(`/api/folders/${encodeURIComponent(folderPath)}`);
    }

    return response.data;
  } catch (error) {
    console.error('Error deleting object:', error);
    throw error;
  }
};

/**
 * Create new folder in S3
 * @param {string} folderPath - Parent folder path (empty for root)
 * @param {string} folderName - New folder name
 * @param {Object} user - Current user
 * @returns {Promise<Object>} Create folder result
 */
export const createS3Folder = async (folderPath, folderName, user) => {
  try {
    if (folderPath && !hasAccessToFolder(user, folderPath)) {
      throw new Error('Access denied to create folder here');
    }

    const response = await apiClient.post('/api/folders', { 
      name: folderName
    });

    return response.data;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
};

/**
 * Get download URL for file
 * @param {string} filePath - S3 file path (folder/filename)
 * @param {Object} user - Current user
 * @returns {Promise<string>} Download URL
 */
export const getDownloadUrl = async (filePath, user) => {
  try {
    const pathParts = filePath.split('/');
    const folderPath = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    if (!hasAccessToFolder(user, folderPath)) {
      throw new Error('Access denied to download this file');
    }

    const response = await apiClient.get(`/api/files/${encodeURIComponent(folderPath)}/${encodeURIComponent(fileName)}/download`);

    // For downloads, we might need to handle this differently depending on backend response
    // If backend returns a URL, use response.data.url, otherwise use the request URL
    return response.data.url || response.request.responseURL;
  } catch (error) {
    console.error('Error getting download URL:', error);
    throw error;
  }
};

/**
 * Move object to different location
 * @param {string} sourcePath - Current object path
 * @param {string} destinationPath - New object path
 * @param {Object} user - Current user
 * @returns {Promise<Object>} Move result
 */
export const moveS3Object = async (sourcePath, destinationPath, user) => {
  try {
    const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    const destFolder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
    
    if (!hasAccessToFolder(user, sourceFolder) || !hasAccessToFolder(user, destFolder)) {
      throw new Error('Access denied to move this object');
    }

    const response = await apiClient.post(S3_ENDPOINTS.MOVE_OBJECT, { 
      sourcePath, 
      destinationPath, 
      userId: user.id 
    });

    return response.data;
  } catch (error) {
    console.error('Error moving object:', error);
    throw error;
  }
};

/**
 * Copy object to different location
 * @param {string} sourcePath - Current object path
 * @param {string} destinationPath - New object path
 * @param {Object} user - Current user
 * @returns {Promise<Object>} Copy result
 */
export const copyS3Object = async (sourcePath, destinationPath, user) => {
  try {
    const sourceFolder = sourcePath.substring(0, sourcePath.lastIndexOf('/'));
    const destFolder = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
    
    if (!hasAccessToFolder(user, sourceFolder) || !hasAccessToFolder(user, destFolder)) {
      throw new Error('Access denied to copy this object');
    }

    const response = await apiClient.post(S3_ENDPOINTS.COPY_OBJECT, { 
      sourcePath, 
      destinationPath, 
      userId: user.id 
    });

    return response.data;
  } catch (error) {
    console.error('Error copying object:', error);
    throw error;
  }
};

// Helper function to get file icon (import from utils if needed)
const getFileIcon = (fileName) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap = {
    pdf: '📄', doc: '📝', docx: '📝', txt: '📝',
    xls: '📊', xlsx: '📊', csv: '📊',
    ppt: '📽️', pptx: '📽️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
    mp4: '🎥', avi: '🎥', mov: '🎥',
    mp3: '🎵', wav: '🎵',
    zip: '🗜️', rar: '🗜️',
    js: '💻', jsx: '💻', ts: '💻', html: '🌐', css: '🎨'
  };
  return iconMap[extension] || '📄';
};