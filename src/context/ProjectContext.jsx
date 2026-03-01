import React, { createContext, useContext, useEffect } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useAuthContext } from './AuthContext';

const ProjectContext = createContext(null);

export const ProjectProvider = ({ children }) => {
  const { isAuthenticated } = useAuthContext();
  const projects = useProjects();

  // Load projects when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      projects.loadSavedProjects();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ProjectContext.Provider value={projects}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
};
