import { createClient } from '@nhost/nhost-js';
import type { StoredSession } from '@nhost/nhost-js';

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION;

// Initialize pure Nhost Client
export const nhostClient = createClient({
  subdomain: subdomain || 'local',
  region: region || 'us-east-1',
});

export const authService = {
  /**
   * Registers a new user with email and password
   */
  async register(email: string, password: string) {
    try {
      const response = await nhostClient.auth.signUpEmailPassword({
        email,
        password,
        options: {
          redirectTo: window.location.origin + '/login',
        },
      });
      return response.body;
    } catch (err: any) {
      console.error('Nhost registration error body:', err.body);
      throw new Error(err.body?.message || err.message || 'Registration failed');
    }
  },

  /**
   * Logs in an existing user with email and password
   */
  async login(email: string, password: string) {
    try {
      const response = await nhostClient.auth.signInEmailPassword({
        email,
        password,
      });
      return response.body.session;
    } catch (err: any) {
      console.error('Nhost login error body:', err.body);
      throw new Error(err.body?.message || err.message || 'Login failed');
    }
  },

  /**
   * Logs out the current user session
   */
  async logout() {
    try {
      await nhostClient.auth.signOut({});
    } catch (err: any) {
      console.error('Nhost sign out failed:', err);
      throw new Error(err.message || 'Sign out failed');
    }
  },

  /**
   * Returns the currently authenticated user
   */
  getCurrentUser() {
    const session = nhostClient.getUserSession();
    return session?.user || null;
  },

  /**
   * Subscribes to changes in authentication state
   * Returns an unsubscribe function
   */
  onAuthStateChanged(callback: (event: string, session: StoredSession | null) => void) {
    const initialSession = nhostClient.getUserSession();
    const timeoutId = setTimeout(() => {
      callback(initialSession ? 'SIGNED_IN' : 'SIGNED_OUT', initialSession);
    }, 0);

    const unsubscribe = nhostClient.sessionStorage.onChange((session) => {
      callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  },
};

export default authService;
