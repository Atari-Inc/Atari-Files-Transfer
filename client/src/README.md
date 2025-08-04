# Frontend Structure Documentation

This document describes the organized, modular structure of the SecureTransfer SFTP frontend application.

## 📁 Directory Structure

```
src/
├── components/           # React components organized by feature
│   ├── App.js           # Main application component
│   ├── auth/            # Authentication components
│   │   ├── Login.js
│   │   └── Login.css
│   ├── common/          # Reusable common components
│   │   ├── Notifications.js
│   │   └── Notifications.css
│   ├── dashboard/       # Dashboard page components
│   │   ├── Dashboard.js
│   │   └── Dashboard.css
│   ├── file-manager/    # File management components
│   │   ├── FileManager.js
│   │   └── FileManager.css
│   ├── layout/          # Layout components (Header, Sidebar)
│   │   ├── Header.js
│   │   ├── Header.css
│   │   ├── Sidebar.js
│   │   └── Sidebar.css
│   └── server-manager/  # Server administration components
│       ├── ServerManager.js
│       └── ServerManager.css
├── constants/           # Application constants and configuration
│   └── index.js        # All constants exported from here
├── hooks/              # Custom React hooks
│   ├── index.js        # Hook exports
│   ├── useAuth.js      # Authentication hook
│   ├── useNotifications.js # Notifications hook
│   └── useLocalStorage.js  # Local storage hook
├── styles/             # Global styles and CSS utilities
│   ├── index.css       # Main stylesheet (imports all others)
│   ├── variables.css   # CSS custom properties
│   ├── base.css        # Base styles and reset
│   └── components.css  # Common component styles
├── utils/              # Utility functions and helpers
│   ├── index.js        # General utilities
│   └── api.js          # API client and helpers
├── index.js            # Application entry point
└── README.md          # This documentation
```

## 🎯 Component Organization

### Layout Components (`components/layout/`)
- **Header.js**: Top navigation bar with branding and user menu
- **Sidebar.js**: Left navigation panel with route links

### Auth Components (`components/auth/`)
- **Login.js**: User authentication form with demo credentials

### Page Components
- **Dashboard.js**: Main dashboard with stats and recent activity
- **FileManager.js**: File browser and management interface
- **ServerManager.js**: SFTP server administration panel

### Common Components (`components/common/`)
- **Notifications.js**: Toast notification system

## 🎨 CSS Architecture

### Global Styles (`styles/`)
- **variables.css**: CSS custom properties for colors, spacing, etc.
- **base.css**: CSS reset, base styles, and utility classes
- **components.css**: Common component styles (buttons, forms, cards, etc.)
- **index.css**: Master stylesheet that imports all other CSS files

### Component-Specific Styles
Each component has its own CSS file co-located with the JavaScript file:
- Easy to maintain and debug
- Prevents style conflicts
- Clear ownership of styles

## ⚙️ Custom Hooks (`hooks/`)

### useAuth
Manages user authentication state, login/logout functionality, and token handling.

```javascript
const { user, loading, login, logout, isAuthenticated } = useAuth();
```

### useNotifications
Provides notification management with auto-dismiss and type variants.

```javascript
const { notifications, addNotification, removeNotification, success, error } = useNotifications();
```

### useLocalStorage
Syncs state with localStorage and handles cross-tab updates.

```javascript
const [value, setValue] = useLocalStorage('key', defaultValue);
```

## 📊 Constants (`constants/`)

Centralized configuration including:
- API endpoints and configuration
- User roles and permissions
- File type mappings and icons
- Navigation structure
- Application routes

## 🔧 Utilities (`utils/`)

### General Utilities (`utils/index.js`)
- File size formatting
- Date/time formatting
- File type detection
- Search and sorting helpers
- Storage management

### API Client (`utils/api.js`)
- Axios client with interceptors
- Authentication token handling
- API endpoint definitions
- Error handling utilities

## 🚀 Getting Started

### Import Patterns

**Components:**
```javascript
import Dashboard from '../dashboard/Dashboard';
import { useAuth, useNotifications } from '../hooks';
```

**Utilities:**
```javascript
import { formatFileSize, getFileIcon } from '../utils';
import { dashboardAPI } from '../utils/api';
```

**Constants:**
```javascript
import { ROUTES, USER_ROLES, FILE_ICONS } from '../constants';
```

### Styling
All styles are automatically imported through `src/styles/index.css`. Component-specific styles are imported within the main stylesheet.

### Adding New Components

1. Create component directory: `src/components/feature-name/`
2. Add `Component.js` and `Component.css`
3. Export from parent directory if needed
4. Import CSS in `src/styles/index.css`

### Adding New Utilities

1. Add to appropriate file in `src/utils/`
2. Export from `src/utils/index.js`
3. Import where needed

## 📱 Responsive Design

All components are built with mobile-first responsive design:
- Breakpoints: 480px, 768px, 1024px
- Flexible grid layouts
- Touch-friendly interactions
- Optimized for small screens

## 🎨 Design System

### Colors
Defined in `variables.css` with semantic naming:
- Primary/Secondary colors for branding
- Success/Warning/Error/Info for status
- Neutral grays for text and backgrounds

### Spacing
Consistent spacing scale: xs, sm, md, lg, xl, 2xl

### Typography
System font stack with appropriate weights and sizes

### Components
Reusable component classes for buttons, forms, cards, etc.

## 🔄 State Management

- **Local State**: React useState for component-specific state
- **Auth State**: Custom useAuth hook with localStorage persistence
- **Notifications**: Custom useNotifications hook
- **UI Preferences**: useLocalStorage hook for settings

## 🌙 Dark Mode

Dark mode support through CSS custom properties:
- Toggle handled by useLocalStorage hook
- Automatic system preference detection
- Smooth transitions between modes

This modular structure provides excellent developer experience, maintainability, and scalability for the SecureTransfer SFTP application.