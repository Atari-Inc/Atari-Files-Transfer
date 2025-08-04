import React, { useState, useEffect } from 'react';
import { formatFileSize, formatTimeAgo, getFileIcon } from '../../utils';
import { dashboardAPI, apiHelpers } from '../../utils/api';
import './Dashboard.css';

const Dashboard = ({ user, onNotification }) => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransfers: 0,
    recentTransfers: 0,
    todayActivity: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load dashboard data from API
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch dashboard stats
      const statsResponse = await dashboardAPI.getStats();
      setStats(statsResponse.data.stats);
      
      // Fetch recent activity
      const activityResponse = await dashboardAPI.getRecentActivity();
      setRecentActivity(activityResponse.data.activities);
      
    } catch (error) {
      const errorMessage = apiHelpers.handleError(error, 'Failed to load dashboard data');
      setError(errorMessage);
      onNotification?.(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  if (error) {
    return (
      <div className="dashboard-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Dashboard</h3>
          <p>{error}</p>
          <button 
            className="retry-button" 
            onClick={loadDashboardData}
          >
            Try Again
          </button>
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
              Welcome back, {user?.firstName || user?.username || 'User'}! 👋
            </h1>
            <p className="welcome-subtitle">
              Here's what's happening with your files today
            </p>
          </div>
          <div className="user-badge">
            <div className="user-avatar-lg">
              {user?.firstName ? user.firstName[0].toUpperCase() : user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">
                {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username || 'User'}
              </span>
              <span className="user-role-badge">{user?.role || 'user'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalUsers.toLocaleString()}</h3>
            <p className="stat-label">Total Users</p>
          </div>
          <div className="stat-trend positive">
            <span className="trend-icon">✅</span>
            <span className="trend-text">{stats.activeUsers} active</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">📤</div>
          <div className="stat-content">
            <h3 className="stat-number">{stats.totalTransfers.toLocaleString()}</h3>
            <p className="stat-label">Total Transfers</p>
          </div>
          <div className="stat-trend">
            <span className="trend-icon">📊</span>
            <span className="trend-text">{stats.recentTransfers} recent</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <h3 className="stat-number">{recentActivity.length}</h3>
            <p className="stat-label">Recent Activities</p>
          </div>
          <div className="stat-trend">
            <span className="trend-icon">🔧</span>
            <span className="trend-text">Logged</span>
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

        {/* Recent Activity */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <p className="section-subtitle">Latest system activities and user actions</p>
          </div>
          <div className="recent-activity-list">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <div key={activity.id || index} className="activity-item">
                  <div className="activity-icon-wrapper">
                    <span className="activity-icon">
                      {activity.action === 'login' ? '🔐' : 
                       activity.action === 'password_change' ? '🔑' :
                       activity.action === 'login_failed' ? '❌' : 
                       '📝'}
                    </span>
                  </div>
                  <div className="activity-details">
                    <h4 className="activity-description">
                      {activity.username} {activity.action === 'login' ? 'logged in' :
                       activity.action === 'password_change' ? 'changed password' :
                       activity.action === 'login_failed' ? 'failed to log in' :
                       activity.action}
                    </h4>
                    <div className="activity-meta">
                      <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                      {activity.ipAddress && (
                        <>
                          <span className="activity-separator">•</span>
                          <span className="activity-ip">🌐 {activity.ipAddress}</span>
                        </>
                      )}
                      {activity.resourceType && (
                        <>
                          <span className="activity-separator">•</span>
                          <span className="activity-resource">🔧 {activity.resourceType}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="activity-status">
                    <span className={`status-badge ${activity.details?.success !== false ? 'success' : 'error'}`}>
                      {activity.details?.success !== false ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <span className="no-activity-icon">📋</span>
                <p>No recent activity to display</p>
              </div>
            )}
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
              <div className="status-label">Database</div>
              <div className="status-value success">Connected</div>
            </div>
            <div className="status-item">
              <div className="status-label">Active Users</div>
              <div className="status-value">{stats.activeUsers}</div>
            </div>
            <div className="status-item">
              <div className="status-label">Total Users</div>
              <div className="status-value">{stats.totalUsers}</div>
            </div>
            <div className="status-item">
              <div className="status-label">Server Load</div>
              <div className="status-value success">Normal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;