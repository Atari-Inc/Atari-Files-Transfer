import { useState, useCallback } from 'react';
import { generateId } from '../utils';
import { NOTIFICATION_TYPES } from '../constants';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  // Add notification
  const addNotification = useCallback((message, type = NOTIFICATION_TYPES.INFO, duration = 5000) => {
    const id = generateId();
    const notification = {
      id,
      message,
      type,
      timestamp: new Date().toISOString(),
    };

    setNotifications(prev => [...prev, notification]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, duration) => 
    addNotification(message, NOTIFICATION_TYPES.SUCCESS, duration), [addNotification]);

  const error = useCallback((message, duration) => 
    addNotification(message, NOTIFICATION_TYPES.ERROR, duration), [addNotification]);

  const warning = useCallback((message, duration) => 
    addNotification(message, NOTIFICATION_TYPES.WARNING, duration), [addNotification]);

  const info = useCallback((message, duration) => 
    addNotification(message, NOTIFICATION_TYPES.INFO, duration), [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    success,
    error,
    warning,
    info,
  };
};