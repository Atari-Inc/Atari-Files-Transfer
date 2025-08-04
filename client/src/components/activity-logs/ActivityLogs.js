import React, { useState, useEffect } from 'react';
import { formatTimeAgo } from '../../utils';
import './ActivityLogs.css';

const ActivityLogs = ({ user, onNotification }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('all');
  const [filterUser, setFilterUser] = useState('all');
  const [filterResource, setFilterResource] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [selectedLog, setSelectedLog] = useState(null);

  // Generate mock activity log data
  useEffect(() => {
    const generateMockLogs = () => {
      const actions = ['login', 'logout', 'create', 'update', 'delete', 'upload', 'download', 'access_denied', 'password_change', 'permission_change'];
      const users = ['admin', 'john_doe', 'jane_smith', 'mike_wilson', 'sarah_jones'];
      const resourceTypes = ['user', 'file', 'folder', 'system', 'authentication', 'permission'];
      const ipAddresses = ['192.168.1.100', '192.168.1.105', '10.0.0.50', '172.16.0.23', '192.168.1.200'];
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
      ];

      const mockData = [];
      
      for (let i = 0; i < 500; i++) {
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
        const action = actions[Math.floor(Math.random() * actions.length)];
        const username = users[Math.floor(Math.random() * users.length)];
        const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        
        let details = {};
        let resourceId = null;
        
        switch (action) {
          case 'login':
          case 'logout':
            details = { success: Math.random() > 0.1, method: 'web' };
            break;
          case 'create':
            if (resourceType === 'user') {
              details = { newUser: `user_${i}`, role: 'user' };
              resourceId = `user_${i}`;
            } else if (resourceType === 'folder') {
              details = { folderName: `folder_${i}`, permission: 'private' };
              resourceId = `folder_${i}`;
            } else {
              details = { fileName: `file_${i}.txt`, size: Math.floor(Math.random() * 10000000) };
              resourceId = `file_${i}`;
            }
            break;
          case 'upload':
          case 'download':
            details = { 
              fileName: `document_${i}.pdf`, 
              size: Math.floor(Math.random() * 50000000),
              path: `/uploads/document_${i}.pdf`
            };
            resourceId = `file_${i}`;
            break;
          case 'delete':
            details = { 
              deletedItem: resourceType === 'user' ? `user_${i}` : `file_${i}.txt`,
              permanent: Math.random() > 0.5
            };
            resourceId = resourceType === 'user' ? `user_${i}` : `file_${i}`;
            break;
          case 'update':
            if (resourceType === 'user') {
              details = { updatedFields: ['email', 'role'], newRole: 'admin' };
              resourceId = username;
            } else {
              details = { fileName: `file_${i}.txt`, changes: ['permissions', 'name'] };
              resourceId = `file_${i}`;
            }
            break;
          case 'access_denied':
            details = { 
              requestedResource: `/admin/users`, 
              reason: 'insufficient_permissions',
              userRole: 'user'
            };
            break;
          case 'password_change':
            details = { success: Math.random() > 0.05, method: 'self_service' };
            resourceId = username;
            break;
          case 'permission_change':
            details = { 
              targetUser: users[Math.floor(Math.random() * users.length)],
              oldRole: 'user',
              newRole: 'admin'
            };
            break;
          default:
            details = { action: action };
        }

        mockData.push({
          id: i + 1,
          userId: Math.floor(Math.random() * 100) + 1,
          username: username,
          action: action,
          resourceType: resourceType,
          resourceId: resourceId,
          details: JSON.stringify(details),
          ipAddress: ipAddresses[Math.floor(Math.random() * ipAddresses.length)],
          userAgent: userAgents[Math.floor(Math.random() * userAgents.length)],
          timestamp: timestamp,
          severity: getSeverity(action),
          success: action !== 'access_denied' ? (Math.random() > 0.05) : false
        });
      }

      return mockData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const getSeverity = (action) => {
      switch (action) {
        case 'delete':
        case 'access_denied':
          return 'high';
        case 'permission_change':
        case 'password_change':
        case 'create':
          return 'medium';
        default:
          return 'low';
      }
    };

    setTimeout(() => {
      setLogs(generateMockLogs());
      setLoading(false);
    }, 1000);
  }, []);

  // Filter logs based on criteria
  const filteredLogs = logs.filter(log => {
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.username === filterUser;
    const matchesResource = filterResource === 'all' || log.resourceType === filterResource;
    const matchesSearch = searchTerm === '' || 
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resourceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.resourceId && log.resourceId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Date range filter
    const now = new Date();
    let cutoffDate;
    switch (dateRange) {
      case '1d':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }
    const matchesDate = new Date(log.timestamp) >= cutoffDate;

    return matchesAction && matchesUser && matchesResource && matchesSearch && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  const getActionIcon = (action) => {
    switch (action) {
      case 'login': return '🔓';
      case 'logout': return '🔒';
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'upload': return '⬆️';
      case 'download': return '⬇️';
      case 'access_denied': return '🚫';
      case 'password_change': return '🔑';
      case 'permission_change': return '👑';
      default: return '📋';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'var(--error-color)';
      case 'medium': return 'var(--warning-color)';
      case 'low': return 'var(--success-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getActionColor = (action, success) => {
    if (!success) return 'var(--error-color)';
    
    switch (action) {
      case 'delete':
      case 'access_denied':
        return 'var(--error-color)';
      case 'create':
      case 'upload':
        return 'var(--success-color)';
      case 'update':
      case 'permission_change':
        return 'var(--warning-color)';
      default:
        return 'var(--primary-color)';
    }
  };

  const formatDetails = (detailsString) => {
    try {
      const details = JSON.parse(detailsString);
      return Object.entries(details).map(([key, value]) => (
        <div key={key} className="detail-item">
          <span className="detail-key">{key.replace(/_/g, ' ')}:</span>
          <span className="detail-value">{String(value)}</span>
        </div>
      ));
    } catch {
      return <span>{detailsString}</span>;
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'IP Address', 'Success', 'Details'],
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.username,
        log.action,
        log.resourceType,
        log.resourceId || '',
        log.ipAddress,
        log.success ? 'Yes' : 'No',
        log.details
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    onNotification('Activity logs exported successfully', 'success');
  };

  // Get unique users and actions for filters
  const uniqueUsers = [...new Set(logs.map(log => log.username))];
  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueResources = [...new Set(logs.map(log => log.resourceType))];

  if (loading) {
    return (
      <div className="logs-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="activity-logs">
      <div className="logs-header">
        <div className="header-info">
          <h2>Activity Logs</h2>
          <p>System activity monitoring and audit trails</p>
        </div>
        
        <div className="header-actions">
          <button className="export-button" onClick={exportLogs}>
            📊 Export CSV
          </button>
        </div>
      </div>

      <div className="logs-stats">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <span className="stat-number">{filteredLogs.length}</span>
            <span className="stat-label">Total Events</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-number">{new Set(filteredLogs.map(l => l.username)).size}</span>
            <span className="stat-label">Active Users</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-number">{filteredLogs.filter(l => !l.success).length}</span>
            <span className="stat-label">Failed Events</span>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🚨</div>
          <div className="stat-info">
            <span className="stat-number">{filteredLogs.filter(l => l.severity === 'high').length}</span>
            <span className="stat-label">High Severity</span>
          </div>
        </div>
      </div>

      <div className="logs-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
        
        <div className="filters">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="all">All Actions</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action.replace('_', ' ')}</option>
            ))}
          </select>
          
          <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
            <option value="all">All Users</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
          
          <select value={filterResource} onChange={(e) => setFilterResource(e.target.value)}>
            <option value="all">All Resources</option>
            {uniqueResources.map(resource => (
              <option key={resource} value={resource}>{resource}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="logs-table-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Resource</th>
              <th>IP Address</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.map(log => (
              <tr key={log.id} className={`log-row ${!log.success ? 'failed' : ''}`}>
                <td className="timestamp-cell">
                  <div className="timestamp">
                    {log.timestamp.toLocaleDateString()}
                  </div>
                  <div className="time">
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </td>
                
                <td className="user-cell">
                  <div className="user-info">
                    <span className="username">{log.username}</span>
                    <span className="user-id">ID: {log.userId}</span>
                  </div>
                </td>
                
                <td className="action-cell">
                  <div className="action-info">
                    <span className="action-icon">{getActionIcon(log.action)}</span>
                    <span 
                      className="action-text"
                      style={{ color: getActionColor(log.action, log.success) }}
                    >
                      {log.action.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                
                <td className="resource-cell">
                  <div className="resource-info">
                    <span className="resource-type">{log.resourceType}</span>
                    {log.resourceId && (
                      <span className="resource-id">{log.resourceId}</span>
                    )}
                  </div>
                </td>
                
                <td className="ip-cell">
                  <code>{log.ipAddress}</code>
                </td>
                
                <td className="status-cell">
                  <span className={`status-badge ${log.success ? 'success' : 'failed'}`}>
                    {log.success ? '✅ Success' : '❌ Failed'}
                  </span>
                </td>
                
                <td className="severity-cell">
                  <span 
                    className="severity-badge"
                    style={{ backgroundColor: getSeverityColor(log.severity) }}
                  >
                    {log.severity}
                  </span>
                </td>
                
                <td className="details-cell">
                  <button
                    className="details-button"
                    onClick={() => setSelectedLog(log)}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {paginatedLogs.length === 0 && (
          <div className="empty-logs">
            <div className="empty-icon">📋</div>
            <h3>No Activity Logs Found</h3>
            <p>No logs match your current filters</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages} ({filteredLogs.length} total)
          </span>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Activity Log Details</h3>
              <button 
                className="close-btn"
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-content">
              <div className="log-detail-grid">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-item">
                    <span className="detail-key">Timestamp:</span>
                    <span className="detail-value">{selectedLog.timestamp.toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">User:</span>
                    <span className="detail-value">{selectedLog.username} (ID: {selectedLog.userId})</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">Action:</span>
                    <span className="detail-value">
                      {getActionIcon(selectedLog.action)} {selectedLog.action.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">Resource:</span>
                    <span className="detail-value">
                      {selectedLog.resourceType} {selectedLog.resourceId && `(${selectedLog.resourceId})`}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">Status:</span>
                    <span className="detail-value">
                      {selectedLog.success ? '✅ Success' : '❌ Failed'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">Severity:</span>
                    <span 
                      className="detail-value severity-badge"
                      style={{ backgroundColor: getSeverityColor(selectedLog.severity) }}
                    >
                      {selectedLog.severity}
                    </span>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Technical Details</h4>
                  <div className="detail-item">
                    <span className="detail-key">IP Address:</span>
                    <span className="detail-value"><code>{selectedLog.ipAddress}</code></span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-key">User Agent:</span>
                    <span className="detail-value"><code>{selectedLog.userAgent}</code></span>
                  </div>
                </div>
                
                <div className="detail-section full-width">
                  <h4>Additional Details</h4>
                  <div className="details-content">
                    {formatDetails(selectedLog.details)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogs;