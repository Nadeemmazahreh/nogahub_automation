/**
 * React Query Provider
 *
 * Wraps the app with QueryClientProvider for data caching and synchronization.
 * Optimizes API calls to Supabase by caching frequently accessed data.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long before data is considered stale
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time: how long to keep data in cache
      cacheTime: 10 * 60 * 1000, // 10 minutes

      // Retry failed requests
      retry: 1,

      // Refetch on window focus (useful for keeping data fresh)
      refetchOnWindowFocus: false,

      // Refetch on reconnect
      refetchOnReconnect: true,

      // Suspense mode (if needed)
      suspense: false
    },
    mutations: {
      // Retry failed mutations
      retry: 1
    }
  }
});

export const QueryProvider = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show React Query DevTools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };
export default QueryProvider;
