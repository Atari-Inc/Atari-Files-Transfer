import React, { useState, useEffect } from "react";
import { useAuth, useNotifications, useLocalStorage } from './hooks';
import { ROUTES, STORAGE_KEYS } from './constants';

// Layout Components
import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import Notifications from './components/common/Notifications';

// Page Components
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import FileManager from './components/file-manager/FileManager';
import ServerManager from './components/server-manager/ServerManager';
import UserManagement from './components/user-management/UserManagement';

// Import styles
import './styles/index.css';

function App() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  const { notifications, addNotification, removeNotification } = useNotifications();
  
  // UI State
  const [activePage, setActivePage] = useState(ROUTES.DASHBOARD);
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
  const [darkMode, setDarkMode] = useLocalStorage(STORAGE_KEYS.THEME, false);

  // Apply dark mode class to body
  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  // Event handlers
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogin = async (credentials) => {
    const result = await login(credentials);
    if (result.success) {
      addNotification("Login successful! Welcome back.", "success");
    } else {
      addNotification(result.error, "error");
    }
    return result;
  };

  const handleLogout = async () => {
    await logout();
    setActivePage(ROUTES.DASHBOARD);
    addNotification("You have been logged out.", "info");
  };

  // Show loading screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">
          <div className="spinner spinner-lg"></div>
          <p>Loading SecureTransfer...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Notifications 
          notifications={notifications} 
          onRemove={removeNotification} 
        />
      </>
    );
  }

  // Render page content based on active page
  const renderPageContent = () => {
    switch (activePage) {
      case ROUTES.DASHBOARD:
        return <Dashboard user={user} onNotification={addNotification} />;
      
      case ROUTES.FILE_MANAGER:
        return <FileManager user={user} onNotification={addNotification} />;
      
      case ROUTES.SERVER_MANAGER:
        return <ServerManager user={user} onNotification={addNotification} />;
      
      case ROUTES.TRANSFERS:
        return (
          <div className="page-content">
            <div className="page-header">
              <h2>Active Transfers</h2>
              <p>Monitor your file transfer operations</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">🚀</div>
              <h3>Transfer Monitor Coming Soon</h3>
              <p>Real-time transfer monitoring and progress tracking</p>
            </div>
          </div>
        );
      
      case ROUTES.USERS:
        return <UserManagement onNotification={addNotification} />;
      
      case ROUTES.FOLDERS:
        return (
          <div className="page-content">
            <div className="page-header">
              <h2>Folder Management</h2>
              <p>Configure shared folders and permissions</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">📂</div>
              <h3>Folder Administration</h3>
              <p>Manage shared directories and access controls</p>
            </div>
          </div>
        );
      
      case ROUTES.LOGS:
        return (
          <div className="page-content">
            <div className="page-header">
              <h2>Activity Logs</h2>
              <p>View system activity and audit trails</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">📋</div>
              <h3>Activity Monitoring</h3>
              <p>Comprehensive logging and audit trails</p>
            </div>
          </div>
        );
      
      case ROUTES.SETTINGS:
        return (
          <div className="page-content">
            <div className="page-header">
              <h2>System Settings</h2>
              <p>Configure application settings and preferences</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">⚙️</div>
              <h3>Settings Panel</h3>
              <p>System configuration and preferences</p>
            </div>
          </div>
        );
      
      default:
        return <Dashboard user={user} onNotification={addNotification} />;
    }
  };

  // Render main application
  return (
    <div className={`app ${darkMode ? "dark-mode" : ""}`}>
      {/* Notifications */}
      <Notifications 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      {/* Header */}
      <Header
        user={user}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        toggleSidebar={toggleSidebar}
        onLogout={handleLogout}
      />

      <div className="app-body">
        {/* Sidebar */}
        <Sidebar
          user={user}
          activePage={activePage}
          setActivePage={setActivePage}
          collapsed={sidebarCollapsed}
        />

        {/* Main Content */}
        <main className="main-content">
          <div className="content-container">
            {renderPageContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;