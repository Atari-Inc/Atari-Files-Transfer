import axios from 'axios';
import { API_BASE, STORAGE_KEYS } from '../constants';
import { getStorageItem, removeStorageItem } from './index';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getStorageItem(STORAGE_KEYS.TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      removeStorageItem(STORAGE_KEYS.TOKEN);
      removeStorageItem(STORAGE_KEYS.USER);
      window.location.href = '/';
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => apiClient.post('/api/auth/login', credentials),
  logout: () => apiClient.post('/api/auth/logout'),
  me: () => apiClient.get('/api/auth/me'),
  refreshToken: () => apiClient.post('/api/auth/refresh'),
  changePassword: (passwordData) => apiClient.post('/api/auth/change-password', passwordData),
};

// Users API
export const usersAPI = {
  getAll: () => apiClient.get('/api/users'),
  getById: (username) => apiClient.get(`/api/user-credentials/${username}`),
  create: (userData) => apiClient.post('/api/create-user', userData),
  update: (username, userData) => apiClient.put(`/api/users/${username}`, userData),
  delete: (username) => apiClient.delete(`/api/delete-user/${username}`),
  changePassword: (username, passwordData) => apiClient.patch(`/api/users/${username}/password`, passwordData),
};

// Folders API
export const foldersAPI = {
  getAll: () => apiClient.get('/api/folders'),
  getById: (name) => apiClient.get(`/api/folder/${name}`),
  create: (folderData) => apiClient.post('/api/folders', folderData),
  delete: (name) => apiClient.delete(`/api/folders/${name}`),
  updatePermissions: (name, permissions) => apiClient.patch(`/api/folders/${name}/permissions`, permissions),
};

// Files API
export const filesAPI = {
  getByFolder: (folderName) => apiClient.get(`/api/files/${folderName}`),
  upload: (folderName, formData, onUploadProgress) => 
    apiClient.post(`/api/files/${folderName}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    }),
  download: (folderName, fileName) => apiClient.get(`/api/files/${folderName}/${fileName}/download`),
  delete: (folderName, fileName) => apiClient.delete(`/api/files/${folderName}/${fileName}`),
  move: (folderName, fileName, targetFolder) => 
    apiClient.patch(`/api/files/${folderName}/${fileName}/move`, { targetFolder }),
  copy: (folderName, fileName, targetFolder) => 
    apiClient.patch(`/api/files/${folderName}/${fileName}/copy`, { targetFolder }),
  rename: (folderName, fileName, newName) => 
    apiClient.patch(`/api/files/${folderName}/${fileName}/rename`, { newName }),
  getInfo: (folderName, fileName) => apiClient.get(`/api/files/${folderName}/${fileName}/info`),
};

// SFTP API
export const sftpAPI = {
  getStatus: () => apiClient.get('/api/sftp/status'),
  getConnectionInfo: () => apiClient.get('/api/sftp/connection-info'),
  start: () => apiClient.post('/api/sftp/start'),
  stop: () => apiClient.post('/api/sftp/stop'),
  restart: () => apiClient.post('/api/sftp/restart'),
  getUsers: () => apiClient.get('/api/sftp/users'),
  addUser: (userData) => apiClient.post('/api/sftp/users', userData),
  removeUser: (username) => apiClient.delete(`/api/sftp/users/${username}`),
  generateKeys: (username) => apiClient.post(`/api/sftp/users/${username}/keys`),
  getConfig: () => apiClient.get('/api/sftp/config'),
  updateConfig: (config) => apiClient.put('/api/sftp/config', config),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => apiClient.get('/api/dashboard/stats'),
  getRecentActivity: () => apiClient.get('/api/dashboard/recent-activity'),
};

// Logs API
export const logsAPI = {
  getAll: (params) => apiClient.get('/api/logs', { params }),
  getByType: (type, params) => apiClient.get(`/api/logs/${type}`, { params }),
  clear: () => apiClient.delete('/api/logs'),
  export: (format = 'json') => apiClient.get(`/api/logs/export?format=${format}`),
};

// Transfers API
export const transfersAPI = {
  getAll: () => apiClient.get('/api/transfers'),
  getById: (id) => apiClient.get(`/api/transfers/${id}`),
  cancel: (id) => apiClient.post(`/api/transfers/${id}/cancel`),
  retry: (id) => apiClient.post(`/api/transfers/${id}/retry`),
  getProgress: (id) => apiClient.get(`/api/transfers/${id}/progress`),
};

// Settings API
export const settingsAPI = {
  getAll: () => apiClient.get('/api/settings'),
  update: (settings) => apiClient.put('/api/settings', settings),
  reset: () => apiClient.post('/api/settings/reset'),
  backup: () => apiClient.get('/api/settings/backup'),
  restore: (backupData) => apiClient.post('/api/settings/restore', backupData),
};

// Generic API helper functions
export const apiHelpers = {
  // Handle API errors consistently
  handleError: (error, defaultMessage = 'An error occurred') => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Server responded with error status
      return error.response.data?.message || error.response.data?.error || defaultMessage;
    } else if (error.request) {
      // Request was made but no response received
      return 'Network error. Please check your connection.';
    } else {
      // Something else happened
      return error.message || defaultMessage;
    }
  },

  // Create FormData for file uploads
  createFormData: (files, additionalData = {}) => {
    const formData = new FormData();
    
    // Add files
    if (Array.isArray(files)) {
      files.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });
    } else {
      formData.append('file', files);
    }
    
    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    return formData;
  },

  // Create URL with query parameters
  createURL: (path, params = {}) => {
    const url = new URL(path, API_BASE);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  },

  // Upload progress handler
  createUploadProgressHandler: (onProgress) => (progressEvent) => {
    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
    onProgress?.(progress);
  },
};

export default apiClient;