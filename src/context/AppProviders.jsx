import React from 'react';
import { AuthProvider } from './AuthContext';
import { EquipmentProvider } from './EquipmentContext';
import { ProjectProvider } from './ProjectContext';

/**
 * AppProviders Component
 * Wraps the app with all necessary context providers
 * Order matters: Auth -> Equipment -> Project (since Equipment and Project depend on Auth)
 */
export const AppProviders = ({ children }) => {
  return (
    <AuthProvider>
      <EquipmentProvider>
        <ProjectProvider>
          {children}
        </ProjectProvider>
      </EquipmentProvider>
    </AuthProvider>
  );
};
