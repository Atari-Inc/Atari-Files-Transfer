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
import UserSettings from './components/user-settings/UserSettings';
import Transfers from './components/transfers/Transfers';
import Folders from './components/folders/Folders';
import ActivityLogs from './components/activity-logs/ActivityLogs';

// Import styles
import './styles/index.css';

function App() {
  const { user, loading, login, logout, updateUser, isAuthenticated } = useAuth();
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

  // Role-based access control
  const hasAccess = (route) => {
    if (!user) return false;
    
    const adminOnlyRoutes = [ROUTES.USERS, ROUTES.SERVER_MANAGER, ROUTES.LOGS, ROUTES.FOLDERS];
    const userRoutes = [ROUTES.DASHBOARD, ROUTES.FILE_MANAGER, ROUTES.TRANSFERS, ROUTES.SETTINGS];
    
    if (user.role === 'admin') {
      return true; // Admin has access to everything
    }
    
    return userRoutes.includes(route);
  };

  // Render access denied page
  const renderAccessDenied = () => (
    <div className="page-content">
      <div className="access-denied">
        <div className="access-denied-icon">🚫</div>
        <h2>Access Denied</h2>
        <p>You don't have permission to access this page.</p>
        <p>Contact your administrator if you need access.</p>
        <button 
          className="back-btn"
          onClick={() => setActivePage(ROUTES.DASHBOARD)}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );

  // Render page content based on active page and user role
  const renderPageContent = () => {
    // Check access first
    if (!hasAccess(activePage)) {
      return renderAccessDenied();
    }

    switch (activePage) {
      case ROUTES.DASHBOARD:
        return <Dashboard user={user} onNotification={addNotification} />;
      
      case ROUTES.FILE_MANAGER:
        return <FileManager user={user} onNotification={addNotification} />;
      
      case ROUTES.SERVER_MANAGER:
        return <ServerManager user={user} onNotification={addNotification} />;
      
      case ROUTES.TRANSFERS:
        return <Transfers user={user} onNotification={addNotification} />;
      
      case ROUTES.USERS:
        return <UserManagement onNotification={addNotification} />;
      
      case ROUTES.FOLDERS:
        return <Folders user={user} onNotification={addNotification} />;
      
      case ROUTES.LOGS:
        return <ActivityLogs user={user} onNotification={addNotification} />;
      
      case ROUTES.SETTINGS:
        return (
          <UserSettings 
            user={user} 
            onNotification={addNotification}
            onUserUpdate={updateUser}
          />
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