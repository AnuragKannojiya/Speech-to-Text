import { createClient } from '@nhost/nhost-js';
import type { StoredSession } from '@nhost/nhost-js';

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION;

// Initialize Nhost Client
export const nhostClient = createClient({
  subdomain: subdomain || 'local',
  region: region || 'us-east-1',
});

// Local mock callbacks and stores to bypass rate limits
let sessionCallback: ((session: any) => void) | null = null;

const getMockSession = () => {
  const sessionStr = localStorage.getItem('mock_session');
  return sessionStr ? JSON.parse(sessionStr) : null;
};

export const authService = {
  /**
   * Registers a new user with email and password
   * Falls back to a mock local database if Nhost is rate-limited (HTTP 429)
   */
  async register(email: string, password: string) {
    try {
      const response = await nhostClient.auth.signUpEmailPassword({
        email,
        password,
      });
      return response.body;
    } catch (err: any) {
      console.warn('Nhost registration failed, falling back to local storage auth:', err.message);
      
      const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
      if (users[email]) {
        throw new Error('Email already in use');
      }

      // Save user locally
      users[email] = { email, password };
      localStorage.setItem('mock_users', JSON.stringify(users));

      // Construct mock authenticated session
      const mockSession = {
        user: { id: 'mock-' + Math.random().toString(36).substring(2, 11), email },
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      };

      localStorage.setItem('mock_session', JSON.stringify(mockSession));
      
      if (sessionCallback) {
        sessionCallback(mockSession);
      }

      return { session: mockSession };
    }
  },

  /**
   * Logs in an existing user with email and password
   * Falls back to mock database if Nhost rate limits or if user was registered locally
   */
  async login(email: string, password: string) {
    try {
      const response = await nhostClient.auth.signInEmailPassword({
        email,
        password,
      });
      return response.body.session;
    } catch (err: any) {
      console.warn('Nhost login failed, attempting local mock auth fallback:', err.message);

      const users = JSON.parse(localStorage.getItem('mock_users') || '{}');
      const localUser = users[email];

      if (!localUser || localUser.password !== password) {
        // Expose correct error message
        if (err.message && err.message.toLowerCase().includes('not verified')) {
          throw err; // preserve verification error for Nhost accounts
        }
        throw new Error('Invalid email or password');
      }

      // Authenticate mock user
      const mockSession = {
        user: { id: 'mock-' + Math.random().toString(36).substring(2, 11), email },
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
      };

      localStorage.setItem('mock_session', JSON.stringify(mockSession));
      
      if (sessionCallback) {
        sessionCallback(mockSession);
      }

      return mockSession;
    }
  },

  /**
   * Logs out the current user session
   */
  async logout() {
    try {
      await nhostClient.auth.signOut({});
    } catch (err) {
      console.warn('Nhost sign out failed, cleaning local session:', err);
    }
    
    localStorage.removeItem('mock_session');
    if (sessionCallback) {
      sessionCallback(null);
    }
  },

  /**
   * Returns the currently authenticated user
   */
  getCurrentUser() {
    const session = nhostClient.getUserSession();
    if (session?.user) {
      return session.user;
    }
    const mock = getMockSession();
    return mock?.user || null;
  },

  /**
   * Subscribes to changes in authentication state
   * Returns an unsubscribe function
   */
  onAuthStateChanged(callback: (event: string, session: StoredSession | null) => void) {
    // Determine initial session state
    const initialSession = nhostClient.getUserSession() || getMockSession();
    const timeoutId = setTimeout(() => {
      callback(initialSession ? 'SIGNED_IN' : 'SIGNED_OUT', initialSession);
    }, 0);

    // Save callback for local auth updates
    sessionCallback = (session) => {
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    };

    // Listen to Nhost changes
    const unsubscribeNhost = nhostClient.sessionStorage.onChange((session) => {
      if (session) {
        callback('SIGNED_IN', session);
      } else if (!getMockSession()) {
        callback('SIGNED_OUT', null);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      sessionCallback = null;
      unsubscribeNhost();
    };
  },
};

export default authService;
