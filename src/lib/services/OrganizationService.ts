// Organization Service - Full Implementation
// Handles all organization CRUD operations with Supabase

import type { Organization } from '@/types';
import { supabase } from '../supabase';

export class OrganizationService {
  /**
   * Create a new organization
   * @param name Organization name
   * @param slug Unique slug for the organization
   * @param managerId User ID of the initial manager/admin
   * @param settings Optional settings object
   * @returns Created organization
   */
  static async createOrganization(
    name: string,
    slug: string,
    managerId: string,
    settings?: Record<string, unknown>
  ): Promise<Organization> {
    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new Error('Organization slug already exists');
    }

    // Create organization
    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        settings: settings || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create organization: ${error.message}`);
    }

    return data as Organization;
  }

  /**
   * Get organization by ID
   * @param orgId Organization ID
   * @returns Organization or null if not found
   */
  static async getOrganization(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get organization: ${error.message}`);
    }

    return data as Organization;
  }

  /**
   * Get organization by slug
   * @param slug Organization slug
   * @returns Organization or null if not found
   */
  static async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to get organization: ${error.message}`);
    }

    return data as Organization;
  }

  /**
   * Update organization
   * @param orgId Organization ID
   * @param data Partial organization data to update
   * @returns Updated organization
   */
  static async updateOrganization(
    orgId: string,
    data: Partial<Organization>
  ): Promise<Organization> {
    // Don't allow updating ID
    const { id, ...updateData } = data;

    // If slug is being updated, validate it
    if (updateData.slug) {
      if (!/^[a-z0-9-]+$/.test(updateData.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }

      // Check if slug already exists (excluding current org)
      const { data: existing } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', updateData.slug)
        .neq('id', orgId)
        .single();

      if (existing) {
        throw new Error('Organization slug already exists');
      }
    }

    const { data: updated, error } = await supabase
      .from('organizations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update organization: ${error.message}`);
    }

    return updated as Organization;
  }

  /**
   * Delete organization (cascade deletes all related data)
   * @param orgId Organization ID
   */
  static async deleteOrganization(orgId: string): Promise<void> {
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
    }
  }

  /**
   * Get all organizations for a user
   * @param userId User ID
   * @returns Array of organizations the user belongs to
   */
  static async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const { data, error } = await supabase
      .from('users')
      .select('organization_id, organizations(*)')
      .eq('id', userId)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return [];
      }
      throw new Error(`Failed to get user organizations: ${error.message}`);
    }

    if (!data || !data.organizations) {
      return [];
    }

    // Handle both single object and array responses
    const orgs = Array.isArray(data.organizations) 
      ? data.organizations 
      : [data.organizations];

    return orgs as Organization[];
  }

  /**
   * Get all organizations (admin only)
   * @param limit Optional limit
   * @param offset Optional offset for pagination
   * @returns Array of organizations
   */
  static async getAllOrganizations(limit?: number, offset?: number): Promise<Organization[]> {
    let query = supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.range(offset, offset + (limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get organizations: ${error.message}`);
    }

    return (data || []) as Organization[];
  }

  /**
   * Check if organization slug is available
   * @param slug Slug to check
   * @returns True if available, false if taken
   */
  static async isSlugAvailable(slug: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error && error.code === 'PGRST116') {
      // Not found, so slug is available
      return true;
    }

    // If data exists, slug is taken
    return !data;
  }
}
