import React, { createContext, useContext } from 'react';
import { useEquipment } from '../hooks/useEquipment';
import { useAuthContext } from './AuthContext';

const EquipmentContext = createContext(null);

export const EquipmentProvider = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const equipment = useEquipment(isAuthenticated);

  return (
    <EquipmentContext.Provider value={equipment}>
      {children}
    </EquipmentContext.Provider>
  );
};

export const useEquipmentContext = () => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error('useEquipmentContext must be used within EquipmentProvider');
  }
  return context;
};
