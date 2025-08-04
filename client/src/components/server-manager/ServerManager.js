import React, { useState, useEffect } from 'react';
import { usersAPI, dashboardAPI, apiHelpers } from '../../utils/api';
import './ServerManager.css';

const ServerManager = ({ user, onNotification }) => {
  const [serverStatus, setServerStatus] = useState({
    status: 'running',
    uptime: 'Connected',
    connections: 0,
    totalConnections: 0,
    lastRestart: new Date().toISOString()
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadServerData();
  }, []);

  const loadServerData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load users
      const usersResponse = await usersAPI.getAll();
      
      // Handle different response structures
      let usersData = [];
      if (usersResponse?.data) {
        if (Array.isArray(usersResponse.data)) {
          usersData = usersResponse.data;
        } else if (usersResponse.data.users && Array.isArray(usersResponse.data.users)) {
          usersData = usersResponse.data.users;
        } else if (usersResponse.data.data && Array.isArray(usersResponse.data.data)) {
          usersData = usersResponse.data.data;
        }
      }
      
      setUsers(usersData);

      // Load dashboard stats for server status
      const statsResponse = await dashboardAPI.getStats();
      const stats = statsResponse.data.stats;
      
      setServerStatus({
        status: 'running',
        uptime: 'Connected',
        connections: stats.activeUsers || 0,
        totalConnections: stats.totalUsers || 0,
        lastRestart: new Date().toISOString()
      });

    } catch (error) {
      const errorMessage = apiHelpers.handleError(error, 'Failed to load server data');
      setError(errorMessage);
      onNotification?.(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (uptimeString) => {
    return uptimeString;
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleServerAction = (action) => {
    onNotification(`Server ${action} initiated`, 'info');
    // In a real implementation, this would call server management APIs
  };

  const handleDisableUser = async (username) => {
    try {
      // In a real implementation, this would disable the user
      onNotification(`User ${username} has been disabled`, 'warning');
      await loadServerData(); // Refresh data
    } catch (error) {
      onNotification('Failed to disable user', 'error');
    }
  };

  return (
    <div className="server-manager">
      <div className="server-manager-header">
        <div className="header-info">
          <h1>SFTP Server Management</h1>
          <p>Monitor and control your SFTP server instance</p>
        </div>
        
        <div className="server-actions">
          <button 
            className="btn btn-success"
            onClick={() => handleServerAction('restart')}
          >
            <span>🔄</span>
            Restart
          </button>
          <button 
            className="btn btn-warning"
            onClick={() => handleServerAction('stop')}
          >
            <span>⏹️</span>
            Stop
          </button>
        </div>
      </div>

      <div className="server-dashboard">
        {/* Server Status Card */}
        <div className="status-card">
          <div className="status-header">
            <h2>Server Status</h2>
            <div className={`status-indicator ${serverStatus.status}`}>
              <div className="status-dot"></div>
              <span className="status-text">
                {serverStatus.status === 'running' ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
          
          <div className="status-metrics">
            <div className="metric">
              <div className="metric-icon">⏱️</div>
              <div className="metric-info">
                <span className="metric-label">Uptime</span>
                <span className="metric-value">{formatUptime(serverStatus.uptime)}</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon">🔗</div>
              <div className="metric-info">
                <span className="metric-label">Active Connections</span>
                <span className="metric-value">{serverStatus.connections}</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon">📊</div>
              <div className="metric-info">
                <span className="metric-label">Total Sessions</span>
                <span className="metric-value">{serverStatus.totalConnections.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="metric">
              <div className="metric-icon">🔄</div>
              <div className="metric-info">
                <span className="metric-label">Last Restart</span>
                <span className="metric-value">{formatDateTime(serverStatus.lastRestart)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Management */}
        <div className="connections-card">
          <div className="connections-header">
            <h2>System Users</h2>
            <span className="connection-count">{users.filter(u => u.isActive).length} active users</span>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading users...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>Error: {error}</p>
              <button onClick={loadServerData} className="retry-btn">Retry</button>
            </div>
          ) : (
            <div className="connections-list">
              {users.map((user) => (
                <div key={user.id} className="connection-item">
                  <div className="connection-info">
                    <div className="connection-user">
                      <div className="user-avatar">
                        {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="user-details">
                        <span className="username">{user?.username || 'Unknown'}</span>
                        <span className="user-ip">
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}` 
                            : user.email || 'No email'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="connection-meta">
                      <div className="connection-time">
                        <span className="time-label">Last Login</span>
                        <span className="time-value">
                          {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                        </span>
                      </div>
                      
                      <div className="connection-status">
                        <div className={`status-badge ${user.status}`}>
                          {user.status}
                        </div>
                        <div className={`role-badge ${user.role}`}>
                          {user.role}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="connection-actions">
                    <button 
                      className="action-btn info"
                      title="View Details"
                    >
                      👤
                    </button>
                    {user.username !== 'admin' && (
                      <button 
                        className="action-btn warning"
                        title="Disable User"
                        onClick={() => handleDisableUser(user.username)}
                      >
                        🚫
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!loading && !error && users.length === 0 && (
            <div className="empty-connections">
              <div className="empty-icon">👥</div>
              <h3>No Users Found</h3>
              <p>No users are currently registered in the system</p>
            </div>
          )}
        </div>

        {/* Server Configuration */}
        <div className="config-card">
          <div className="config-header">
            <h2>Server Configuration</h2>
            <button className="btn btn-secondary btn-sm">
              <span>⚙️</span>
              Edit Config
            </button>
          </div>
          
          <div className="config-list">
            <div className="config-item">
              <span className="config-label">Port</span>
              <span className="config-value">22</span>
            </div>
            <div className="config-item">
              <span className="config-label">Max Connections</span>
              <span className="config-value">50</span>
            </div>
            <div className="config-item">
              <span className="config-label">Auth Method</span>
              <span className="config-value">Password + Key</span>
            </div>
            <div className="config-item">
              <span className="config-label">Timeout</span>
              <span className="config-value">300s</span>
            </div>
            <div className="config-item">
              <span className="config-label">Root Directory</span>
              <span className="config-value">/var/sftp</span>
            </div>
            <div className="config-item">
              <span className="config-label">Logging</span>
              <span className="config-value">Enabled</span>
            </div>
          </div>
        </div>

        {/* Server Logs Preview */}
        <div className="logs-card">
          <div className="logs-header">
            <h2>Recent Activity</h2>
            <button className="btn btn-secondary btn-sm">
              <span>📋</span>
              View All Logs
            </button>
          </div>
          
          <div className="logs-list">
            <div className="log-item info">
              <span className="log-time">11:05</span>
              <span className="log-message">User 'developer' connected from 10.0.0.50</span>
            </div>
            <div className="log-item success">
              <span className="log-time">10:58</span>
              <span className="log-message">File upload completed: project.zip (15.2 MB)</span>
            </div>
            <div className="log-item info">
              <span className="log-time">10:45</span>
              <span className="log-message">User 'testuser' connected from 192.168.1.105</span>
            </div>
            <div className="log-item warning">
              <span className="log-time">10:30</span>
              <span className="log-message">Failed login attempt from 203.0.113.42</span>
            </div>
            <div className="log-item info">
              <span className="log-time">10:15</span>
              <span className="log-message">User 'admin' connected from 192.168.1.100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerManager;