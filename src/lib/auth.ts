// Authentication service for TAYA
// This is a stub that will be fully implemented with org/team context

import type { AuthUser } from '@/types';

const AUTH_USER_KEY = 'taya-auth-user';

export class AuthService {
  static async signIn(email: string, password: string): Promise<AuthUser> {
    // TODO: Implement authentication with org/team context
    // This is a placeholder
    throw new Error('Authentication not yet implemented');
  }

  static async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_USER_KEY);
    }
  }

  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = sessionStorage.getItem(AUTH_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  static requireAuth(): AuthUser {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }
}

// Auth state change listener
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  // TODO: Implement auth state change listener
  return () => {};
}

