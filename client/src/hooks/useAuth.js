import { useState, useEffect, useCallback } from 'react';
import { authAPI, apiHelpers } from '../utils/api';
import { STORAGE_KEYS } from '../constants';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const token = getStorageItem(STORAGE_KEYS.TOKEN);
      
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.me();
      setUser(response.data);
      setStorageItem(STORAGE_KEYS.USER, response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      removeStorageItem(STORAGE_KEYS.TOKEN);
      removeStorageItem(STORAGE_KEYS.USER);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(credentials);
      const { access_token, user: userData } = response.data;
      
      setStorageItem(STORAGE_KEYS.TOKEN, access_token);
      setStorageItem(STORAGE_KEYS.USER, userData);
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      const errorMessage = apiHelpers.handleError(error, 'Login failed');
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      removeStorageItem(STORAGE_KEYS.TOKEN);
      removeStorageItem(STORAGE_KEYS.USER);
      setUser(null);
    }
  }, []);

  // Update user data
  const updateUser = useCallback((userData) => {
    setUser(userData);
    setStorageItem(STORAGE_KEYS.USER, userData);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    login,
    logout,
    updateUser,
    clearError,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };
};