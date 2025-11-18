// Hierarchy Service - Full Implementation
// Handles management hierarchy, org charts, and reporting chain

import type { ManagementHierarchy, User } from '@/types';
import { supabase } from '../supabase';
import { UserService } from './UserService';

export class HierarchyService {
  /**
   * Assign a manager to manage a user
   * @param managerId Manager user ID
   * @param managesUserId User ID to be managed
   * @param teamId Optional team ID for team-scoped management
   * @param scope Management scope ('team' or 'org_wide')
   * @param delegatedPermissions Optional delegated permissions
   * @returns Created management hierarchy relationship
   */
  static async assignManager(
    managerId: string,
    managesUserId: string,
    teamId?: string,
    scope: 'team' | 'org_wide' = 'team',
    delegatedPermissions?: Record<string, unknown>
  ): Promise<ManagementHierarchy> {
    // Prevent self-management
    if (managerId === managesUserId) {
      throw new Error('User cannot manage themselves');
    }

    // Get both users to verify they're in the same organization
    const manager = await UserService.getUser(managerId);
    const managedUser = await UserService.getUser(managesUserId);

    if (!manager || !managedUser) {
      throw new Error('Manager or managed user not found');
    }

    if (manager.organization_id !== managedUser.organization_id) {
      throw new Error('Manager and user must be in the same organization');
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('management_hierarchy')
      .select('id')
      .eq('manager_id', managerId)
      .eq('manages_user_id', managesUserId)
      .eq('team_id', teamId || null)
      .eq('scope', scope)
      .eq('active', true)
      .single();

    if (existing) {
      throw new Error('Management relationship already exists');
    }

    // Calculate level (1 for direct, higher for indirect)
    const level = await this.calculateManagementLevel(managerId, managesUserId);

    const { data, error } = await supabase
      .from('management_hierarchy')
      .insert({
        organization_id: manager.organization_id,
        manager_id: managerId,
        manages_user_id: managesUserId,
        team_id: teamId || null,
        scope,
        level,
        delegated_permissions: delegatedPermissions || {},
        active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to assign manager: ${error.message}`);
    }

    return data as ManagementHierarchy;
  }

  /**
   * Remove a management relationship
   * @param managerId Manager user ID
   * @param managesUserId User ID being managed
   * @param teamId Optional team ID
   */
  static async removeManager(
    managerId: string,
    managesUserId: string,
    teamId?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('management_hierarchy')
      .update({
        active: false,
        ended_at: new Date().toISOString(),
      })
      .eq('manager_id', managerId)
      .eq('manages_user_id', managesUserId)
      .eq('team_id', teamId || null)
      .eq('active', true);

    if (error) {
      throw new Error(`Failed to remove manager: ${error.message}`);
    }
  }

  /**
   * Get direct reports of a manager
   * @param managerId Manager user ID
   * @param teamId Optional team ID to filter by team
   * @returns Array of directly managed users
   */
  static async getDirectReports(managerId: string, teamId?: string): Promise<User[]> {
    let query = supabase
      .from('management_hierarchy')
      .select(`
        manages_user_id,
        users!management_hierarchy_manages_user_id_fkey(*)
      `)
      .eq('manager_id', managerId)
      .eq('active', true)
      .eq('level', 1);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get direct reports: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .map((item: { users: User }) => item.users)
      .filter((user: User | null) => user !== null && user.active) as User[];
  }

  /**
   * Get all reports (direct and indirect) of a manager recursively
   * @param managerId Manager user ID
   * @returns Array of all managed users
   */
  static async getAllReports(managerId: string): Promise<User[]> {
    // This is a recursive query - we'll use a recursive CTE approach
    // First, get all direct reports
    const directReports = await this.getDirectReports(managerId);
    const allReports = new Set<string>();
    const reportUsers: User[] = [...directReports];

    // Add direct reports to set
    directReports.forEach((user) => allReports.add(user.id));

    // Recursively get indirect reports
    for (const report of directReports) {
      const indirectReports = await this.getAllReports(report.id);
      for (const indirect of indirectReports) {
        if (!allReports.has(indirect.id)) {
          allReports.add(indirect.id);
          reportUsers.push(indirect);
        }
      }
    }

    return reportUsers;
  }

  /**
   * Get organization chart (all management relationships)
   * @param orgId Organization ID
   * @returns Array of management hierarchy relationships
   */
  static async getOrgChart(orgId: string): Promise<ManagementHierarchy[]> {
    const { data, error } = await supabase
      .from('management_hierarchy')
      .select('*')
      .eq('organization_id', orgId)
      .eq('active', true)
      .order('level', { ascending: true })
      .order('started_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get org chart: ${error.message}`);
    }

    return (data || []) as ManagementHierarchy[];
  }

  /**
   * Get management chain (all managers up the hierarchy)
   * @param userId User ID
   * @returns Array of managers from direct to top-level
   */
  static async getManagementChain(userId: string): Promise<User[]> {
    const chain: User[] = [];
    const visited = new Set<string>();
    let currentUserId: string | null = userId;

    while (currentUserId && !visited.has(currentUserId)) {
      visited.add(currentUserId);

      // Get direct manager
      const { data } = await supabase
        .from('management_hierarchy')
        .select(`
          manager_id,
          users!management_hierarchy_manager_id_fkey(*)
        `)
        .eq('manages_user_id', currentUserId)
        .eq('active', true)
        .order('level', { ascending: true })
        .limit(1)
        .single();

      if (data && data.users) {
        const manager = data.users as User;
        if (manager.active && !chain.find((u) => u.id === manager.id)) {
          chain.push(manager);
          currentUserId = manager.id;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return chain;
  }

  /**
   * Check if a manager can manage a user (directly or indirectly)
   * @param managerId Manager user ID
   * @param userId User ID
   * @returns True if manager can manage user
   */
  static async canManage(managerId: string, userId: string): Promise<boolean> {
    // Direct management
    const { data: direct } = await supabase
      .from('management_hierarchy')
      .select('id')
      .eq('manager_id', managerId)
      .eq('manages_user_id', userId)
      .eq('active', true)
      .limit(1)
      .single();

    if (direct) {
      return true;
    }

    // Check indirect management through chain
    const allReports = await this.getAllReports(managerId);
    return allReports.some((user) => user.id === userId);
  }

  /**
   * Calculate management level between two users
   * @param managerId Manager user ID
   * @param managesUserId User ID being managed
   * @returns Management level (1 for direct, higher for indirect)
   */
  private static async calculateManagementLevel(
    managerId: string,
    managesUserId: string
  ): Promise<number> {
    // Check for direct relationship
    const { data: direct } = await supabase
      .from('management_hierarchy')
      .select('id')
      .eq('manager_id', managerId)
      .eq('manages_user_id', managesUserId)
      .eq('active', true)
      .single();

    if (direct) {
      return 1;
    }

    // Check indirect relationship through chain
    const chain = await this.getManagementChain(managesUserId);
    const managerIndex = chain.findIndex((u) => u.id === managerId);
    if (managerIndex >= 0) {
      return managerIndex + 1;
    }

    // Default to level 1 for new direct relationship
    return 1;
  }

  /**
   * Get managers of a user
   * @param userId User ID
   * @param teamId Optional team ID
   * @returns Array of managers
   */
  static async getManagers(userId: string, teamId?: string): Promise<User[]> {
    let query = supabase
      .from('management_hierarchy')
      .select(`
        manager_id,
        users!management_hierarchy_manager_id_fkey(*)
      `)
      .eq('manages_user_id', userId)
      .eq('active', true)
      .order('level', { ascending: true });

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get managers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data
      .map((item: { users: User }) => item.users)
      .filter((user: User | null) => user !== null && user.active) as User[];
  }

  /**
   * Get hierarchy tree starting from a root manager
   * @param rootManagerId Root manager user ID
   * @returns Hierarchical tree structure
   */
  static async getHierarchyTree(rootManagerId: string): Promise<{
    user: User;
    directReports: Array<{ user: User; directReports: unknown[] }>;
  }> {
    const rootUser = await UserService.getUser(rootManagerId);
    if (!rootUser) {
      throw new Error('Root manager not found');
    }

    const directReports = await this.getDirectReports(rootManagerId);
    const reportsTree = await Promise.all(
      directReports.map(async (user) => ({
        user,
        directReports: await this.getHierarchyTree(user.id).then((tree) => tree.directReports),
      }))
    );

    return {
      user: rootUser,
      directReports: reportsTree,
    };
  }
}
