// Permission Service - Full Implementation
// Handles granular permissions, templates, and permission checking

import type { PermissionTemplate, UserPermission, UserRole } from '@/types';
import { supabase } from '../supabase';
import { UserService } from './UserService';

// Default permissions by role
const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionTemplate['permissions']> = {
  super_admin: {
    tasks: {
      view_own: true,
      view_team: true,
      create: true,
      edit_own: true,
      edit_team: true,
      delete_own: true,
      approve: true,
    },
    timesheet: {
      view_own: true,
      view_team: true,
      edit_own: true,
      approve_team: true,
    },
    leaves: {
      view_own: true,
      view_team: true,
      request: true,
      approve_team: true,
    },
    resources: {
      view: true,
      book: true,
      allocate: true,
      manage: true,
    },
    analytics: {
      view_own: true,
      view_team: true,
      view_org: true,
    },
    members: {
      view: true,
      add: true,
      edit: true,
      remove: true,
    },
  },
  org_admin: {
    tasks: {
      view_own: true,
      view_team: true,
      create: true,
      edit_own: true,
      edit_team: true,
      delete_own: true,
      approve: true,
    },
    timesheet: {
      view_own: true,
      view_team: true,
      edit_own: true,
      approve_team: true,
    },
    leaves: {
      view_own: true,
      view_team: true,
      request: true,
      approve_team: true,
    },
    resources: {
      view: true,
      book: true,
      allocate: true,
      manage: true,
    },
    analytics: {
      view_own: true,
      view_team: true,
      view_org: true,
    },
    members: {
      view: true,
      add: true,
      edit: true,
      remove: true,
    },
  },
  senior_manager: {
    tasks: {
      view_own: true,
      view_team: true,
      create: true,
      edit_own: true,
      edit_team: true,
      delete_own: false,
      approve: true,
    },
    timesheet: {
      view_own: true,
      view_team: true,
      edit_own: true,
      approve_team: true,
    },
    leaves: {
      view_own: true,
      view_team: true,
      request: true,
      approve_team: true,
    },
    resources: {
      view: true,
      book: true,
      allocate: true,
      manage: false,
    },
    analytics: {
      view_own: true,
      view_team: true,
      view_org: false,
    },
    members: {
      view: true,
      add: true,
      edit: true,
      remove: false,
    },
  },
  manager: {
    tasks: {
      view_own: true,
      view_team: true,
      create: true,
      edit_own: true,
      edit_team: true,
      delete_own: false,
      approve: true,
    },
    timesheet: {
      view_own: true,
      view_team: true,
      edit_own: true,
      approve_team: true,
    },
    leaves: {
      view_own: true,
      view_team: true,
      request: true,
      approve_team: true,
    },
    resources: {
      view: true,
      book: true,
      allocate: true,
      manage: false,
    },
    analytics: {
      view_own: true,
      view_team: true,
      view_org: false,
    },
    members: {
      view: true,
      add: false,
      edit: false,
      remove: false,
    },
  },
  lead: {
    tasks: {
      view_own: true,
      view_team: true,
      create: true,
      edit_own: true,
      edit_team: false,
      delete_own: false,
      approve: false,
    },
    timesheet: {
      view_own: true,
      view_team: true,
      edit_own: true,
      approve_team: false,
    },
    leaves: {
      view_own: true,
      view_team: true,
      request: true,
      approve_team: false,
    },
    resources: {
      view: true,
      book: true,
      allocate: false,
      manage: false,
    },
    analytics: {
      view_own: true,
      view_team: false,
      view_org: false,
    },
    members: {
      view: true,
      add: false,
      edit: false,
      remove: false,
    },
  },
  member: {
    tasks: {
      view_own: true,
      view_team: false,
      create: true,
      edit_own: true,
      edit_team: false,
      delete_own: false,
      approve: false,
    },
    timesheet: {
      view_own: true,
      view_team: false,
      edit_own: true,
      approve_team: false,
    },
    leaves: {
      view_own: true,
      view_team: false,
      request: true,
      approve_team: false,
    },
    resources: {
      view: true,
      book: true,
      allocate: false,
      manage: false,
    },
    analytics: {
      view_own: true,
      view_team: false,
      view_org: false,
    },
    members: {
      view: true,
      add: false,
      edit: false,
      remove: false,
    },
  },
};

export class PermissionService {
  /**
   * Get effective permissions for a user (combines role, template, and custom)
   * @param userId User ID
   * @param context Optional context (orgId, teamId)
   * @returns Effective permissions object
   */
  static async getEffectivePermissions(
    userId: string,
    context?: { orgId?: string; teamId?: string }
  ): Promise<PermissionTemplate['permissions']> {
    // Get user to determine role
    const user = await UserService.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Start with role-based default permissions
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.member;

    // Get user permissions from database
    let query = supabase
      .from('user_permissions')
      .select('*')
      .eq('user_id', userId);

    if (context?.orgId) {
      query = query.eq('organization_id', context.orgId);
    }
    if (context?.teamId) {
      query = query.eq('team_id', context.teamId);
    }

    const { data: userPerms } = await query.order('updated_at', { ascending: false }).limit(1);

    if (!userPerms || userPerms.length === 0) {
      // No custom permissions, return role defaults
      return rolePermissions;
    }

    const userPerm = userPerms[0] as UserPermission;

    // If effective_permissions is already computed and up to date, use it
    if (userPerm.effective_permissions) {
      return userPerm.effective_permissions as PermissionTemplate['permissions'];
    }

    // Compute effective permissions
    let effective: PermissionTemplate['permissions'] = { ...rolePermissions };

    // Apply template permissions if template exists
    if (userPerm.template_id) {
      const template = await this.getTemplate(userPerm.template_id);
      if (template) {
        effective = this.mergePermissions(effective, template.permissions);
      }
    }

    // Apply custom permissions (overrides everything)
    if (userPerm.custom_permissions) {
      effective = this.mergePermissions(effective, userPerm.custom_permissions as PermissionTemplate['permissions']);
    }

    // Update effective_permissions in database
    await supabase
      .from('user_permissions')
      .update({
        effective_permissions: effective,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userPerm.id);

    return effective;
  }

  /**
   * Check if user has a specific permission
   * @param userId User ID
   * @param permission Permission path (e.g., 'tasks.create', 'resources.book')
   * @param context Optional context
   * @returns True if user has permission
   */
  static async checkPermission(
    userId: string,
    permission: string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    const effective = await this.getEffectivePermissions(userId, context as { orgId?: string; teamId?: string });
    const parts = permission.split('.');

    let current: unknown = effective;
    for (const part of parts) {
      if (typeof current === 'object' && current !== null && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }

    return current === true;
  }

  /**
   * Grant a permission to a user (creates or updates custom permissions)
   * @param userId User ID
   * @param permission Permission path
   * @param context Context (orgId, teamId)
   */
  static async grantPermission(
    userId: string,
    permission: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await this.updateCustomPermission(userId, permission, true, context);
  }

  /**
   * Revoke a permission from a user
   * @param userId User ID
   * @param permission Permission path
   * @param context Context (orgId, teamId)
   */
  static async revokePermission(
    userId: string,
    permission: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await this.updateCustomPermission(userId, permission, false, context);
  }

  /**
   * Create a permission template
   * @param orgId Organization ID (optional for global templates)
   * @param template Template data
   * @returns Created template
   */
  static async createPermissionTemplate(
    orgId: string | undefined,
    template: Partial<PermissionTemplate>
  ): Promise<PermissionTemplate> {
    if (!template.name || !template.permissions) {
      throw new Error('Name and permissions are required');
    }

    const { data, error } = await supabase
      .from('permission_templates')
      .insert({
        organization_id: orgId || null,
        name: template.name,
        description: template.description || null,
        permissions: template.permissions,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create permission template: ${error.message}`);
    }

    return data as PermissionTemplate;
  }

  /**
   * Get permission template by ID
   * @param templateId Template ID
   * @returns Template or null
   */
  static async getTemplate(templateId: string): Promise<PermissionTemplate | null> {
    const { data, error } = await supabase
      .from('permission_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get template: ${error.message}`);
    }

    return data as PermissionTemplate;
  }

  /**
   * Get all templates for an organization
   * @param orgId Organization ID (null for global templates)
   * @returns Array of templates
   */
  static async getTemplates(orgId?: string): Promise<PermissionTemplate[]> {
    let query = supabase.from('permission_templates').select('*');

    if (orgId === undefined) {
      // Get all templates (global and org-specific)
      query = query.order('created_at', { ascending: false });
    } else if (orgId === null) {
      // Get only global templates
      query = query.is('organization_id', null).order('created_at', { ascending: false });
    } else {
      // Get org-specific and global templates
      query = query
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get templates: ${error.message}`);
    }

    return (data || []) as PermissionTemplate[];
  }

  /**
   * Apply a permission template to a user
   * @param userId User ID
   * @param templateId Template ID
   * @param context Context (orgId, teamId)
   * @returns Created or updated user permission
   */
  static async applyTemplate(
    userId: string,
    templateId: string,
    context?: { orgId?: string; teamId?: string }
  ): Promise<UserPermission> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Check if user permission already exists
    let query = supabase.from('user_permissions').select('*').eq('user_id', userId);

    if (context?.orgId) {
      query = query.eq('organization_id', context.orgId);
    }
    if (context?.teamId) {
      query = query.eq('team_id', context.teamId);
    }

    const { data: existing } = await query.single();

    const user = await UserService.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.member;
    const effective = this.mergePermissions(rolePermissions, template.permissions);

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('user_permissions')
        .update({
          template_id: templateId,
          source: 'template',
          effective_permissions: effective,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to apply template: ${error.message}`);
      }

      return data as UserPermission;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          organization_id: context?.orgId || null,
          team_id: context?.teamId || null,
          template_id: templateId,
          source: 'template',
          effective_permissions: effective,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to apply template: ${error.message}`);
      }

      return data as UserPermission;
    }
  }

  /**
   * Merge two permission objects (second overrides first)
   */
  private static mergePermissions(
    base: PermissionTemplate['permissions'],
    override: PermissionTemplate['permissions']
  ): PermissionTemplate['permissions'] {
    const merged = { ...base };

    for (const [category, perms] of Object.entries(override)) {
      if (perms && typeof perms === 'object') {
        merged[category as keyof PermissionTemplate['permissions']] = {
          ...(merged[category as keyof PermissionTemplate['permissions']] as Record<string, unknown>),
          ...perms,
        };
      }
    }

    return merged;
  }

  /**
   * Update custom permission for a user
   */
  private static async updateCustomPermission(
    userId: string,
    permission: string,
    value: boolean,
    context: Record<string, unknown>
  ): Promise<void> {
    // Get or create user permission record
    let query = supabase.from('user_permissions').select('*').eq('user_id', userId);

    if (context.orgId) {
      query = query.eq('organization_id', context.orgId);
    }
    if (context.teamId) {
      query = query.eq('team_id', context.teamId);
    }

    const { data: existing } = await query.single();

    const parts = permission.split('.');
    const customPerms: Record<string, unknown> = existing?.custom_permissions as Record<string, unknown> || {};

    // Build nested structure
    let current: Record<string, unknown> = customPerms;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;

    // Recompute effective permissions
    const user = await UserService.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.member;
    let effective: PermissionTemplate['permissions'] = { ...rolePermissions };

    if (existing?.template_id) {
      const template = await this.getTemplate(existing.template_id);
      if (template) {
        effective = this.mergePermissions(effective, template.permissions);
      }
    }

    effective = this.mergePermissions(effective, customPerms as PermissionTemplate['permissions']);

    if (existing) {
      // Update
      await supabase
        .from('user_permissions')
        .update({
          custom_permissions: customPerms,
          effective_permissions: effective,
          source: 'custom',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Create
      await supabase.from('user_permissions').insert({
        user_id: userId,
        organization_id: context.orgId as string || null,
        team_id: context.teamId as string || null,
        custom_permissions: customPerms,
        effective_permissions: effective,
        source: 'custom',
      });
    }
  }
}
