import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../utils/api';
import { formatTimeAgo, formatFileSize } from '../../utils';
import './UserManagement.css';

const UserManagement = ({ onNotification }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableFolders, setAvailableFolders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('username');
  const [sortOrder, setSortOrder] = useState('asc');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    homeDirectory: '',
    allowedFolders: [],
    sshPublicKey: '',
    tags: []
  });
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'user',
    allowedFolders: []
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showPageSizeSelector, setShowPageSizeSelector] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // Close page size selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPageSizeSelector && !event.target.closest('.page-size-selector')) {
        setShowPageSizeSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPageSizeSelector]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getAll();
      
      // Handle different response structures
      let usersData = [];
      if (response?.data) {
        if (Array.isArray(response.data)) {
          usersData = response.data;
        } else if (response.data.users && Array.isArray(response.data.users)) {
          usersData = response.data.users;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          usersData = response.data.data;
        }
      }
      
      setUsers(usersData);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
      setUsers([]); // Ensure users is always an array
      onNotification('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableFolders = async () => {
    try {
      const response = await fetch('http://localhost:5050/api/folders', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAvailableFolders(data.folders || []);
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadAvailableFolders();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!createForm.username || !createForm.password) {
      onNotification('Username and password are required', 'error');
      return;
    }

    if (!createForm.homeDirectory) {
      onNotification('Home directory is required', 'error');
      return;
    }

    try {
      const userData = {
        ...createForm,
        serverId: 'default',
        policy: generateUserPolicy(createForm.allowedFolders),
        tags: [
          { Key: 'CreatedBy', Value: 'WebApp' },
          { Key: 'Role', Value: createForm.role },
          { Key: 'Email', Value: createForm.email || '' }
        ]
      };

      await usersAPI.create(userData);
      onNotification(`User "${createForm.username}" created successfully`, 'success');
      setShowCreateModal(false);
      resetCreateForm();
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      onNotification(`Failed to create user: ${err.message}`, 'error');
    }
  };

  const generateUserPolicy = (allowedFolders) => {
    if (!allowedFolders || allowedFolders.length === 0) {
      return null;
    }

    const statements = allowedFolders.map(folder => ({
      Effect: 'Allow',
      Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket'],
      Resource: [
        `arn:aws:s3:::atari-files-transfer/${folder}/*`,
        `arn:aws:s3:::atari-files-transfer/${folder}`
      ]
    }));

    return JSON.stringify({
      Version: '2012-10-17',
      Statement: statements
    });
  };

  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      password: '',
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      homeDirectory: '',
      allowedFolders: [],
      sshPublicKey: '',
      tags: []
    });
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await usersAPI.delete(username);
      onNotification('User deleted successfully', 'success');
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      onNotification('Failed to delete user', 'error');
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      email: getUserEmail(user),
      firstName: getUserFirstName(user),
      lastName: getUserLastName(user),
      role: getUserRole(user),
      allowedFolders: getUserFolders(user)
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    try {
      const updateData = {
        ...editForm,
        tags: [
          { Key: 'CreatedBy', Value: 'WebApp' },
          { Key: 'Role', Value: editForm.role },
          { Key: 'Email', Value: editForm.email || '' },
          { Key: 'FirstName', Value: editForm.firstName || '' },
          { Key: 'LastName', Value: editForm.lastName || '' }
        ]
      };

      await usersAPI.update(selectedUser.UserName || selectedUser.username, updateData);
      onNotification('User updated successfully', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      onNotification(`Failed to update user: ${err.message}`, 'error');
    }
  };

  const handlePasswordChange = (user) => {
    setSelectedUser(user);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      onNotification('New passwords do not match', 'error');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      onNotification('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      await usersAPI.changePassword(selectedUser.UserName || selectedUser.username, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      onNotification('Password updated successfully', 'success');
      setShowPasswordModal(false);
      setSelectedUser(null);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error('Error updating password:', err);
      onNotification(`Failed to update password: ${err.message}`, 'error');
    }
  };

  const handleFormChange = (field, value) => {
    setCreateForm(prev => {
      const newForm = {
        ...prev,
        [field]: value
      };
      
      // Auto-populate home directory when username changes
      if (field === 'username' && value && !prev.homeDirectory) {
        newForm.homeDirectory = `/atari-files-transfer/${value}`;
      }
      
      return newForm;
    });
  };

  const handleManageSSHKeys = (user) => {
    // TODO: Implement SSH key management modal
    onNotification('SSH key management coming soon', 'info');
  };

  const handleManagePermissions = (user) => {
    // TODO: Implement permission management modal
    onNotification('Permission management coming soon', 'info');
  };

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      onNotification('Please select users first', 'warning');
      return;
    }

    if (action === 'delete') {
      if (!window.confirm(`Are you sure you want to delete ${selectedUsers.length} selected users?`)) {
        return;
      }

      try {
        for (const username of selectedUsers) {
          await usersAPI.delete(username);
        }
        onNotification(`${selectedUsers.length} users deleted successfully`, 'success');
        setSelectedUsers([]);
        loadUsers();
      } catch (err) {
        onNotification('Failed to delete some users', 'error');
      }
    }
  };

  const handleSelectUser = (username) => {
    setSelectedUsers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredAndSortedUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAndSortedUsers.map(user => user.UserName || user.username));
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'suspended': return 'danger';
      default: return 'primary';
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['Username', 'Email', 'First Name', 'Last Name', 'Role', 'Home Directory', 'Status', 'SSH Keys', 'Created Date'],
      ...filteredAndSortedUsers.map(user => [
        user.UserName || user.username,
        getUserEmail(user),
        getUserFirstName(user),
        getUserLastName(user),
        getUserRole(user),
        user.HomeDirectory || '',
        user.State || 'Active',
        user.SshPublicKeyCount || 0,
        getUserCreatedDate(user)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Helper functions to extract user data from database format
  const getUserEmail = (user) => {
    return user.email || '';
  };

  const getUserFirstName = (user) => {
    return user.firstName || '';
  };

  const getUserLastName = (user) => {
    return user.lastName || '';
  };

  const getUserRole = (user) => {
    return user.role || 'user';
  };

  const getUserFolders = (user) => {
    return user.allowedFolders || [];
  };

  const getUserCreatedDate = (user) => {
    return user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
  };

  // Filtering and sorting logic
  const allFilteredUsers = (Array.isArray(users) ? users : [])
    .filter(user => {
      const username = (user.username || '').toLowerCase();
      const email = getUserEmail(user).toLowerCase();
      const firstName = getUserFirstName(user).toLowerCase();
      const lastName = getUserLastName(user).toLowerCase();
      const role = getUserRole(user).toLowerCase();
      const status = (user.status || 'active').toLowerCase();
      
      const matchesSearch = searchTerm === '' || 
        username.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        firstName.includes(searchTerm.toLowerCase()) ||
        lastName.includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || role === filterRole;
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'username':
          aValue = (a.username || '').toLowerCase();
          bValue = (b.username || '').toLowerCase();
          break;
        case 'email':
          aValue = getUserEmail(a).toLowerCase();
          bValue = getUserEmail(b).toLowerCase();
          break;
        case 'role':
          aValue = getUserRole(a).toLowerCase();
          bValue = getUserRole(b).toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0);
          bValue = new Date(b.createdAt || 0);
          break;
        default:
          aValue = (a.username || '').toLowerCase();
          bValue = (b.username || '').toLowerCase();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Pagination logic
  const totalPages = Math.ceil(allFilteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const filteredAndSortedUsers = allFilteredUsers.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus, sortBy, sortOrder]);

  // Pagination helper functions
  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPreviousPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    setShowPageSizeSelector(false);
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="page-content">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Users</h3>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadUsers}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div className="page-title-section">
          <div className="title-with-stats">
            <h2>User Management</h2>
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-number">{Array.isArray(users) ? users.length : 0}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{allFilteredUsers.length}</span>
                <span className="stat-label">Filtered</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{(Array.isArray(users) ? users : []).filter(u => (u.State || 'active').toLowerCase() === 'active').length}</span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{selectedUsers.length}</span>
                <span className="stat-label">Selected</span>
              </div>
            </div>
          </div>
          <p>Manage user accounts and permissions for AWS Transfer Family</p>
        </div>
        <div className="page-actions">
          <div className="view-controls">
            <button 
              className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              ☰
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
          </div>
          
          <button 
            className="btn btn-outline"
            onClick={exportUsers}
            title="Export to CSV"
          >
            <span className="btn-icon">📊</span>
            Export
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={loadUsers}
          >
            <span className="btn-icon">🔄</span>
            Refresh
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <span className="btn-icon">👤</span>
            Create User
          </button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="users-controls">
        <div className="search-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        <div className="filter-section">
          <div className="filter-group">
            <label className="filter-label">Role:</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="readonly">Read Only</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label className="filter-label">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          
          <div className="sort-group">
            <label className="filter-label">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="username">Username</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="created">Created Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-order-btn"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="bulk-info">
            <span className="bulk-count">{selectedUsers.length}</span> user{selectedUsers.length !== 1 ? 's' : ''} selected
          </div>
          <div className="bulk-actions">
            <button 
              className="bulk-btn bulk-delete"
              onClick={() => handleBulkAction('delete')}
            >
              🗑️ Delete Selected
            </button>
            <button 
              className="bulk-btn bulk-clear"
              onClick={() => setSelectedUsers([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      <div className="users-container">
        {allFilteredUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{(Array.isArray(users) ? users.length : 0) === 0 ? 'No Users Found' : 'No users match your search'}</h3>
            <p>{(Array.isArray(users) ? users.length : 0) === 0 ? 'Create your first user to get started with AWS Transfer Family' : 'Try adjusting your search or filter criteria'}</p>
            {(Array.isArray(users) ? users.length : 0) === 0 && (
              <button 
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First User
              </button>
            )}
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th className="checkbox-column">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={selectedUsers.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = selectedUsers.length > 0 && selectedUsers.length < filteredAndSortedUsers.length;
                          }
                        }}
                        onChange={handleSelectAll}
                      />
                      <span className="checkmark"></span>
                    </label>
                  </th>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Home Directory</th>
                  <th>Status</th>
                  <th>SSH Keys</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedUsers.map((user) => (
                  <tr key={user.UserName || user.username} className={`user-row ${selectedUsers.includes(user.UserName || user.username) ? 'selected' : ''}`}>
                    <td className="checkbox-column">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.UserName || user.username)}
                          onChange={() => handleSelectUser(user.UserName || user.username)}
                        />
                        <span className="checkmark"></span>
                      </label>
                    </td>
                    <td className="user-info-cell">
                      <div className="user-info">
                        <div className="user-avatar">
                          <span className="avatar-text">{user.username?.[0]?.toUpperCase()}</span>
                          <div className="user-status-indicator">
                            <span className={`status-dot status-${(user.status || 'active').toLowerCase()}`}></span>
                          </div>
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.username}</div>
                          <div className="user-fullname">
                            {getUserFirstName(user)} {getUserLastName(user)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="contact-cell">
                      <div className="contact-info">
                        <div className="email">{getUserEmail(user) || 'No email'}</div>
                        <div className="server-id">ID: {user.id}</div>
                      </div>
                    </td>
                    <td className="role-cell">
                      <span className={`role-badge role-${getUserRole(user)}`}>
                        {getUserRole(user)}
                      </span>
                    </td>
                    <td className="directory-cell">
                      <code className="directory-path">
                        {user.homeDirectory || 'Not set'}
                      </code>
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge status-${(user.status || 'active').toLowerCase()}`}>
                        {user.status || 'Active'}
                      </span>
                    </td>
                    <td className="ssh-keys-cell">
                      <div className="ssh-info">
                        <span className="ssh-count">{user.sshPublicKey ? 1 : 0}</span>
                        <span className="ssh-label">keys</span>
                      </div>
                    </td>
                    <td className="created-cell">
                      {getUserCreatedDate(user)}
                    </td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <div className="primary-actions">
                          <button 
                            className="action-btn edit"
                            onClick={() => handleEditUser(user)}
                            title="Edit User Details"
                          >
                            <span className="action-icon">✏️</span>
                            <span className="action-label">Edit</span>
                          </button>
                          <button 
                            className="action-btn password"
                            onClick={() => handlePasswordChange(user)}
                            title="Change Password"
                          >
                            <span className="action-icon">🔐</span>
                            <span className="action-label">Password</span>
                          </button>
                        </div>
                        <div className="secondary-actions">
                          <button 
                            className="action-btn ssh-key"
                            onClick={() => handleManageSSHKeys(user)}
                            title="Manage SSH Keys"
                          >
                            🔑
                          </button>
                          <button 
                            className="action-btn permissions"
                            onClick={() => handleManagePermissions(user)}
                            title="Manage Permissions"
                          >
                            🛡️
                          </button>
                          <button 
                            className="action-btn delete"
                            onClick={() => handleDeleteUser(user.UserName || user.username)}
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div className="pagination-container">
              <div className="pagination-info">
                <span className="pagination-summary">
                  Showing {startIndex + 1}-{Math.min(endIndex, allFilteredUsers.length)} of {allFilteredUsers.length} users
                  {allFilteredUsers.length !== (Array.isArray(users) ? users.length : 0) && (
                    <span className="filtered-info"> (filtered from {Array.isArray(users) ? users.length : 0} total)</span>
                  )}
                </span>
                
                <div className="items-per-page">
                  <span>Show:</span>
                  <div className="page-size-selector">
                    <button 
                      className="page-size-btn"
                      onClick={() => setShowPageSizeSelector(!showPageSizeSelector)}
                    >
                      {itemsPerPage} ▼
                    </button>
                    {showPageSizeSelector && (
                      <div className="page-size-dropdown">
                        {[5, 10, 25, 50, 100].map(size => (
                          <button
                            key={size}
                            className={`page-size-option ${itemsPerPage === size ? 'active' : ''}`}
                            onClick={() => handleItemsPerPageChange(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span>per page</span>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="pagination-controls">
                  <button 
                    className="pagination-btn"
                    onClick={goToFirstPage}
                    disabled={currentPage === 1}
                    title="First Page"
                  >
                    ⏮️
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    title="Previous Page"
                  >
                    ◀️
                  </button>

                  <div className="page-numbers">
                    {getPageNumbers().map(pageNum => (
                      <button
                        key={pageNum}
                        className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                        onClick={() => goToPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button 
                    className="pagination-btn"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                    title="Next Page"
                  >
                    ▶️
                  </button>
                  
                  <button 
                    className="pagination-btn"
                    onClick={goToLastPage}
                    disabled={currentPage === totalPages}
                    title="Last Page"
                  >
                    ⏭️
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input
                    type="text"
                    id="username"
                    value={createForm.username}
                    onChange={(e) => handleFormChange('username', e.target.value)}
                    required
                    placeholder="Enter username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    value={createForm.password}
                    onChange={(e) => handleFormChange('password', e.target.value)}
                    required
                    placeholder="Enter password"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={createForm.email}
                    onChange={(e) => handleFormChange('email', e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    value={createForm.firstName}
                    onChange={(e) => handleFormChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    value={createForm.lastName}
                    onChange={(e) => handleFormChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={createForm.role}
                    onChange={(e) => handleFormChange('role', e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="readonly">Read Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="homeDirectory">Home Directory *</label>
                <input
                  type="text"
                  id="homeDirectory"
                  value={createForm.homeDirectory}
                  onChange={(e) => handleFormChange('homeDirectory', e.target.value)}
                  required
                  placeholder={`/atari-files-transfer/${createForm.username || 'username'}`}
                />
                <small className="form-hint">
                  S3 path where user files will be stored
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="allowedFolders">Accessible Folders</label>
                <div className="folder-selection">
                  {availableFolders.map((folder) => (
                    <label key={folder.name} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={createForm.allowedFolders.includes(folder.name)}
                        onChange={(e) => {
                          const folders = e.target.checked
                            ? [...createForm.allowedFolders, folder.name]
                            : createForm.allowedFolders.filter(f => f !== folder.name);
                          handleFormChange('allowedFolders', folders);
                        }}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="folder-info">
                        <span className="folder-name">📁 {folder.name}</span>
                        <span className="folder-size">{formatFileSize(folder.totalSize || 0)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <small className="form-hint">
                  Select which S3 folders this user can access
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="sshPublicKey">SSH Public Key (Optional)</label>
                <textarea
                  id="sshPublicKey"
                  value={createForm.sshPublicKey}
                  onChange={(e) => handleFormChange('sshPublicKey', e.target.value)}
                  placeholder="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAAB..."
                  rows="3"
                />
                <small className="form-hint">
                  For key-based authentication (alternative to password)
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Transfer Family User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit User: {selectedUser.UserName || selectedUser.username}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="modal-content">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="edit-email">Email</label>
                  <input
                    type="email"
                    id="edit-email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-firstName">First Name</label>
                  <input
                    type="text"
                    id="edit-firstName"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-lastName">Last Name</label>
                  <input
                    type="text"
                    id="edit-lastName"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-role">Role</label>
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="readonly">Read Only</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="edit-allowedFolders">Accessible Folders</label>
                <div className="folder-selection">
                  {availableFolders.map((folder) => (
                    <label key={folder.name} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editForm.allowedFolders.includes(folder.name)}
                        onChange={(e) => {
                          const folders = e.target.checked
                            ? [...editForm.allowedFolders, folder.name]
                            : editForm.allowedFolders.filter(f => f !== folder.name);
                          setEditForm(prev => ({ ...prev, allowedFolders: folders }));
                        }}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="folder-info">
                        <span className="folder-name">📁 {folder.name}</span>
                        <span className="folder-size">{formatFileSize(folder.totalSize || 0)}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <small className="form-hint">
                  Select which S3 folders this user can access
                </small>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password: {selectedUser.UserName || selectedUser.username}</h3>
              <button 
                className="modal-close"
                onClick={() => setShowPasswordModal(false)}
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleUpdatePassword} className="modal-content">
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <input
                  type="password"
                  id="current-password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  placeholder="Enter current password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  required
                  placeholder="Enter new password"
                  minLength="6"
                />
                <small className="form-hint">Password must be at least 6 characters long</small>
              </div>

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  placeholder="Confirm new password"
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;