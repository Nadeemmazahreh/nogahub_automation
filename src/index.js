import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals, { sendToAnalytics } from './reportWebVitals';
import { QueryProvider } from './providers/QueryProvider';
import { AuthProvider } from './context/AuthContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <QueryProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryProvider>
  </React.StrictMode>
);

// Report Web Vitals for performance monitoring
reportWebVitals(sendToAnalytics);

