import React, { useMemo } from 'react';
import { LogIn } from 'lucide-react';
import NogaHubLogo from '../shared/NogaHubLogo';

/**
 * LoginPage Component
 * Handles user authentication
 */
const LoginPage = ({ loginData, setLoginData, onLogin }) => {
  // Memoize logo size based on window width
  const logoSize = useMemo(() =>
    window.innerWidth < 640 ? 80 : 120,
    []
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-8 w-full max-w-md border border-gray-100">
        <div className="text-center mb-6 sm:mb-8">
          <NogaHubLogo size={logoSize} className="justify-center mb-3 sm:mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Nogahub Administration
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Deep Sound Technical Consultations
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={loginData.username}
              onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-base"
              placeholder="Enter email address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 sm:px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-black focus:border-black transition-all text-base"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors duration-200 font-medium text-sm sm:text-base"
          >
            <LogIn size={18} />
            <span>Login</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
