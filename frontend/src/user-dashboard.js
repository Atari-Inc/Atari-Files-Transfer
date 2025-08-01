import React, { useEffect, useState } from "react";
import axios from "axios";
import "./styles.css";

const API_BASE = process.env.REACT_APP_API_URL;

function UserDashboard({ user, onLogout }) {
  const [folders, setFolders] = useState([]);
  const [selectedFolderForFiles, setSelectedFolderForFiles] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activePage, setActivePage] = useState("files");

  const loadFolders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/folders`);
      setFolders(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load folders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (folderName) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/files/${folderName}`);
      setFiles(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load files");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) {
      setError("Folder name is required");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE}/folders`, {
        folder_name: newFolderName.trim(),
      });
      setSuccess("Folder created successfully!");
      setNewFolderName("");
      setError("");
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create folder");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile || !selectedFolderForFiles) {
      setError("Please select a file and folder");
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await axios.post(
        `${API_BASE}/files/${selectedFolderForFiles}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setSuccess("File uploaded successfully!");
      setSelectedFile(null);
      setError("");
      loadFiles(selectedFolderForFiles);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to upload file");
      console.error(err);
    } finally {
      setUploadingFile(false);
    }
  };

  const downloadFile = async (filename) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/files/${selectedFolderForFiles}/${filename}/download`);
      
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = res.data.download_url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess("Download started!");
    } catch (err) {
      setError("Failed to download file");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    
    const sizeNames = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < sizeNames.length - 1) {
      size /= 1024.0;
      i += 1;
    }
    return `${size.toFixed(1)} ${sizeNames[i]}`;
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const renderFileManager = () => (
    <div className="file-manager">
      <div className="file-manager-header">
        <h2 className="page-title">File Manager</h2>
        <div className="folder-selector">
          <select
            value={selectedFolderForFiles}
            onChange={(e) => {
              setSelectedFolderForFiles(e.target.value);
              if (e.target.value) {
                loadFiles(e.target.value);
              } else {
                setFiles([]);
              }
            }}
            className="select"
            disabled={loading}
          >
            <option value="">Select a folder</option>
            {folders.map((folder) => (
              <option key={folder.name} value={folder.name}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedFolderForFiles && (
        <>
          <div className="upload-section">
            <div className="upload-form">
              <input
                type="file"
                onChange={handleFileSelect}
                className="file-input"
                disabled={uploadingFile}
              />
              <button
                onClick={uploadFile}
                className="btn btn-primary"
                disabled={uploadingFile || !selectedFile}
              >
                {uploadingFile ? (
                  <>
                    <span className="spinner"></span>
                    Uploading...
                  </>
                ) : (
                  "Upload File"
                )}
              </button>
            </div>
            {selectedFile && (
              <div className="selected-file">
                <span className="file-icon">📄</span>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
          </div>

          <div className="files-section">
            <div className="files-header">
              <h3>Files in {selectedFolderForFiles}</h3>
              <button
                onClick={() => loadFiles(selectedFolderForFiles)}
                className="btn btn-secondary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Loading...
                  </>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            {files.length === 0 && !loading ? (
              <div className="empty-state">
                <div className="empty-icon">📁</div>
                <h3>No files found</h3>
                <p>Upload files to get started</p>
              </div>
            ) : (
              <div className="files-list">
                {files.map((file) => (
                  <div key={file.key} className="file-item">
                    <div className="file-info">
                      <div className="file-icon">
                        <span className="icon-text">
                          {file.type === "directory" ? "📁" : "📄"}
                        </span>
                      </div>
                      <div className="file-details">
                        <h4 className="file-name">{file.name}</h4>
                        <p className="file-size">{file.size_formatted}</p>
                        {file.last_modified && (
                          <p className="file-date">
                            Modified: {new Date(file.last_modified).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="file-actions">
                      {file.type === "file" && (
                        <button
                          onClick={() => downloadFile(file.name)}
                          className="btn btn-secondary"
                          disabled={loading}
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderCreateFolder = () => (
    <div className="create-folder-section">
      <h2 className="page-title">Create New Folder</h2>
      <div className="folder-actions">
        <div className="create-folder-form">
          <input
            type="text"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="input"
            disabled={loading}
          />
          <button
            onClick={createFolder}
            className="btn btn-primary"
            disabled={loading || !newFolderName.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating...
              </>
            ) : (
              "Create Folder"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="nav-icon">🔐</span>
            <span className="nav-title">SFTP User Dashboard</span>
          </div>
          
          <div className="nav-menu">
            <button
              className={`nav-link ${activePage === "files" ? "active" : ""}`}
              onClick={() => setActivePage("files")}
            >
              <span className="nav-link-icon">📁</span>
              File Manager
            </button>
            <button
              className={`nav-link ${activePage === "create-folder" ? "active" : ""}`}
              onClick={() => setActivePage("create-folder")}
            >
              <span className="nav-link-icon">📂</span>
              Create Folder
            </button>
            <button
              className="nav-link"
              onClick={onLogout}
            >
              <span className="nav-link-icon">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container">
        <main className="main-content">
          {error && (
            <div className="alert alert-error">
              <span className="alert-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span className="alert-icon">✅</span>
              {success}
            </div>
          )}

          <div className="user-info-banner">
            <div className="user-avatar">
              <span className="avatar-text">{user.firstName?.charAt(0) || user.username.charAt(0).toUpperCase()}</span>
            </div>
            <div className="user-details">
              <h3>Welcome, {user.firstName || user.username}!</h3>
              <p>Role: {user.role}</p>
            </div>
          </div>

          {activePage === "files" && (
            <div className="page">
              <div className="page-header">
                <h1 className="page-title">File Manager</h1>
                <p className="page-subtitle">Upload and manage your files</p>
              </div>
              {renderFileManager()}
            </div>
          )}

          {activePage === "create-folder" && (
            <div className="page">
              {renderCreateFolder()}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default UserDashboard; 