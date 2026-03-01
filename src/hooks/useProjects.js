import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

/**
 * Custom hook for project management
 * Handles loading, saving, and deleting projects
 */
export const useProjects = () => {
  const [savedProjects, setSavedProjects] = useState([]);

  // Load saved projects from backend
  const loadSavedProjects = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    try {
      const response = await apiService.getProjects();
      setSavedProjects(response.projects || []);
    } catch (error) {
      console.error('Failed to load saved projects:', error);
      setSavedProjects([]);
    }
  }, []);

  // Save project
  const saveProject = useCallback(async (projectData) => {
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to save projects.');
      return false;
    }

    try {
      const response = await apiService.saveProject(projectData);
      await loadSavedProjects();
      toast.success(response.message || 'Project saved successfully!');
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('Failed to save project. Please try again.');
      return false;
    }
  }, [loadSavedProjects]);

  // Delete project
  const deleteProject = useCallback(async (projectId) => {
    if (!apiService.isAuthenticated()) {
      toast.error('Please log in to delete projects.');
      return false;
    }

    try {
      await apiService.deleteProject(projectId);
      toast.success('Project deleted successfully');
      await loadSavedProjects();
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('Failed to delete project. Please try again.');
      return false;
    }
  }, [loadSavedProjects]);

  return {
    savedProjects,
    loadSavedProjects,
    saveProject,
    deleteProject,
    setSavedProjects
  };
};
