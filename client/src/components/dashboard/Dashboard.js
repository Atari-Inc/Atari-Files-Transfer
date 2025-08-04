import React, { useState, useEffect } from 'react';
import { formatFileSize, formatTimeAgo, getFileIcon } from '../../utils';
import './Dashboard.css';

const Dashboard = ({ user, onNotification }) => {
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    totalFolders: 0,
    recentUploads: 0,
    todayActivity: 0
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemStatus] = useState({
    status: "operational",
    uptime: "99.9%",
    lastBackup: new Date().toISOString(),
    activeUsers: 12
  });

  // Generate mock data (replace with real API calls)
  const generateMockStats = () => ({
    totalFiles: Math.floor(Math.random() * 500) + 100,
    totalSize: Math.floor(Math.random() * 10000000000) + 1000000000,
    totalFolders: Math.floor(Math.random() * 20) + 5,
    recentUploads: Math.floor(Math.random() * 10) + 1,
    todayActivity: Math.floor(Math.random() * 50) + 10
  });

  const generateMockRecentFiles = () => [
    {
      name: "project-documentation.pdf",
      size: 2458765,
      type: "pdf",
      uploadedAt: new Date(Date.now() - 3600000).toISOString(),
      folder: "documents"
    },
    {
      name: "design-assets.zip",
      size: 15678234,
      type: "zip",
      uploadedAt: new Date(Date.now() - 7200000).toISOString(),
      folder: "design"
    },
    {
      name: "database-backup.sql",
      size: 45678901,
      type: "sql",
      uploadedAt: new Date(Date.now() - 10800000).toISOString(),
      folder: "backups"
    },
    {
      name: "meeting-recording.mp4",
      size: 156789012,
      type: "mp4",
      uploadedAt: new Date(Date.now() - 14400000).toISOString(),
      folder: "media"
    }
  ];

  useEffect(() => {
    const loadDashboardData = () => {
      setLoading(true);
      
      // Simulate API call delay
      setTimeout(() => {
        setStats(generateMockStats());
        setRecentFiles(generateMockRecentFiles());
        setLoading(false);
      }, 1000);
    };

    loadDashboardData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <div className="welcome-content">
            <h1 className="welcome-title">
              Welcome back, {user.firstName || user.username}! 👋
            </h1>
            <p className="welcome-subtitle">
              Here's what's happening with your files today
            </p>
          </div>
          <div className="user-badge">
            <div className="user-avatar-lg">
              {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </span>
              <span className="user-role-badge">{user.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalFiles.toLocaleString()}</h3>
            <p className="stat-label">Total Files</p>
          </div>
          <div className="stat-trend positive">
            <span className="trend-icon">📈</span>
            <span className="trend-text">+{stats.recentUploads} today</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">💾</div>
          <div className="stat-content">
            <h3 className="stat-number">{formatFileSize(stats.totalSize)}</h3>
            <p className="stat-label">Storage Used</p>
          </div>
          <div className="stat-trend">
            <span className="trend-icon">📊</span>
            <span className="trend-text">75% capacity</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalFolders}</h3>
            <p className="stat-label">Folders</p>
          </div>
          <div className="stat-trend">
            <span className="trend-icon">🔧</span>
            <span className="trend-text">Organized</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.todayActivity}</h3>
            <p className="stat-label">Today's Activity</p>
          </div>
          <div className="stat-trend positive">
            <span className="trend-icon">🔥</span>
            <span className="trend-text">Very active</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Quick Actions */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
            <p className="section-subtitle">Common tasks and shortcuts</p>
          </div>
          <div className="quick-actions-grid">
            <button className="action-card upload">
              <div className="action-icon">📤</div>
              <div className="action-content">
                <h3>Upload Files</h3>
                <p>Add new files to your folders</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card folder">
              <div className="action-icon">📁</div>
              <div className="action-content">
                <h3>Browse Files</h3>
                <p>Navigate your file structure</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card share">
              <div className="action-icon">🔗</div>
              <div className="action-content">
                <h3>Share Files</h3>
                <p>Generate secure sharing links</p>
              </div>
              <div className="action-arrow">→</div>
            </button>

            <button className="action-card settings">
              <div className="action-icon">⚙️</div>
              <div className="action-content">
                <h3>Settings</h3>
                <p>Manage your preferences</p>
              </div>
              <div className="action-arrow">→</div>
            </button>
          </div>
        </div>

        {/* Recent Files */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent Files</h2>
            <p className="section-subtitle">Your recently uploaded files</p>
          </div>
          <div className="recent-files-list">
            {recentFiles.map((file, index) => (
              <div key={index} className="recent-file-item">
                <div className="file-icon-wrapper">
                  <span className="file-icon-large">{getFileIcon(file.name)}</span>
                </div>
                <div className="file-details">
                  <h4 className="file-name">{file.name}</h4>
                  <div className="file-meta">
                    <span className="file-size">{formatFileSize(file.size)}</span>
                    <span className="file-separator">•</span>
                    <span className="file-folder">📁 {file.folder}</span>
                    <span className="file-separator">•</span>
                    <span className="file-time">{formatTimeAgo(file.uploadedAt)}</span>
                  </div>
                </div>
                <div className="file-actions">
                  <button className="action-btn" title="Download">
                    <span>⬇️</span>
                  </button>
                  <button className="action-btn" title="Share">
                    <span>🔗</span>
                  </button>
                  <button className="action-btn" title="More">
                    <span>⋯</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="dashboard-section status-section">
          <div className="section-header">
            <h2 className="section-title">System Status</h2>
            <div className="status-indicator operational">
              <div className="status-dot"></div>
              <span>All systems operational</span>
            </div>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <div className="status-label">Uptime</div>
              <div className="status-value success">{systemStatus.uptime}</div>
            </div>
            <div className="status-item">
              <div className="status-label">Last Backup</div>
              <div className="status-value">2 hours ago</div>
            </div>
            <div className="status-item">
              <div className="status-label">Active Users</div>
              <div className="status-value">{systemStatus.activeUsers}</div>
            </div>
            <div className="status-item">
              <div className="status-label">Server Load</div>
              <div className="status-value success">Normal</div>
            </div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Storage Usage</h2>
            <p className="section-subtitle">Your current storage utilization</p>
          </div>
          <div className="storage-card">
            <div className="storage-visual">
              <div className="storage-chart">
                <div className="storage-used" style={{width: '75%'}}></div>
              </div>
              <div className="storage-info">
                <div className="storage-stats">
                  <div className="storage-stat">
                    <span className="storage-label">Used</span>
                    <span className="storage-value">{formatFileSize(stats.totalSize)}</span>
                  </div>
                  <div className="storage-stat">
                    <span className="storage-label">Total</span>
                    <span className="storage-value">10 GB</span>
                  </div>
                </div>
                <div className="storage-percentage">75% used</div>
              </div>
            </div>
            {stats.totalSize > 8000000000 && (
              <div className="storage-warning">
                <span className="warning-icon">⚠️</span>
                <span>Storage is getting full. Consider archiving old files.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;