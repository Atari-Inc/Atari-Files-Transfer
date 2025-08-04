import React, { useState } from 'react';
import './ServerManager.css';

const ServerManager = ({ user, onNotification }) => {
  const [serverStatus] = useState({
    status: 'running',
    uptime: '7d 14h 32m',
    connections: 8,
    totalConnections: 1245,
    lastRestart: '2024-01-08T10:30:00Z'
  });

  const [connections] = useState([
    {
      id: 1,
      username: 'admin',
      ip: '192.168.1.100',
      connectedAt: '2024-01-15T09:30:00Z',
      status: 'active',
      transferring: true
    },
    {
      id: 2,
      username: 'testuser',
      ip: '192.168.1.105',
      connectedAt: '2024-01-15T10:15:00Z',
      status: 'active',
      transferring: false
    },
    {
      id: 3,
      username: 'developer',
      ip: '10.0.0.50',
      connectedAt: '2024-01-15T11:00:00Z',
      status: 'idle',
      transferring: false
    }
  ]);

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
  };

  const handleKickUser = (username) => {
    onNotification(`User ${username} has been disconnected`, 'warning');
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

        {/* Active Connections */}
        <div className="connections-card">
          <div className="connections-header">
            <h2>Active Connections</h2>
            <span className="connection-count">{connections.length} active</span>
          </div>
          
          <div className="connections-list">
            {connections.map((connection) => (
              <div key={connection.id} className="connection-item">
                <div className="connection-info">
                  <div className="connection-user">
                    <div className="user-avatar">
                      {connection.username[0].toUpperCase()}
                    </div>
                    <div className="user-details">
                      <span className="username">{connection.username}</span>
                      <span className="user-ip">{connection.ip}</span>
                    </div>
                  </div>
                  
                  <div className="connection-meta">
                    <div className="connection-time">
                      <span className="time-label">Connected</span>
                      <span className="time-value">{formatDateTime(connection.connectedAt)}</span>
                    </div>
                    
                    <div className="connection-status">
                      <div className={`status-badge ${connection.status}`}>
                        {connection.status}
                      </div>
                      {connection.transferring && (
                        <div className="transfer-indicator">
                          <span className="transfer-icon">📤</span>
                          <span>Transferring</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="connection-actions">
                  <button 
                    className="action-btn info"
                    title="View Details"
                  >
                    ℹ️
                  </button>
                  <button 
                    className="action-btn warning"
                    title="Kick User"
                    onClick={() => handleKickUser(connection.username)}
                  >
                    👢
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {connections.length === 0 && (
            <div className="empty-connections">
              <div className="empty-icon">🔌</div>
              <h3>No Active Connections</h3>
              <p>Users will appear here when they connect to the SFTP server</p>
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