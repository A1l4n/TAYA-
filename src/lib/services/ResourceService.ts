// Resource Service - Full Implementation
// Handles space/equipment management, allocations, and availability checking

import type { Space, ResourceAllocation, Equipment, ResourceType, SpaceType } from '@/types';
import { supabase } from '../supabase';

export class ResourceService {
  // ============================================================================
  // SPACE MANAGEMENT
  // ============================================================================

  /**
   * Create a new space
   * @param orgId Organization ID
   * @param data Space data
   * @returns Created space
   */
  static async createSpace(orgId: string, data: Partial<Space>): Promise<Space> {
    const { id, organization_id, created_at, updated_at, ...spaceData } = data;

    if (!spaceData.name || !spaceData.space_type) {
      throw new Error('Name and space_type are required');
    }

    // Validate parent_space_id if provided
    if (spaceData.parent_space_id) {
      const { data: parent } = await supabase
        .from('spaces')
        .select('organization_id, space_type')
        .eq('id', spaceData.parent_space_id)
        .single();

      if (!parent) {
        throw new Error('Parent space not found');
      }

      if (parent.organization_id !== orgId) {
        throw new Error('Parent space belongs to a different organization');
      }
    }

    const { data: space, error } = await supabase
      .from('spaces')
      .insert({
        organization_id: orgId,
        ...spaceData,
        features: spaceData.features || {},
        settings: spaceData.settings || {},
        status: spaceData.status || 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create space: ${error.message}`);
    }

    return space as Space;
  }

  /**
   * Get spaces with optional filters
   * @param orgId Organization ID
   * @param filters Optional filters (space_type, parent_space_id, status, etc.)
   * @returns Array of spaces
   */
  static async getSpaces(orgId: string, filters?: Record<string, unknown>): Promise<Space[]> {
    let query = supabase
      .from('spaces')
      .select('*')
      .eq('organization_id', orgId);

    if (filters) {
      if (filters.space_type) {
        query = query.eq('space_type', filters.space_type);
      }
      if (filters.parent_space_id !== undefined) {
        if (filters.parent_space_id === null) {
          query = query.is('parent_space_id', null);
        } else {
          query = query.eq('parent_space_id', filters.parent_space_id);
        }
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get spaces: ${error.message}`);
    }

    return (data || []) as Space[];
  }

  /**
   * Get space by ID
   * @param spaceId Space ID
   * @returns Space or null
   */
  static async getSpace(spaceId: string): Promise<Space | null> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', spaceId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get space: ${error.message}`);
    }

    return data as Space;
  }

  /**
   * Get child spaces
   * @param parentSpaceId Parent space ID
   * @returns Array of child spaces
   */
  static async getChildSpaces(parentSpaceId: string): Promise<Space[]> {
    const { data, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('parent_space_id', parentSpaceId)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to get child spaces: ${error.message}`);
    }

    return (data || []) as Space[];
  }

  /**
   * Update space
   * @param spaceId Space ID
   * @param data Partial space data
   * @returns Updated space
   */
  static async updateSpace(spaceId: string, data: Partial<Space>): Promise<Space> {
    const { id, organization_id, created_at, ...updateData } = data;

    // Validate parent_space_id if being updated
    if (updateData.parent_space_id !== undefined && updateData.parent_space_id !== null) {
      const currentSpace = await this.getSpace(spaceId);
      if (!currentSpace) {
        throw new Error('Space not found');
      }

      const { data: parent } = await supabase
        .from('spaces')
        .select('organization_id')
        .eq('id', updateData.parent_space_id)
        .single();

      if (!parent || parent.organization_id !== currentSpace.organization_id) {
        throw new Error('Parent space not found or belongs to different organization');
      }

      // Prevent circular reference
      if (updateData.parent_space_id === spaceId) {
        throw new Error('Space cannot be its own parent');
      }
    }

    const { data: updated, error } = await supabase
      .from('spaces')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', spaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update space: ${error.message}`);
    }

    return updated as Space;
  }

  /**
   * Delete space (only if no child spaces and no active allocations)
   * @param spaceId Space ID
   */
  static async deleteSpace(spaceId: string): Promise<void> {
    // Check for child spaces
    const children = await this.getChildSpaces(spaceId);
    if (children.length > 0) {
      throw new Error('Cannot delete space with child spaces');
    }

    // Check for active allocations
    const { data: allocations } = await supabase
      .from('resource_allocations')
      .select('id')
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .limit(1);

    if (allocations && allocations.length > 0) {
      throw new Error('Cannot delete space with active allocations');
    }

    const { error } = await supabase
      .from('spaces')
      .delete()
      .eq('id', spaceId);

    if (error) {
      throw new Error(`Failed to delete space: ${error.message}`);
    }
  }

  // ============================================================================
  // RESOURCE ALLOCATIONS
  // ============================================================================

  /**
   * Allocate a resource (desk, room, parking, etc.)
   * @param data Allocation data
   * @returns Created allocation
   */
  static async allocateResource(data: Partial<ResourceAllocation>): Promise<ResourceAllocation> {
    if (!data.space_id || !data.start_date || !data.resource_type) {
      throw new Error('space_id, start_date, and resource_type are required');
    }

    // Get space to verify organization
    const space = await this.getSpace(data.space_id);
    if (!space) {
      throw new Error('Space not found');
    }

    if (space.status !== 'active') {
      throw new Error('Space is not available for allocation');
    }

    // Check availability
    const isAvailable = await this.checkAvailability(
      data.space_id,
      data.start_date,
      data.start_time || undefined
    );

    if (!isAvailable) {
      throw new Error('Resource is not available for the requested time');
    }

    // Validate dates
    if (data.end_date && data.end_date < data.start_date) {
      throw new Error('End date must be after start date');
    }

    // Validate times if provided
    if (data.start_time && data.end_time && data.end_time <= data.start_time) {
      throw new Error('End time must be after start time');
    }

    const { data: allocation, error } = await supabase
      .from('resource_allocations')
      .insert({
        organization_id: space.organization_id,
        space_id: data.space_id,
        resource_type: data.resource_type,
        allocated_to_user_id: data.allocated_to_user_id || null,
        allocated_to_team_id: data.allocated_to_team_id || null,
        team_id: data.team_id || null,
        start_date: data.start_date,
        end_date: data.end_date || null,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        recurrence_pattern: data.recurrence_pattern || null,
        status: data.status || 'active',
        notes: data.notes || null,
        created_by: data.created_by || null,
        approved_by: data.approved_by || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to allocate resource: ${error.message}`);
    }

    return allocation as ResourceAllocation;
  }

  /**
   * Get allocations with filters
   * @param filters Filter criteria
   * @returns Array of allocations
   */
  static async getAllocations(filters: Record<string, unknown>): Promise<ResourceAllocation[]> {
    let query = supabase.from('resource_allocations').select('*');

    if (filters.organization_id) {
      query = query.eq('organization_id', filters.organization_id);
    }
    if (filters.team_id) {
      query = query.eq('team_id', filters.team_id);
    }
    if (filters.space_id) {
      query = query.eq('space_id', filters.space_id);
    }
    if (filters.allocated_to_user_id) {
      query = query.eq('allocated_to_user_id', filters.allocated_to_user_id);
    }
    if (filters.resource_type) {
      query = query.eq('resource_type', filters.resource_type);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.start_date) {
      query = query.gte('start_date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('end_date', filters.end_date);
    }

    query = query.order('start_date', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get allocations: ${error.message}`);
    }

    return (data || []) as ResourceAllocation[];
  }

  /**
   * Check if a resource is available at a given time
   * @param spaceId Space ID
   * @param date Date to check
   * @param time Optional time to check
   * @returns True if available, false if not
   */
  static async checkAvailability(spaceId: string, date: string, time?: string): Promise<boolean> {
    // Check if space exists and is active
    const space = await this.getSpace(spaceId);
    if (!space || space.status !== 'active') {
      return false;
    }

    // Build query for conflicting allocations
    let query = supabase
      .from('resource_allocations')
      .select('id')
      .eq('space_id', spaceId)
      .eq('status', 'active')
      .lte('start_date', date);

    // If end_date is null, it's an ongoing allocation
    // If end_date exists, check if it's after the requested date
    query = query.or(`end_date.is.null,end_date.gte.${date}`);

    // If time is provided, check for time conflicts
    if (time) {
      query = query.or(`start_time.is.null,and(start_time.lte.${time},or(end_time.is.null,end_time.gt.${time}))`);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw new Error(`Failed to check availability: ${error.message}`);
    }

    // If no conflicts found, resource is available
    return !data || data.length === 0;
  }

  /**
   * Cancel an allocation
   * @param allocationId Allocation ID
   */
  static async cancelAllocation(allocationId: string): Promise<void> {
    const { error } = await supabase
      .from('resource_allocations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocationId);

    if (error) {
      throw new Error(`Failed to cancel allocation: ${error.message}`);
    }
  }

  /**
   * Update allocation
   * @param allocationId Allocation ID
   * @param data Partial allocation data
   * @returns Updated allocation
   */
  static async updateAllocation(
    allocationId: string,
    data: Partial<ResourceAllocation>
  ): Promise<ResourceAllocation> {
    const { id, organization_id, created_at, ...updateData } = data;

    // If dates/times are being updated, check availability
    if (updateData.start_date || updateData.start_time) {
      const { data: current } = await supabase
        .from('resource_allocations')
        .select('space_id, start_date, start_time')
        .eq('id', allocationId)
        .single();

      if (current) {
        const spaceId = updateData.space_id || current.space_id;
        const date = updateData.start_date || current.start_date;
        const time = updateData.start_time || current.start_time;

        const isAvailable = await this.checkAvailability(spaceId, date, time);
        if (!isAvailable) {
          throw new Error('Resource is not available for the requested time');
        }
      }
    }

    const { data: updated, error } = await supabase
      .from('resource_allocations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', allocationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update allocation: ${error.message}`);
    }

    return updated as ResourceAllocation;
  }

  // ============================================================================
  // EQUIPMENT MANAGEMENT
  // ============================================================================

  /**
   * Add equipment to organization
   * @param orgId Organization ID
   * @param data Equipment data
   * @returns Created equipment
   */
  static async addEquipment(orgId: string, data: Partial<Equipment>): Promise<Equipment> {
    const { id, organization_id, created_at, updated_at, ...equipmentData } = data;

    if (!equipmentData.name || !equipmentData.category) {
      throw new Error('Name and category are required');
    }

    // Check serial number uniqueness if provided
    if (equipmentData.serial_number) {
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('serial_number', equipmentData.serial_number)
        .single();

      if (existing) {
        throw new Error('Equipment with this serial number already exists');
      }
    }

    const { data: equipment, error } = await supabase
      .from('equipment')
      .insert({
        organization_id: orgId,
        ...equipmentData,
        specifications: equipmentData.specifications || {},
        status: equipmentData.status || 'available',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add equipment: ${error.message}`);
    }

    return equipment as Equipment;
  }

  /**
   * Get equipment by organization
   * @param orgId Organization ID
   * @param filters Optional filters
   * @returns Array of equipment
   */
  static async getEquipment(orgId: string, filters?: Record<string, unknown>): Promise<Equipment[]> {
    let query = supabase
      .from('equipment')
      .select('*')
      .eq('organization_id', orgId);

    if (filters) {
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.allocated_to_user_id) {
        query = query.eq('allocated_to_user_id', filters.allocated_to_user_id);
      }
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get equipment: ${error.message}`);
    }

    return (data || []) as Equipment[];
  }

  /**
   * Allocate equipment to a user
   * @param equipmentId Equipment ID
   * @param userId User ID
   * @returns Updated equipment
   */
  static async allocateEquipment(equipmentId: string, userId: string): Promise<Equipment> {
    // Check if equipment is available
    const { data: equipment } = await supabase
      .from('equipment')
      .select('*')
      .eq('id', equipmentId)
      .single();

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.status !== 'available') {
      throw new Error('Equipment is not available for allocation');
    }

    const { data: updated, error } = await supabase
      .from('equipment')
      .update({
        allocated_to_user_id: userId,
        status: 'allocated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to allocate equipment: ${error.message}`);
    }

    return updated as Equipment;
  }

  /**
   * Return equipment (make it available again)
   * @param equipmentId Equipment ID
   * @returns Updated equipment
   */
  static async returnEquipment(equipmentId: string): Promise<Equipment> {
    const { data: updated, error } = await supabase
      .from('equipment')
      .update({
        allocated_to_user_id: null,
        status: 'available',
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to return equipment: ${error.message}`);
    }

    return updated as Equipment;
  }

  /**
   * Update equipment
   * @param equipmentId Equipment ID
   * @param data Partial equipment data
   * @returns Updated equipment
   */
  static async updateEquipment(equipmentId: string, data: Partial<Equipment>): Promise<Equipment> {
    const { id, organization_id, created_at, ...updateData } = data;

    // Check serial number uniqueness if being updated
    if (updateData.serial_number) {
      const { data: existing } = await supabase
        .from('equipment')
        .select('id')
        .eq('serial_number', updateData.serial_number)
        .neq('id', equipmentId)
        .single();

      if (existing) {
        throw new Error('Equipment with this serial number already exists');
      }
    }

    const { data: updated, error } = await supabase
      .from('equipment')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update equipment: ${error.message}`);
    }

    return updated as Equipment;
  }

  /**
   * Delete equipment
   * @param equipmentId Equipment ID
   */
  static async deleteEquipment(equipmentId: string): Promise<void> {
    // Check if equipment is allocated
    const { data: equipment } = await supabase
      .from('equipment')
      .select('status, allocated_to_user_id')
      .eq('id', equipmentId)
      .single();

    if (equipment && equipment.status === 'allocated' && equipment.allocated_to_user_id) {
      throw new Error('Cannot delete allocated equipment. Return it first.');
    }

    const { error } = await supabase
      .from('equipment')
      .delete()
      .eq('id', equipmentId);

    if (error) {
      throw new Error(`Failed to delete equipment: ${error.message}`);
    }
  }
}
