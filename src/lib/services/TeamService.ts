// Team Service - Full Implementation
// Handles team CRUD operations with multi-manager support

import type { Team, UserTeam } from '@/types';
import { supabase } from '../supabase';

export class TeamService {
  /**
   * Create a new team
   * @param orgId Organization ID
   * @param name Team name
   * @param managerId Optional primary manager ID
   * @param description Optional team description
   * @param settings Optional settings object
   * @returns Created team
   */
  static async createTeam(
    orgId: string,
    name: string,
    managerId?: string,
    description?: string,
    settings?: Record<string, unknown>
  ): Promise<Team> {
    // Check if team name already exists in organization
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('organization_id', orgId)
      .eq('name', name)
      .single();

    if (existing) {
      throw new Error('Team name already exists in this organization');
    }

    // Create team
    const { data, error } = await supabase
      .from('teams')
      .insert({
        organization_id: orgId,
        name,
        description,
        manager_id: managerId || null,
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create team: ${error.message}`);
    }

    // If managerId provided, add them as primary_manager in user_teams
    if (managerId) {
      await this.addMemberToTeam(data.id, managerId, 'primary_manager');
    }

    return data as Team;
  }

  /**
   * Get team by ID
   * @param teamId Team ID
   * @returns Team or null if not found
   */
  static async getTeam(teamId: string): Promise<Team | null> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get team: ${error.message}`);
    }

    return data as Team;
  }

  /**
   * Get all teams in an organization
   * @param orgId Organization ID
   * @returns Array of teams
   */
  static async getTeamsByOrganization(orgId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get teams: ${error.message}`);
    }

    return (data || []) as Team[];
  }

  /**
   * Get all teams managed by a user
   * @param managerId Manager user ID
   * @returns Array of teams
   */
  static async getTeamsByManager(managerId: string): Promise<Team[]> {
    // Get teams where user is manager_id or in user_teams as manager
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .or(`manager_id.eq.${managerId},id.in.(
        SELECT team_id FROM user_teams 
        WHERE user_id = '${managerId}' 
        AND role IN ('primary_manager', 'co_manager')
      )`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get manager teams: ${error.message}`);
    }

    return (data || []) as Team[];
  }

  /**
   * Update team
   * @param teamId Team ID
   * @param data Partial team data to update
   * @returns Updated team
   */
  static async updateTeam(teamId: string, data: Partial<Team>): Promise<Team> {
    // Don't allow updating ID
    const { id, organization_id, ...updateData } = data;

    // If name is being updated, check for duplicates
    if (updateData.name) {
      // Get current team to check org
      const currentTeam = await this.getTeam(teamId);
      if (!currentTeam) {
        throw new Error('Team not found');
      }

      const { data: existing } = await supabase
        .from('teams')
        .select('id')
        .eq('organization_id', currentTeam.organization_id)
        .eq('name', updateData.name)
        .neq('id', teamId)
        .single();

      if (existing) {
        throw new Error('Team name already exists in this organization');
      }
    }

    const { data: updated, error } = await supabase
      .from('teams')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update team: ${error.message}`);
    }

    return updated as Team;
  }

  /**
   * Delete team (cascade deletes all related data)
   * @param teamId Team ID
   */
  static async deleteTeam(teamId: string): Promise<void> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      throw new Error(`Failed to delete team: ${error.message}`);
    }
  }

  /**
   * Add member to team
   * @param teamId Team ID
   * @param userId User ID
   * @param role Team role (primary_manager, co_manager, lead, member)
   * @param reportsTo Optional user ID this member reports to
   * @param permissions Optional custom permissions
   * @returns Created user_team relationship
   */
  static async addMemberToTeam(
    teamId: string,
    userId: string,
    role: 'primary_manager' | 'co_manager' | 'lead' | 'member',
    reportsTo?: string,
    permissions?: Record<string, unknown>
  ): Promise<UserTeam> {
    // Check if user is already in team
    const { data: existing } = await supabase
      .from('user_teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already a member of this team');
    }

    // Verify team exists and get organization
    const team = await this.getTeam(teamId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Verify user belongs to same organization
    const { data: user } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!user || user.organization_id !== team.organization_id) {
      throw new Error('User does not belong to the same organization as the team');
    }

    // Default permissions based on role
    const defaultPermissions = {
      can_edit_tasks: role !== 'member',
      can_approve_leaves: role === 'primary_manager' || role === 'co_manager',
      can_view_analytics: role !== 'member',
      can_manage_members: role === 'primary_manager',
      can_allocate_resources: role === 'primary_manager' || role === 'co_manager',
    };

    const { data, error } = await supabase
      .from('user_teams')
      .insert({
        user_id: userId,
        team_id: teamId,
        role,
        reports_to: reportsTo || null,
        permissions: permissions || defaultPermissions,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add member to team: ${error.message}`);
    }

    return data as UserTeam;
  }

  /**
   * Remove member from team
   * @param teamId Team ID
   * @param userId User ID
   */
  static async removeMemberFromTeam(teamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_teams')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member from team: ${error.message}`);
    }
  }

  /**
   * Get all team members
   * @param teamId Team ID
   * @returns Array of user_team relationships
   */
  static async getTeamMembers(teamId: string): Promise<UserTeam[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    return (data || []) as UserTeam[];
  }

  /**
   * Get team members with user details
   * @param teamId Team ID
   * @returns Array of user_team relationships with user data
   */
  static async getTeamMembersWithUsers(teamId: string): Promise<(UserTeam & { user: { id: string; name: string; email: string; role: string } })[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select(`
        *,
        user:users!user_teams_user_id_fkey(id, name, email, role)
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    return (data || []) as (UserTeam & { user: { id: string; name: string; email: string; role: string } })[];
  }

  /**
   * Update team member role
   * @param teamId Team ID
   * @param userId User ID
   * @param role New role
   * @param permissions Optional updated permissions
   * @returns Updated user_team relationship
   */
  static async updateMemberRole(
    teamId: string,
    userId: string,
    role: 'primary_manager' | 'co_manager' | 'lead' | 'member',
    permissions?: Record<string, unknown>
  ): Promise<UserTeam> {
    const updateData: Partial<UserTeam> = { role };
    if (permissions) {
      updateData.permissions = permissions;
    }

    const { data, error } = await supabase
      .from('user_teams')
      .update(updateData)
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    return data as UserTeam;
  }

  /**
   * Get teams where user is a member
   * @param userId User ID
   * @returns Array of teams
   */
  static async getTeamsByUser(userId: string): Promise<Team[]> {
    const { data, error } = await supabase
      .from('user_teams')
      .select(`
        team_id,
        teams(*)
      `)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get user teams: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Extract teams from the joined data
    return data
      .map((item: { teams: Team }) => item.teams)
      .filter((team: Team | null) => team !== null) as Team[];
  }
}
