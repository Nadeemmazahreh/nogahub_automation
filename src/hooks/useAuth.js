import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import * as simpleAuth from '../utils/simpleAuth';

/**
 * Custom hook for authentication management using simple env-based auth
 * No database lookups - validates against REACT_APP_USERS environment variable
 */
export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loginData, setLoginData] = useState({ username: '', password: '', isSignup: false });
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    console.log('🔍 Checking authentication status...');
    const currentUser = simpleAuth.getCurrentUser();

    if (currentUser) {
      console.log('✅ User already authenticated:', currentUser.email);
      setUser(currentUser);
      setUserRole(currentUser.role);
      setIsAuthenticated(true);
    } else {
      console.log('❌ No authenticated user found');
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
    }

    setIsLoading(false);
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login for:', loginData.username);

      const result = simpleAuth.login(loginData.username, loginData.password);

      if (result.success) {
        console.log('✅ Login successful:', result.user);
        setUser(result.user);
        setUserRole(result.user.role);
        setIsAuthenticated(true);
        toast.success(`Welcome back, ${result.user.username}!`);
        return true;
      } else {
        console.error('❌ Login failed:', result.error);
        toast.error(result.error || 'Invalid email or password');
        return false;
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      toast.error('Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loginData]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      simpleAuth.logout();
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      setLoginData({ username: '', password: '', isSignup: false });
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if something fails
      setIsAuthenticated(false);
      setUser(null);
      setUserRole(null);
      setLoginData({ username: '', password: '', isSignup: false });
      toast.error('Logout failed, but local session cleared');
    }
  }, []);

  // Handle signup (not implemented for simple auth)
  const handleSignup = useCallback(async (email, password, username) => {
    toast.error('Signup is not available. Please contact an administrator.');
    return false;
  }, []);

  return {
    isAuthenticated,
    user,
    userRole,
    loginData,
    setLoginData,
    handleLogin,
    handleLogout,
    handleSignup,
    isLoading
  };
};
