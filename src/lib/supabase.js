/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for the NogaHub Automation app.
 * It replaces the previous Express backend with direct Supabase integration.
 */

import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Please set REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'nogahub-auth-token',
    storage: window.localStorage
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'nogahub-automation'
    }
  }
});

// Debug logging in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Supabase URL:', supabaseUrl);
  console.log('🔑 Supabase Key configured:', !!supabaseAnonKey);
}

/**
 * Database type definitions for TypeScript-like intellisense
 * These match the Supabase schema
 */
export const Tables = {
  USERS: 'users',
  EQUIPMENT: 'equipment',
  PROJECTS: 'projects'
};

/**
 * Helper function to handle Supabase errors consistently
 */
export const handleSupabaseError = (error) => {
  if (!error) return null;

  console.error('Supabase error:', error);

  // Map Supabase errors to user-friendly messages
  if (error.message?.includes('JWT')) {
    return 'Session expired. Please log in again.';
  }
  if (error.message?.includes('duplicate key')) {
    return 'This record already exists.';
  }
  if (error.message?.includes('foreign key')) {
    return 'Cannot delete: record is being used elsewhere.';
  }
  if (error.message?.includes('violates row-level security')) {
    return 'You do not have permission to perform this action.';
  }

  return error.message || 'An unexpected error occurred.';
};

/**
 * Get current authenticated user with profile data
 */
export const getCurrentUser = async () => {
  try {
    // Get session from Supabase Auth
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;
    if (!session) return null;

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from(Tables.USERS)
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError) throw profileError;

    return {
      ...session.user,
      profile
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Check if current user is an admin
 */
export const isAdmin = async () => {
  const user = await getCurrentUser();
  return user?.profile?.role === 'admin';
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      // Fetch user profile
      const { data: profile } = await supabase
        .from(Tables.USERS)
        .select('*')
        .eq('id', session.user.id)
        .single();

      callback(event, session, profile);
    } else {
      callback(event, null, null);
    }
  });
};

export default supabase;
