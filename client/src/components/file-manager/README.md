# S3 File Manager Integration

This File Manager component integrates with AWS S3 buckets to provide secure, role-based file management for your SFTP application.

## 🎯 Features

### **Role-Based Access Control**
- **Admin Users**: Full access to all folders and system directories
- **Regular Users**: Access only to their own folders and shared directories
- **Permission Enforcement**: Real-time access checking for all operations

### **Folder Structure**

#### **Admin Access**
```
├── admin/                    # Admin home directory
├── shared/                   # Shared files for all users
├── users/                    # All user directories
├── system/                   # System files and configurations
├── backups/                  # System backups
└── logs/                     # System logs
```

#### **User Access**
```
├── users/{username}/         # User's private directory
│   ├── personal/            # Personal files
│   └── projects/            # Project files
└── shared/                   # Shared files (read-only or read-write)
```

## 🔧 Setup and Configuration

### **1. Environment Variables**
Create a `.env` file in your project root with:

```env
# S3 Configuration
REACT_APP_S3_REGION=us-east-1
REACT_APP_S3_BUCKET=your-bucket-name
REACT_APP_S3_ACCESS_KEY=your-access-key
REACT_APP_S3_SECRET_KEY=your-secret-key

# API Configuration
REACT_APP_API_URL=http://localhost:5000
```

### **2. Backend API Endpoints**
The frontend expects these API endpoints to be implemented:

```
GET    /api/s3/list?path={folderPath}           # List folder contents
POST   /api/s3/upload                           # Upload files
DELETE /api/s3/delete                           # Delete files/folders
POST   /api/s3/folder                           # Create folder
POST   /api/s3/move                             # Move files
POST   /api/s3/copy                             # Copy files
GET    /api/s3/presigned-url?path={filePath}    # Get download URL
```

### **3. S3 Bucket Permissions**
Ensure your S3 bucket has appropriate policies for:
- Object read/write access
- Folder creation and deletion
- Presigned URL generation

## 🚀 Usage

### **Navigation**
- **Breadcrumb Navigation**: Click any folder in the path to navigate
- **Quick Access**: Role-based shortcuts to common folders
- **Back Button**: Navigate to previous folder

### **File Operations**
- **Upload**: Multiple file upload with progress tracking
- **Download**: Secure presigned URL downloads
- **Delete**: Confirmation-based deletion
- **Create Folder**: Modal-based folder creation

### **Search and Sort**
- **Real-time Search**: Filter files and folders by name
- **Multiple Sort Options**: Name, size, date modified
- **Sort Direction**: Ascending/descending toggle

### **View Modes**
- **Grid View**: Thumbnail-style display
- **List View**: Detailed tabular display

## 📊 Permission System

### **Permission Types**
- `public`: Accessible by all users
- `private`: User-specific access only
- `admin_only`: Admin users only
- `user_specific`: Specific user access

### **Access Control Functions**
```javascript
// Check if user can access folder
hasAccessToFolder(user, folderPath)

// Get user's accessible folders
getUserAccessibleFolders(user)

// Check specific operations
canUpload(user, folderPath)
canDelete(user, filePath)
canCreateFolder(user, folderPath)
```

## 🎨 UI Features

### **Visual Indicators**
- **Lock Icons**: Show restricted access
- **Permission Badges**: Display folder permissions
- **Progress Bars**: Real-time upload progress
- **Loading States**: Smooth loading indicators

### **Responsive Design**
- **Mobile-First**: Optimized for all screen sizes
- **Touch-Friendly**: Large touch targets
- **Adaptive Layout**: Grid/list view switching

### **Accessibility**
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **Focus Management**: Proper focus handling

## 🔒 Security Features

### **Client-Side Security**
- **Permission Validation**: Real-time access checking
- **Secure Downloads**: Presigned URLs with expiration
- **Input Validation**: File type and size restrictions
- **CSRF Protection**: Token-based authentication

### **File Upload Security**
- **File Type Validation**: Configurable allowed extensions
- **Size Limits**: Configurable maximum file sizes
- **Virus Scanning**: Integration ready for AV scanning
- **Content Validation**: MIME type checking

## 📈 Performance

### **Optimization Features**
- **Lazy Loading**: Load content on demand
- **Caching**: Intelligent folder content caching
- **Debounced Search**: Optimized search performance
- **Progressive Upload**: Chunked file uploads

### **Monitoring**
- **Upload Progress**: Real-time progress tracking
- **Error Handling**: Comprehensive error management
- **Retry Logic**: Automatic retry for failed operations
- **Network Resilience**: Offline detection and handling

## 🛠 Customization

### **Theming**
All styles use CSS custom properties for easy theming:
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --success-color: #10b981;
  --danger-color: #ef4444;
}
```

### **Configuration**
Modify constants in `src/constants/index.js`:
```javascript
export const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
export const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'png', ...];
export const USER_FOLDERS = { ... };
```

### **Custom File Icons**
Update the file icon mapping:
```javascript
export const FILE_ICONS = {
  pdf: '📄',
  jpg: '🖼️',
  // Add your custom mappings
};
```

## 🐛 Troubleshooting

### **Common Issues**

1. **Access Denied Errors**
   - Check user permissions
   - Verify S3 bucket policies
   - Ensure correct folder paths

2. **Upload Failures**
   - Check file size limits
   - Verify allowed file types
   - Check S3 permissions

3. **Slow Loading**
   - Optimize S3 bucket structure
   - Implement CDN for static assets
   - Check network connectivity

### **Debug Mode**
Enable detailed logging by setting:
```javascript
localStorage.setItem('fileManagerDebug', 'true');
```

## 🔄 Integration with Backend

The File Manager is designed to work with a Node.js/Express backend that handles:
- AWS SDK integration
- Authentication and authorization
- File upload processing
- Presigned URL generation
- Error handling and logging

For a complete backend implementation example, refer to the backend documentation.

## 📚 API Reference

See `src/utils/s3.js` for complete API function documentation and usage examples.

## 🚀 Future Enhancements

- File sharing with expiration dates
- Collaborative folder permissions
- File versioning and history
- Advanced search with metadata
- Bulk operations (zip, move multiple)
- Real-time collaboration features