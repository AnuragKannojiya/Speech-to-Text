import { createClient } from '@nhost/nhost-js';
import type { StoredSession } from '@nhost/nhost-js';

const subdomain = import.meta.env.VITE_NHOST_SUBDOMAIN;
const region = import.meta.env.VITE_NHOST_REGION;

// Validate config and warn if missing (avoid crash but handle edge case)
if (!subdomain || subdomain === 'your-nhost-subdomain' || !region || region === 'your-region') {
  console.warn(
    'Nhost configuration is missing or using placeholder values. Authentication will not function correctly until VITE_NHOST_SUBDOMAIN and VITE_NHOST_REGION are set in .env'
  );
}

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
    // Notify about the initial state in next event loop tick to allow caller hook setup
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
