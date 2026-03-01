/**
 * Web Vitals Performance Monitoring
 * Tracks and reports Core Web Vitals metrics for performance optimization
 */

import { getCLS, getFCP, getFID, getLCP, getTTFB } from 'web-vitals';

/**
 * Report Web Vitals metrics
 * @param {Function} onPerfEntry - Callback function to handle performance entries
 */
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Cumulative Layout Shift (CLS)
    // Measures visual stability - should be < 0.1
    getCLS(onPerfEntry);

    // First Contentful Paint (FCP)
    // Measures when first content is painted - should be < 1.8s
    getFCP(onPerfEntry);

    // First Input Delay (FID)
    // Measures interactivity - should be < 100ms
    getFID(onPerfEntry);

    // Largest Contentful Paint (LCP)
    // Measures loading performance - should be < 2.5s
    getLCP(onPerfEntry);

    // Time to First Byte (TTFB)
    // Measures server response time - should be < 800ms
    getTTFB(onPerfEntry);
  }
};

/**
 * Log Web Vitals to console (development only)
 */
export const logWebVitals = () => {
  if (process.env.NODE_ENV === 'development') {
    reportWebVitals((metric) => {
      console.log(`[Web Vitals] ${metric.name}:`, {
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
      });
    });
  }
};

/**
 * Send Web Vitals to analytics endpoint
 * You can customize this to send to Google Analytics, Vercel Analytics, etc.
 */
export const sendToAnalytics = (metric) => {
  // Example: Send to Google Analytics
  // if (window.gtag) {
  //   window.gtag('event', metric.name, {
  //     event_category: 'Web Vitals',
  //     value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
  //     event_label: metric.id,
  //     non_interaction: true,
  //   });
  // }

  // Example: Send to custom analytics endpoint
  // fetch('/api/analytics', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     metric: metric.name,
  //     value: metric.value,
  //     rating: metric.rating,
  //     timestamp: Date.now(),
  //   }),
  // });

  // For now, just log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals Analytics] ${metric.name}:`, metric.value, metric.rating);
  }
};

export default reportWebVitals;
