/**
 * Simple Environment-Based Authentication
 *
 * Authenticates users against credentials stored in REACT_APP_USERS environment variable
 * Format: email:password:role,email:password:role,...
 *
 * This approach:
 * - Works consistently in dev and production (Vercel)
 * - No database lookups needed
 * - Simple and fast
 * - Perfect for small fixed set of users
 */

const SESSION_KEY = 'nogahub_auth_session';

/**
 * Parse users from environment variable
 */
function parseUsers() {
  const usersEnv = process.env.REACT_APP_USERS;

  if (!usersEnv) {
    console.error('⚠️  REACT_APP_USERS not configured in environment');
    return [];
  }

  try {
    return usersEnv.split(',').map(userStr => {
      const [email, password, role] = userStr.split(':');
      const username = email.split('@')[0]; // Extract username from email

      return {
        email: email.trim(),
        password: password.trim(),
        role: role.trim() || 'user',
        username: username.charAt(0).toUpperCase() + username.slice(1) // Capitalize
      };
    });
  } catch (error) {
    console.error('❌ Error parsing REACT_APP_USERS:', error);
    return [];
  }
}

/**
 * Authenticate user with email and password
 */
export function login(email, password) {
  const users = parseUsers();

  const user = users.find(u =>
    u.email.toLowerCase() === email.toLowerCase() &&
    u.password === password
  );

  if (user) {
    // Store session
    const session = {
      email: user.email,
      username: user.username,
      role: user.role,
      timestamp: Date.now()
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return {
      success: true,
      user: {
        email: user.email,
        username: user.username,
        role: user.role
      }
    };
  }

  return {
    success: false,
    error: 'Invalid email or password'
  };
}

/**
 * Logout current user
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  return { success: true };
}

/**
 * Get current authenticated user
 */
export function getCurrentUser() {
  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    console.log('📦 [getCurrentUser] Session data from storage:', sessionData ? 'Found' : 'Not found');

    if (!sessionData) {
      console.warn('⚠️  [getCurrentUser] No session data in sessionStorage');
      return null;
    }

    const session = JSON.parse(sessionData);
    console.log('📝 [getCurrentUser] Parsed session:', { email: session.email, username: session.username });

    // Optional: Check if session is expired (e.g., 24 hours)
    const sessionAge = Date.now() - session.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (sessionAge > maxAge) {
      console.warn('⏱️  [getCurrentUser] Session expired');
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    console.log('✅ [getCurrentUser] Returning valid session');
    return {
      email: session.email,
      username: session.username,
      role: session.role
    };
  } catch (error) {
    console.error('❌ Error reading session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated() {
  return getCurrentUser() !== null;
}
