import { useState, useEffect, useCallback } from 'react';
import { getStorageItem, setStorageItem } from '../utils';

export const useLocalStorage = (key, defaultValue = null) => {
  // Get initial value from localStorage or use default
  const [value, setValue] = useState(() => {
    return getStorageItem(key, defaultValue);
  });

  // Update localStorage when value changes
  const setStoredValue = useCallback((newValue) => {
    try {
      // Allow value to be a function for functional updates
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      setStorageItem(key, valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value]);

  // Listen for changes to this key in other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setStoredValue];
};