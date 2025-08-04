import React from 'react';
import { NAVIGATION_ITEMS, USER_ROLES } from '../../constants';
import './Sidebar.css';

const Sidebar = ({ 
  user, 
  activePage, 
  setActivePage, 
  collapsed 
}) => {
  const renderNavItem = (item) => (
    <li key={item.id}>
      <button
        className={`nav-item ${activePage === item.id ? "active" : ""}`}
        onClick={() => setActivePage(item.id)}
        data-tooltip={item.tooltip}
        aria-label={item.tooltip}
      >
        <span className="nav-icon">{item.icon}</span>
        <span className="nav-text">{item.label}</span>
      </button>
    </li>
  );

  return (
    <nav className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-content">
        <div className="nav-section">
          <h3 className="nav-section-title">
            <span>Main Navigation</span>
          </h3>
          <ul className="nav-list">
            {NAVIGATION_ITEMS.MAIN.map(renderNavItem)}
          </ul>
        </div>

        {user.role === USER_ROLES.ADMIN && (
          <div className="nav-section">
            <h3 className="nav-section-title">
              <span>Administration</span>
            </h3>
            <ul className="nav-list">
              {NAVIGATION_ITEMS.ADMIN.map(renderNavItem)}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Sidebar;