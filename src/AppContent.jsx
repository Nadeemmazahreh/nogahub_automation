import React from 'react';
import { useAuthContext } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import Header from './components/layout/Header';

/**
 * AppContent Component
 * Main application content that uses contexts
 * Separated from App.js to allow context consumption
 */
const AppContent = ({ children }) => {
  const { isAuthenticated, userRole, loginData, setLoginData, handleLogin, handleLogout, isLoading } = useAuthContext();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage
        loginData={loginData}
        setLoginData={setLoginData}
        onLogin={handleLogin}
      />
    );
  }

  // Authenticated view
  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
        <Header userRole={userRole} onLogout={handleLogout} />
        {children}
      </div>
    </div>
  );
};

export default AppContent;
