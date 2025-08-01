import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import "./styles.css";
import Login from "./login";
import UserDashboard from "./user-dashboard";

const API_BASE = process.env.REACT_APP_API_URL;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [folders, setFolders] = useState([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activePage, setActivePage] = useState("dashboard");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [selectedFolderForFiles, setSelectedFolderForFiles] = useState("");
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    password: "",
    firstName: "",
    lastName: "",
    email: "",
    role: "user"
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/users`);
      setUsers(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const createUser = async () => {
    if (!firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !selectedFolder.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/create-user`, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        homeDirectory: selectedFolder.trim(),
      });
      
      setSuccess("User created successfully!");
      setGeneratedKeys(response.data.ssh_keys);
      setShowKeyModal(true);
      
      // Clear form
      setFirstName("");
      setLastName("");
      setUsername("");
      setEmail("");
      setSelectedFolder("");
      setError("");
      
      loadUsers();
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
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
      setSelectedFolder(newFolderName.trim()); // Auto-select the new folder
      setError("");
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create folder");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/delete-user/${username}`);
      setSuccess("User deleted successfully!");
      setError("");
      loadUsers();
      loadFolders();
    } catch (err) {
      setError("Failed to delete user");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFolder = async (folderName) => {
    if (!confirm(`Are you sure you want to delete folder "${folderName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/folders/${folderName}`);
      setSuccess("Folder deleted successfully!");
      setError("");
      loadFolders();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete folder");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const closeKeyModal = () => {
    setShowKeyModal(false);
    setGeneratedKeys(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const downloadPrivateKey = () => {
    if (!generatedKeys?.ssh_keys?.private_key) {
      setError("No private key available");
      return;
    }

    const username = generatedKeys.user?.username || 'user';
    const filename = `${username}_private_key.pem`;
    
    const blob = new Blob([generatedKeys.ssh_keys.private_key], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    setSuccess("Private key downloaded successfully!");
    setTimeout(() => setSuccess(""), 3000);
  };

  const downloadUserCredentials = async (username) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/user-credentials/${username}`);
      
      // Create credentials file content
      const credentials = response.data;
      const content = `SFTP Connection Details for ${username}

Host: ${credentials.host}
Port: ${credentials.port}
Username: ${credentials.username}
Protocol: ${credentials.protocol}
Home Directory: ${credentials.home_directory}

SSH Public Keys:
${credentials.ssh_keys.map(key => `Key ID: ${key.key_id}\nPublic Key:\n${key.public_key}\n`).join('\n')}

Note: You will need to provide your private key file for authentication.
Contact your administrator to get your private key file.

Connection Instructions:
1. Use an SFTP client (WinSCP, FileZilla, Cyberduck)
2. Enter the connection details above
3. Select your private key file for authentication
4. You will be connected to your home directory`;
      
      const filename = `${username}_sftp_credentials.txt`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      setSuccess("Credentials downloaded successfully!");
      setTimeout(() => setSuccess(""), 3000);
      
    } catch (err) {
      setError("Failed to download credentials");
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

  const deleteFile = async (filename) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await axios.delete(`${API_BASE}/files/${selectedFolderForFiles}/${filename}`);
      setSuccess("File deleted successfully!");
      setError("");
      loadFiles(selectedFolderForFiles);
    } catch (err) {
      setError("Failed to delete file");
      console.error(err);
    } finally {
      setLoading(false);
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

  const createWebUser = async () => {
    if (!newUserData.username.trim() || !newUserData.password.trim() || 
        !newUserData.firstName.trim() || !newUserData.lastName.trim() || 
        !newUserData.email.trim()) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE}/auth/register`, newUserData);
      
      setSuccess("User created successfully!");
      setShowUserModal(false);
      setNewUserData({
        username: "",
        password: "",
        firstName: "",
        lastName: "",
        email: "",
        role: "user"
      });
      setError("");
      
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setNewUserData({
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "user"
    });
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setLoading(true);
  };

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Load data only for admin users
  useEffect(() => {
    if (user && user.role === 'admin') {
      loadUsers();
      loadFolders();
    }
  }, [user]);

  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(clearMessages, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const renderDashboard = () => (
    <div className="dashboard-grid">
      <div className="dashboard-card">
        <div className="dashboard-icon">👥</div>
        <h3>Total Users</h3>
        <div className="dashboard-number">{users.length}</div>
        <button 
          className="btn btn-secondary"
          onClick={() => setActivePage("users")}
        >
          View Users
        </button>
      </div>
      
      <div className="dashboard-card">
        <div className="dashboard-icon">📁</div>
        <h3>Total Folders</h3>
        <div className="dashboard-number">{folders.length}</div>
        <button 
          className="btn btn-secondary"
          onClick={() => setActivePage("folders")}
        >
          View Folders
        </button>
      </div>
      
      <div className="dashboard-card">
        <div className="dashboard-icon">💾</div>
        <h3>Total Storage</h3>
        <div className="dashboard-number">
          {formatTotalStorage()}
        </div>
        <p className="dashboard-subtitle">Across all folders</p>
      </div>
      
      <div className="dashboard-card">
        <div className="dashboard-icon">⚡</div>
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setActivePage("create")}
          >
            Create User
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => { loadUsers(); loadFolders(); }}
            disabled={loading}
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <>
      {users.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h3>No users found</h3>
          <p>Create your first SFTP user to get started</p>
          <button 
            className="btn btn-primary"
            onClick={() => setActivePage("create")}
          >
            Create User
          </button>
        </div>
      ) : (
        <div className="users-list">
          {users.map((user) => (
            <div key={user.UserName} className="user-item">
              <div className="user-info">
                <div className="user-avatar">
                  <span className="avatar-text">{user.UserName.charAt(0).toUpperCase()}</span>
                </div>
                <div className="user-details">
                  <h3 className="user-name">{user.UserName}</h3>
                  <p className="user-directory">{user.HomeDirectory || "No directory set"}</p>
                </div>
              </div>
              <div className="user-actions">
                <button
                  onClick={() => downloadUserCredentials(user.UserName)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Download Credentials
                </button>
                <button
                  onClick={() => deleteUser(user.UserName)}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderFolders = () => (
    <>
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

      {folders.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3>No folders found</h3>
          <p>Create your first folder to get started</p>
        </div>
      ) : (
        <div className="folders-list">
          {folders.map((folder) => (
            <div key={folder.name} className="folder-item">
              <div className="folder-info">
                <div className="folder-icon">
                  <span className="icon-text">📁</span>
                </div>
                <div className="folder-details">
                  <h3 className="folder-name">{folder.name}</h3>
                  <p className="folder-path">{folder.path}</p>
                  <div className="folder-stats">
                    <span className="folder-size">{folder.size_formatted}</span>
                    <span className="folder-users">
                      {folder.user_count} user{folder.user_count !== 1 ? 's' : ''} mapped
                    </span>
                  </div>
                  {folder.mapped_users.length > 0 && (
                    <div className="mapped-users">
                      <span className="users-label">Users:</span>
                      {folder.mapped_users.map((user, index) => (
                        <span key={user} className="user-tag">
                          {user}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="folder-actions">
                <button
                  onClick={() => deleteFolder(folder.name)}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderCreateUser = () => (
    <div className="create-user-form">
      <h2 className="page-title">Create New User</h2>
      <form className="form" onSubmit={(e) => { e.preventDefault(); createUser(); }}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              placeholder="Enter first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              placeholder="Enter last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="folder">Home Directory</label>
          <div className="folder-selector">
            <select
              id="folder"
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
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
            <div className="folder-selector-actions">
              <input
                type="text"
                placeholder="Or create new folder"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="input"
                disabled={loading}
              />
              <button
                type="button"
                onClick={createFolder}
                className="btn btn-secondary"
                disabled={loading || !newFolderName.trim()}
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !firstName.trim() || !lastName.trim() || !username.trim() || !email.trim() || !selectedFolder.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating User...
              </>
            ) : (
              "Create User & Generate SSH Key"
            )}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setActivePage("dashboard")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  const renderKeyModal = () => (
    showKeyModal && (
      <div className="modal-overlay" onClick={closeKeyModal}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>SSH Keys Generated Successfully</h3>
            <button className="modal-close" onClick={closeKeyModal}>×</button>
          </div>
          <div className="modal-content">
            <div className="connection-info">
              <h4>SFTP Connection Details</h4>
              <div className="connection-details">
                <div className="detail-item">
                  <strong>Host:</strong> {generatedKeys.sftp_connection?.host || 'N/A'}
                </div>
                <div className="detail-item">
                  <strong>Port:</strong> {generatedKeys.sftp_connection?.port || '22'}
                </div>
                <div className="detail-item">
                  <strong>Username:</strong> {generatedKeys.user?.username || 'N/A'}
                </div>
                <div className="detail-item">
                  <strong>Protocol:</strong> SFTP
                </div>
                <div className="detail-item">
                  <strong>Home Directory:</strong> {generatedKeys.user?.homeDirectory || 'N/A'}
                </div>
              </div>
              
              <div className="connection-instructions">
                <h5>How to Connect:</h5>
                <ol>
                  <li>Download your private key below</li>
                  <li>Use an SFTP client (WinSCP, FileZilla, Cyberduck)</li>
                  <li>Enter the connection details above</li>
                  <li>Select your private key file for authentication</li>
                </ol>
              </div>
            </div>
            
            <div className="key-section">
              <h4>Public Key</h4>
              <div className="key-display">
                <textarea
                  value={generatedKeys.ssh_keys?.public_key || ''}
                  readOnly
                  className="key-textarea"
                  rows="3"
                />
                <button
                  onClick={() => copyToClipboard(generatedKeys.ssh_keys?.public_key || '')}
                  className="btn btn-secondary"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div className="key-section">
              <h4>Private Key</h4>
              <div className="key-display">
                <textarea
                  value={generatedKeys.ssh_keys?.private_key || ''}
                  readOnly
                  className="key-textarea"
                  rows="8"
                />
                <button
                  onClick={() => copyToClipboard(generatedKeys.ssh_keys?.private_key || '')}
                  className="btn btn-secondary"
                >
                  Copy
                </button>
                <button
                  onClick={() => downloadPrivateKey()}
                  className="btn btn-primary"
                >
                  Download Private Key
                </button>
              </div>
              <p className="key-warning">
                ⚠️ Save this private key securely. It won't be shown again.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={closeKeyModal} className="btn btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    )
  );

  const renderUserModal = () => (
    showUserModal && (
      <div className="modal-overlay" onClick={closeUserModal}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Create New User</h3>
            <button className="modal-close" onClick={closeUserModal}>×</button>
          </div>
          <div className="modal-content">
            <form className="form" onSubmit={(e) => { e.preventDefault(); createWebUser(); }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newFirstName">First Name</label>
                  <input
                    id="newFirstName"
                    type="text"
                    placeholder="Enter first name"
                    value={newUserData.firstName}
                    onChange={(e) => setNewUserData({...newUserData, firstName: e.target.value})}
                    className="input"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newLastName">Last Name</label>
                  <input
                    id="newLastName"
                    type="text"
                    placeholder="Enter last name"
                    value={newUserData.lastName}
                    onChange={(e) => setNewUserData({...newUserData, lastName: e.target.value})}
                    className="input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newUsername">Username</label>
                  <input
                    id="newUsername"
                    type="text"
                    placeholder="Enter username"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({...newUserData, username: e.target.value})}
                    className="input"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newEmail">Email</label>
                  <input
                    id="newEmail"
                    type="email"
                    placeholder="Enter email address"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="input"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newPassword">Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    placeholder="Enter password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="input"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newRole">Role</label>
                  <select
                    id="newRole"
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                    className="select"
                    disabled={loading}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || !newUserData.username.trim() || !newUserData.password.trim() || !newUserData.firstName.trim() || !newUserData.lastName.trim() || !newUserData.email.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Creating User...
                    </>
                  ) : (
                    "Create User"
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeUserModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  );

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
                        <>
                          <button
                            onClick={() => downloadFile(file.name)}
                            className="btn btn-secondary"
                            disabled={loading}
                          >
                            Download
                          </button>
                          <button
                            onClick={() => deleteFile(file.name)}
                            className="btn btn-danger"
                            disabled={loading}
                          >
                            Delete
                          </button>
                        </>
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

  const formatTotalStorage = () => {
    const totalBytes = folders.reduce((sum, folder) => sum + folder.size_bytes, 0);
    if (totalBytes === 0) return "0 B";
    
    const sizeNames = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let size = totalBytes;
    while (size >= 1024 && i < sizeNames.length - 1) {
      size /= 1024.0;
      i += 1;
    }
    return `${size.toFixed(1)} ${sizeNames[i]}`;
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

  // Show loading screen
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Show user dashboard for regular users
  if (user.role === 'user') {
    return <UserDashboard user={user} onLogout={handleLogout} />;
  }

  // Show admin dashboard for admin users
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-brand">
            <span className="nav-icon">🔐</span>
            <span className="nav-title">Atari SFTP Admin</span>
          </div>
          
          <div className="nav-menu">
            <button
              className={`nav-link ${activePage === "dashboard" ? "active" : ""}`}
              onClick={() => setActivePage("dashboard")}
            >
              <span className="nav-link-icon">📊</span>
              Dashboard
            </button>
            <button
              className={`nav-link ${activePage === "users" ? "active" : ""}`}
              onClick={() => setActivePage("users")}
            >
              <span className="nav-link-icon">👥</span>
              Users ({users.length})
            </button>
            <button
              className={`nav-link ${activePage === "folders" ? "active" : ""}`}
              onClick={() => setActivePage("folders")}
            >
              <span className="nav-link-icon">📁</span>
              Folders ({folders.length})
            </button>
            <button
              className={`nav-link ${activePage === "create" ? "active" : ""}`}
              onClick={() => setActivePage("create")}
            >
              <span className="nav-link-icon">➕</span>
              Create SFTP User
            </button>
            <button
              className="nav-link"
              onClick={() => setShowUserModal(true)}
            >
              <span className="nav-link-icon">👤</span>
              Create Web User
            </button>
            <button
              className={`nav-link ${activePage === "files" ? "active" : ""}`}
              onClick={() => setActivePage("files")}
            >
              <span className="nav-link-icon">📁</span>
              File Manager
            </button>
            <button
              className="nav-link"
              onClick={handleLogout}
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

          {activePage === "dashboard" && (
            <div className="page">
              <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Overview of your SFTP system</p>
              </div>
              {renderDashboard()}
            </div>
          )}

          {activePage === "users" && (
            <div className="page">
              <div className="page-header">
                <h1 className="page-title">SFTP Users</h1>
                <div className="page-actions">
                  <button
                    onClick={loadUsers}
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
                  <button
                    onClick={() => setActivePage("create")}
                    className="btn btn-primary"
                  >
                    Create User
                  </button>
                </div>
              </div>
              {renderUsers()}
            </div>
          )}

          {activePage === "folders" && (
            <div className="page">
              <div className="page-header">
                <h1 className="page-title">S3 Bucket Folders</h1>
                <div className="page-actions">
                  <button
                    onClick={loadFolders}
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
              </div>
              {renderFolders()}
            </div>
          )}

          {activePage === "create" && (
            <div className="page">
              {renderCreateUser()}
            </div>
          )}

          {activePage === "files" && (
            <div className="page">
              <div className="page-header">
                <h1 className="page-title">File Manager</h1>
                <p className="page-subtitle">Upload and manage files in your SFTP folders</p>
              </div>
              {renderFileManager()}
            </div>
          )}
        </main>
      </div>

      {renderKeyModal()}
      {renderUserModal()}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
