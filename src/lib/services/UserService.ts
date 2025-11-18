// User Service - Full Implementation
// Handles user CRUD operations with hierarchy support

import type { User, UserTeam, UserRole } from '@/types';
import { supabase } from '../supabase';
import { TeamService } from './TeamService';

export class UserService {
  /**
   * Create a new user
   * @param email User email (must be unique)
   * @param name User name
   * @param orgId Organization ID
   * @param role User role
   * @param passwordHash Pre-hashed password (hashing should be done server-side)
   * @returns Created user
   */
  static async createUser(
    email: string,
    name: string,
    orgId: string,
    role: UserRole,
    passwordHash?: string
  ): Promise<User> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        name,
        organization_id: orgId,
        role,
        password_hash: passwordHash || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Invite user to a team (creates user if doesn't exist, adds to team)
   * @param email User email
   * @param teamId Team ID
   * @param role Team role (primary_manager, co_manager, lead, member)
   * @param name Optional user name (required if user doesn't exist)
   * @param userRole Optional user role (defaults to 'member')
   * @returns User (created or existing)
   */
  static async inviteUser(
    email: string,
    teamId: string,
    role: 'primary_manager' | 'co_manager' | 'lead' | 'member',
    name?: string,
    userRole: UserRole = 'member'
  ): Promise<User> {
    // Get team to find organization
    const team = await TeamService.getTeam(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Check if user exists
    let user = await this.getUserByEmail(email);

    if (!user) {
      // Create user if doesn't exist
      if (!name) {
        throw new Error('Name is required when creating a new user');
      }
      user = await this.createUser(email, name, team.organization_id, userRole);
    } else {
      // Verify user belongs to same organization
      if (user.organization_id !== team.organization_id) {
        throw new Error('User belongs to a different organization');
      }
    }

    // Add user to team
    try {
      await TeamService.addMemberToTeam(teamId, user.id, role);
    } catch (error) {
      // If user is already in team, that's okay
      if (!(error instanceof Error && error.message.includes('already a member'))) {
        throw error;
      }
    }

    return user;
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User or null if not found
   */
  static async getUser(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get user by email
   * @param email User email
   * @returns User or null if not found
   */
  static async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data as User;
  }

  /**
   * Get all users in an organization
   * @param orgId Organization ID
   * @param activeOnly Only return active users
   * @returns Array of users
   */
  static async getUsersByOrganization(orgId: string, activeOnly: boolean = true): Promise<User[]> {
    let query = supabase
      .from('users')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get organization users: ${error.message}`);
    }

    return (data || []) as User[];
  }

  /**
   * Get all users in a team
   * @param teamId Team ID
   * @returns Array of users
   */
  static async getUsersByTeam(teamId: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select(`
        user_id,
        users(*)
      `)
      .eq('team_id', teamId);

    if (error) {
      throw new Error(`Failed to get team users: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Extract users from the joined data
    return data
      .map((item: { users: User }) => item.users)
      .filter((user: User | null) => user !== null && user.active) as User[];
  }

  /**
   * Update user
   * @param userId User ID
   * @param data Partial user data to update
   * @returns Updated user
   */
  static async updateUser(userId: string, data: Partial<User>): Promise<User> {
    // Don't allow updating ID or organization_id
    const { id, organization_id, ...updateData } = data;

    // If email is being updated, validate and check uniqueness
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        throw new Error('Invalid email format');
      }

      updateData.email = updateData.email.toLowerCase();

      // Check if email already exists (excluding current user)
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', userId)
        .single();

      if (existing) {
        throw new Error('User with this email already exists');
      }
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return updated as User;
  }

  /**
   * Deactivate user (soft delete)
   * @param userId User ID
   */
  static async deactivateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to deactivate user: ${error.message}`);
    }
  }

  /**
   * Activate user
   * @param userId User ID
   */
  static async activateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to activate user: ${error.message}`);
    }
  }

  /**
   * Get all teams a user belongs to
   * @param userId User ID
   * @returns Array of user_team relationships
   */
  static async getUserTeams(userId: string): Promise<UserTeam[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', userId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get user teams: ${error.message}`);
    }

    return (data || []) as UserTeam[];
  }

  /**
   * Update user password hash
   * @param userId User ID
   * @param passwordHash Pre-hashed password
   */
  static async updatePassword(userId: string, passwordHash: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw new Error(`Failed to update password: ${error.message}`);
    }
  }

  /**
   * Get users by role in organization
   * @param orgId Organization ID
   * @param role User role
   * @returns Array of users
   */
  static async getUsersByRole(orgId: string, role: UserRole): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', orgId)
      .eq('role', role)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get users by role: ${error.message}`);
    }

    return (data || []) as User[];
  }

  /**
   * Search users in organization
   * @param orgId Organization ID
   * @param searchTerm Search term (searches name and email)
   * @returns Array of users
   */
  static async searchUsers(orgId: string, searchTerm: string): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', orgId)
      .eq('active', true)
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }

    return (data || []) as User[];
  }
}
