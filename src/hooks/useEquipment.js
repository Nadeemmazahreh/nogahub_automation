import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

/**
 * Custom hook for equipment data management
 * Handles loading and caching equipment from API
 */
export const useEquipment = (isAuthenticated) => {
  const [equipmentDatabase, setEquipmentDatabase] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);

  // Load equipment data from API
  const loadEquipmentData = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    try {
      setEquipmentLoading(true);

      // Validate token first
      const isValidToken = await apiService.validateToken();
      if (!isValidToken) {
        window.location.href = '/login';
        return;
      }

      const response = await apiService.getEquipment({ limit: 1000 });
      setEquipmentDatabase(response.equipment || []);
    } catch (error) {
      console.error('Failed to load equipment:', error);

      if (error.message.includes('Authentication') || error.message.includes('token')) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to load equipment data');
      }
      setEquipmentDatabase([]);
    } finally {
      setEquipmentLoading(false);
    }
  }, []);

  // Load equipment when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadEquipmentData();
    }
  }, [isAuthenticated, loadEquipmentData]);

  return {
    equipmentDatabase,
    equipmentLoading,
    loadEquipmentData,
    setEquipmentDatabase
  };
};
