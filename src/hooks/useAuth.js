import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import apiService from '../services/api';

/**
 * Custom hook for authentication management
 * Handles login, logout, and auth state
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '', isSignup: false });
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (apiService.isAuthenticated()) {
        try {
          const profileResponse = await apiService.getProfile();
          setIsAuthenticated(true);
          setUserRole(profileResponse.user?.role || 'user');
        } catch (error) {
          console.error('Failed to fetch profile:', error);
          setIsAuthenticated(false);
          setUserRole(null);
        }
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    try {
      const response = await apiService.login({
        email: loginData.username,
        password: loginData.password
      });

      if (response.token && response.user) {
        setIsAuthenticated(true);
        setUserRole(response.user.role || 'user');
        toast.success(`Welcome back, ${response.user.username || 'User'}!`);
        return true;
      } else {
        toast.error('Login failed. Please check your credentials.');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
      return false;
    }
  }, [loginData]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUserRole(null);
      setLoginData({ username: '', password: '', isSignup: false });
      toast.success('Logged out successfully');
    }
  }, []);

  return {
    isAuthenticated,
    userRole,
    loginData,
    setLoginData,
    handleLogin,
    handleLogout,
    isLoading
  };
};
