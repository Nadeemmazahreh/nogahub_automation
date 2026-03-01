import React, { useMemo } from 'react';
import { LogOut } from 'lucide-react';
import NogaHubLogo from '../shared/NogaHubLogo';

/**
 * Header Component
 * Displays app header with logo, user info, and logout button
 */
const Header = ({ userRole, onLogout }) => {
  // Memoize logo size based on window width
  const logoSize = useMemo(() =>
    window.innerWidth < 640 ? 60 : 80,
    []
  );

  return (
    <div className="border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div className="flex items-center">
          <NogaHubLogo size={logoSize} />
          <div className="ml-3 sm:ml-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
              Nogahub Administration
            </h1>
            <p className="text-xs sm:text-base text-gray-600 mt-1">
              Welcome, {userRole === 'admin' ? 'Administrator' : 'User'} | Deep Sound Technical Consultations
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-sm sm:text-base self-end sm:self-auto"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Header;
