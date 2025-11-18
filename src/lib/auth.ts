// Authentication service for TAYA
// Full implementation with org/team context

import type { AuthUser, User } from '@/types';
import { UserService } from './services/UserService';
import { TeamService } from './services/TeamService';

const AUTH_USER_KEY = 'taya-auth-user';

export class AuthService {
  /**
   * Sign in with email and password
   * Note: Password hashing/verification should be done server-side via API endpoint
   * @param email User email
   * @param password User password (plain text - will be hashed server-side)
   * @returns AuthUser with org/team context
   */
  static async signIn(email: string, password: string): Promise<AuthUser> {
    // In a real implementation, this would call a server-side API endpoint
    // that handles password verification (hashing comparison)
    // For now, we'll structure it to work with a server API

    try {
      // Call server-side authentication endpoint
      // This endpoint should:
      // 1. Verify password hash
      // 2. Return user data if valid
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const userData = await response.json();

      // Get user with full details
      const user = await UserService.getUser(userData.userId);
      if (!user || !user.active) {
        throw new Error('User not found or inactive');
      }

      // Get user's teams
      const userTeams = await UserService.getUserTeams(user.id);
      const teams = await Promise.all(
        userTeams.map(async (ut) => {
          const team = await TeamService.getTeam(ut.team_id);
          return {
            teamId: ut.team_id,
            role: ut.role,
            name: team?.name || 'Unknown Team',
          };
        })
      );

      // Build AuthUser object
      const authUser: AuthUser = {
        uid: user.id,
        email: user.email,
        displayName: user.name,
        userId: user.id,
        organizationId: user.organization_id,
        teams,
        currentTeamId: teams.length > 0 ? teams[0].teamId : undefined,
        role: user.role,
      };

      // Store in session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
      }

      // Trigger auth state change
      this.notifyAuthStateChange(authUser);

      return authUser;
    } catch (error) {
      // Fallback: For development, you might want to implement a mock
      // In production, this should always use the server API
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(AUTH_USER_KEY);

      // Call server-side signout endpoint if needed
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
        });
      } catch (error) {
        // Ignore errors on signout
        console.warn('Signout API call failed:', error);
      }

      // Notify auth state change
      this.notifyAuthStateChange(null);
    }
  }

  /**
   * Get current authenticated user
   * @returns AuthUser or null if not authenticated
   */
  static getCurrentUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = sessionStorage.getItem(AUTH_USER_KEY);
      if (!stored) return null;

      const authUser = JSON.parse(stored) as AuthUser;

      // Verify user still exists and is active
      // In a real app, you might want to refresh this periodically
      return authUser;
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   * @returns True if authenticated
   */
  static isAuthenticated(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Require authentication (throws if not authenticated)
   * @returns AuthUser
   */
  static requireAuth(): AuthUser {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  /**
   * Refresh current user data from server
   * @returns Updated AuthUser or null
   */
  static async refreshUser(): Promise<AuthUser | null> {
    const current = this.getCurrentUser();
    if (!current) {
      return null;
    }

    try {
      const user = await UserService.getUser(current.userId);
      if (!user || !user.active) {
        await this.signOut();
        return null;
      }

      // Get updated teams
      const userTeams = await UserService.getUserTeams(user.id);
      const teams = await Promise.all(
        userTeams.map(async (ut) => {
          const team = await TeamService.getTeam(ut.team_id);
          return {
            teamId: ut.team_id,
            role: ut.role,
            name: team?.name || 'Unknown Team',
          };
        })
      );

      const authUser: AuthUser = {
        uid: user.id,
        email: user.email,
        displayName: user.name,
        userId: user.id,
        organizationId: user.organization_id,
        teams,
        currentTeamId: current.currentTeamId || (teams.length > 0 ? teams[0].teamId : undefined),
        role: user.role,
      };

      // Update session
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser));
      }

      this.notifyAuthStateChange(authUser);
      return authUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }

  /**
   * Set current team context
   * @param teamId Team ID
   */
  static setCurrentTeam(teamId: string): void {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Verify user belongs to this team
    const belongsToTeam = user.teams.some((t) => t.teamId === teamId);
    if (!belongsToTeam) {
      throw new Error('User does not belong to this team');
    }

    const updatedUser: AuthUser = {
      ...user,
      currentTeamId: teamId,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
    }

    this.notifyAuthStateChange(updatedUser);
  }

  /**
   * Get current team ID
   * @returns Team ID or undefined
   */
  static getCurrentTeamId(): string | undefined {
    const user = this.getCurrentUser();
    return user?.currentTeamId;
  }

  // Auth state change listeners
  private static listeners: Set<(user: AuthUser | null) => void> = new Set();

  /**
   * Subscribe to auth state changes
   * @param callback Callback function
   * @returns Unsubscribe function
   */
  static onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);

    // Immediately call with current user
    callback(this.getCurrentUser());

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private static notifyAuthStateChange(user: AuthUser | null): void {
    this.listeners.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        console.error('Error in auth state change listener:', error);
      }
    });
  }
}

// Legacy export for backward compatibility
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  return AuthService.onAuthStateChange(callback);
}
