import React, { useState, useEffect } from 'react';
import { formatFileSize, formatTimeAgo } from '../../utils';
import './Transfers.css';

const Transfers = ({ user, onNotification }) => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('started_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Generate mock transfer data
  useEffect(() => {
    const generateMockTransfers = () => {
      const mockData = [];
      const statuses = ['completed', 'in_progress', 'failed', 'queued'];
      const types = ['upload', 'download'];
      const files = [
        'project-backup.zip',
        'presentation.pptx',
        'database-dump.sql',
        'images.tar.gz',
        'report.pdf',
        'video-conference.mp4',
        'spreadsheet.xlsx',
        'source-code.zip',
        'documentation.docx',
        'application.log'
      ];

      for (let i = 0; i < 25; i++) {
        const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const fileName = files[Math.floor(Math.random() * files.length)];
        const fileSize = Math.floor(Math.random() * 500000000) + 1000000; // 1MB to 500MB
        
        let progress = 100;
        let completedTime = null;
        if (status === 'in_progress') {
          progress = Math.floor(Math.random() * 90) + 10;
        } else if (status === 'completed') {
          completedTime = new Date(startTime.getTime() + Math.random() * 3600000);
        } else if (status === 'queued') {
          progress = 0;
        } else if (status === 'failed') {
          progress = Math.floor(Math.random() * 80) + 10;
        }

        mockData.push({
          id: i + 1,
          filename: fileName,
          type: type,
          status: status,
          progress: progress,
          fileSize: fileSize,
          transferred: Math.floor((fileSize * progress) / 100),
          startedAt: startTime,
          completedAt: completedTime,
          errorMessage: status === 'failed' ? 'Connection timeout' : null,
          speed: status === 'in_progress' ? Math.floor(Math.random() * 10000000) + 100000 : null,
          estimatedTime: status === 'in_progress' ? Math.floor(Math.random() * 600) + 30 : null,
          source: type === 'upload' ? 'Local' : 'S3 Bucket',
          destination: type === 'upload' ? 'S3 Bucket' : 'Local'
        });
      }

      return mockData.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
    };

    setTimeout(() => {
      setTransfers(generateMockTransfers());
      setLoading(false);
    }, 1000);
  }, []);

  // Filter and sort transfers
  const filteredTransfers = transfers
    .filter(transfer => {
      if (filterStatus !== 'all' && transfer.status !== filterStatus) return false;
      if (filterType !== 'all' && transfer.type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'filename':
          aValue = a.filename.toLowerCase();
          bValue = b.filename.toLowerCase();
          break;
        case 'size':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'started_at':
          aValue = new Date(a.startedAt);
          bValue = new Date(b.startedAt);
          break;
        case 'progress':
          aValue = a.progress;
          bValue = b.progress;
          break;
        default:
          aValue = new Date(a.startedAt);
          bValue = new Date(b.startedAt);
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '🔄';
      case 'failed': return '❌';
      case 'queued': return '⏳';
      default: return '📄';
    }
  };

  const getTypeIcon = (type) => {
    return type === 'upload' ? '⬆️' : '⬇️';
  };

  const formatSpeed = (speed) => {
    if (!speed) return '';
    if (speed < 1024) return `${speed} B/s`;
    if (speed < 1024 * 1024) return `${(speed / 1024).toFixed(1)} KB/s`;
    return `${(speed / (1024 * 1024)).toFixed(1)} MB/s`;
  };

  const formatEstimatedTime = (seconds) => {
    if (!seconds) return '';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const handleRetry = (transferId) => {
    onNotification(`Retrying transfer ${transferId}...`, 'info');
    setTransfers(prev => prev.map(t => 
      t.id === transferId 
        ? { ...t, status: 'queued', progress: 0, errorMessage: null }
        : t
    ));
  };

  const handleCancel = (transferId) => {
    onNotification(`Transfer ${transferId} cancelled`, 'warning');
    setTransfers(prev => prev.filter(t => t.id !== transferId));
  };

  if (loading) {
    return (
      <div className="transfers-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading transfers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="transfers">
      <div className="transfers-header">
        <div className="header-info">
          <h2>File Transfers</h2>
          <p>Monitor and manage your file transfer operations</p>
        </div>
        
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-info">
              <span className="stat-number">{transfers.filter(t => t.status === 'in_progress').length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="stat-number">{transfers.filter(t => t.status === 'completed').length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-info">
              <span className="stat-number">{transfers.filter(t => t.status === 'failed').length}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="transfers-controls">
        <div className="filters">
          <div className="filter-group">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="queued">Queued</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="upload">Upload</option>
              <option value="download">Download</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="started_at">Start Time</option>
              <option value="filename">Filename</option>
              <option value="size">File Size</option>
              <option value="progress">Progress</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Order:</label>
            <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="transfers-list">
        {filteredTransfers.map(transfer => (
          <div key={transfer.id} className={`transfer-item ${transfer.status}`}>
            <div className="transfer-info">
              <div className="transfer-file">
                <div className="file-icon">
                  {getTypeIcon(transfer.type)}
                </div>
                <div className="file-details">
                  <div className="file-name">{transfer.filename}</div>
                  <div className="file-meta">
                    {formatFileSize(transfer.fileSize)} • {transfer.type}
                  </div>
                </div>
              </div>
              
              <div className="transfer-status">
                <div className="status-header">
                  <span className="status-icon">{getStatusIcon(transfer.status)}</span>
                  <span className="status-text">{transfer.status.replace('_', ' ')}</span>
                </div>
                
                {transfer.status === 'in_progress' && (
                  <div className="progress-container">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ width: `${transfer.progress}%` }}
                      ></div>
                    </div>
                    <span className="progress-text">{transfer.progress}%</span>
                  </div>
                )}
                
                {transfer.status === 'completed' && transfer.completedAt && (
                  <div className="completion-time">
                    Completed {formatTimeAgo(transfer.completedAt)}
                  </div>
                )}
                
                {transfer.status === 'failed' && transfer.errorMessage && (
                  <div className="error-message">
                    Error: {transfer.errorMessage}
                  </div>
                )}
              </div>
              
              <div className="transfer-details">
                <div className="detail-row">
                  <span className="detail-label">Started:</span>
                  <span className="detail-value">{formatTimeAgo(transfer.startedAt)}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Transferred:</span>
                  <span className="detail-value">
                    {formatFileSize(transfer.transferred)} of {formatFileSize(transfer.fileSize)}
                  </span>
                </div>
                
                {transfer.speed && (
                  <div className="detail-row">
                    <span className="detail-label">Speed:</span>
                    <span className="detail-value">{formatSpeed(transfer.speed)}</span>
                  </div>
                )}
                
                {transfer.estimatedTime && (
                  <div className="detail-row">
                    <span className="detail-label">ETA:</span>
                    <span className="detail-value">{formatEstimatedTime(transfer.estimatedTime)}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="transfer-actions">
              {transfer.status === 'failed' && (
                <button 
                  className="action-btn retry"
                  onClick={() => handleRetry(transfer.id)}
                >
                  Retry
                </button>
              )}
              
              {(transfer.status === 'in_progress' || transfer.status === 'queued') && (
                <button 
                  className="action-btn cancel"
                  onClick={() => handleCancel(transfer.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
        
        {filteredTransfers.length === 0 && (
          <div className="empty-transfers">
            <div className="empty-icon">⚡</div>
            <h3>No Transfers Found</h3>
            <p>No file transfers match your current filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transfers;