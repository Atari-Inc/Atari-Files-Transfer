// API Configuration
export const API_BASE = "http://localhost:5050";

// Application Routes
export const ROUTES = {
  DASHBOARD: 'dashboard',
  FILE_MANAGER: 'file-manager',
  SERVER_MANAGER: 'server-manager',
  TRANSFERS: 'transfers',
  USERS: 'users',
  FOLDERS: 'folders',
  LOGS: 'logs',
  SETTINGS: 'settings'
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
};

// File Types
export const FILE_TYPES = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  ARCHIVE: 'archive',
  CODE: 'code',
  OTHER: 'other'
};

// File Icons Map
export const FILE_ICONS = {
  // Documents
  pdf: '📄',
  doc: '📝',
  docx: '📝',
  txt: '📝',
  rtf: '📝',
  
  // Spreadsheets
  xls: '📊',
  xlsx: '📊',
  csv: '📊',
  
  // Presentations
  ppt: '📽️',
  pptx: '📽️',
  
  // Archives
  zip: '🗜️',
  rar: '🗜️',
  '7z': '🗜️',
  tar: '🗜️',
  gz: '🗜️',
  
  // Images
  jpg: '🖼️',
  jpeg: '🖼️',
  png: '🖼️',
  gif: '🖼️',
  bmp: '🖼️',
  svg: '🖼️',
  webp: '🖼️',
  
  // Videos
  mp4: '🎥',
  avi: '🎥',
  mkv: '🎥',
  mov: '🎥',
  wmv: '🎥',
  flv: '🎥',
  webm: '🎥',
  
  // Audio
  mp3: '🎵',
  wav: '🎵',
  flac: '🎵',
  aac: '🎵',
  ogg: '🎵',
  
  // Code
  js: '💻',
  jsx: '💻',
  ts: '💻',
  tsx: '💻',
  html: '🌐',
  css: '🎨',
  json: '📋',
  xml: '📋',
  sql: '🗄️',
  py: '🐍',
  java: '☕',
  cpp: '⚡',
  c: '⚡',
  php: '🐘',
  rb: '💎',
  go: '🐹',
  rs: '🦀'
};

// Default file icon
export const DEFAULT_FILE_ICON = '📄';

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// View Modes
export const VIEW_MODES = {
  GRID: 'grid',
  LIST: 'list'
};

// Sort Options
export const SORT_OPTIONS = {
  NAME: 'name',
  SIZE: 'size',
  DATE: 'date',
  TYPE: 'type'
};

// Sort Orders
export const SORT_ORDERS = {
  ASC: 'asc',
  DESC: 'desc'
};

// File Size Units
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

// Maximum file size (in bytes) - 100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed file extensions
export const ALLOWED_EXTENSIONS = [
  // Documents
  'pdf', 'doc', 'docx', 'txt', 'rtf',
  // Spreadsheets
  'xls', 'xlsx', 'csv',
  // Presentations
  'ppt', 'pptx',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
  // Videos
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
  // Audio
  'mp3', 'wav', 'flac', 'aac', 'ogg',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz',
  // Code
  'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'xml', 'sql',
  'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'
];

// Navigation Items
export const NAVIGATION_ITEMS = {
  MAIN: [
    {
      id: ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: '📊',
      tooltip: 'Dashboard Overview'
    },
    {
      id: ROUTES.FILE_MANAGER,
      label: 'File Manager',
      icon: '📁',
      tooltip: 'Manage Your Files'
    },
    {
      id: ROUTES.TRANSFERS,
      label: 'Transfers',
      icon: '⚡',
      tooltip: 'Transfer Monitoring'
    },
    {
      id: ROUTES.SETTINGS,
      label: 'Settings',
      icon: '⚙️',
      tooltip: 'User Settings'
    }
  ],
  ADMIN: [
    {
      id: ROUTES.SERVER_MANAGER,
      label: 'Server Manager',
      icon: '🖥️',
      tooltip: 'Server Administration'
    },
    {
      id: ROUTES.USERS,
      label: 'Users',
      icon: '👥',
      tooltip: 'User Management'
    },
    {
      id: ROUTES.FOLDERS,
      label: 'Folders',
      icon: '📂',
      tooltip: 'Folder Management'
    },
    {
      id: ROUTES.LOGS,
      label: 'Activity Logs',
      icon: '📋',
      tooltip: 'System Activity Logs'
    }
  ]
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 20;

// Auto-refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  DASHBOARD: 30000, // 30 seconds
  TRANSFERS: 5000,  // 5 seconds
  FILES: 60000,     // 1 minute
  LOGS: 10000       // 10 seconds
};

// S3 Configuration
export const S3_CONFIG = {
  REGION: 'us-east-1',
  BUCKET_NAME: 'secure-transfer-sftp',
  ACCESS_KEY_ID: null, // Configure via backend
  SECRET_ACCESS_KEY: null // Configure via backend
};

// Folder Permissions
export const FOLDER_PERMISSIONS = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  ADMIN_ONLY: 'admin_only',
  USER_SPECIFIC: 'user_specific'
};

// User Folder Structure
export const USER_FOLDERS = {
  ADMIN: {
    HOME: 'admin',
    SHARED: 'shared',
    USERS: 'users',
    SYSTEM: 'system',
    BACKUPS: 'backups',
    LOGS: 'logs'
  },
  USER: {
    HOME: 'users/{username}',
    SHARED: 'shared',
    PERSONAL: 'users/{username}/personal',
    PROJECTS: 'users/{username}/projects'
  }
};

// File Operations
export const FILE_OPERATIONS = {
  UPLOAD: 'upload',
  DOWNLOAD: 'download',
  DELETE: 'delete',
  MOVE: 'move',
  COPY: 'copy',
  RENAME: 'rename',
  CREATE_FOLDER: 'create_folder',
  SHARE: 'share'
};

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refresh_token',
  TOKEN_TYPE: 'token_type',
  EXPIRES_IN: 'expires_in',
  USER: 'user',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  VIEW_MODE: 'viewMode',
  SORT_PREFERENCE: 'sortPreference'
};