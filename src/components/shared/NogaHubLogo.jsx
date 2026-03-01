import React from 'react';
import logoImage from '../../logo-no-background.png';

/**
 * NogaHub Logo Component
 * Displays the company logo with configurable size
 */
const NogaHubLogo = ({ size = 100, className = "" }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src={logoImage}
      alt="NogaHub Logo"
      width={size}
      height={size}
      className="mr-3 object-contain"
    />
  </div>
);

export default NogaHubLogo;
