import React from 'react';
import './Header.css';

const Header = ({ 
  user, 
  darkMode, 
  toggleDarkMode, 
  toggleSidebar, 
  onLogout 
}) => {
  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle"
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
        >
          <span className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
        
        <div className="brand">
          <div className="brand-icon">🔐</div>
          <div className="brand-content">
            <h1 className="brand-title">SecureTransfer</h1>
            <span className="brand-subtitle">Enterprise SFTP</span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <div className="header-actions">
          <button 
            className="header-btn" 
            onClick={toggleDarkMode} 
            title="Toggle Dark Mode"
            aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
        </div>
        
        <div className="user-menu">
          <div className="user-info">
            <div className="user-avatar">
              {user.firstName ? user.firstName[0].toUpperCase() : user.username[0].toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
              </span>
              <span className="user-role">{user.role}</span>
            </div>
          </div>
          <button 
            className="logout-btn" 
            onClick={onLogout} 
            title="Logout"
            aria-label="Logout"
          >
            🚪
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;