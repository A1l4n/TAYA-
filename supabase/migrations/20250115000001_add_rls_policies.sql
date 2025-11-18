/*
  # TAYA RLS Policies - Phase 2
  
  Creates comprehensive Row Level Security policies for:
  1. Core multi-tenant tables (organizations, teams, users, user_teams)
  2. Management hierarchy
  3. Resource management (spaces, allocations, equipment)
  4. Permission system
  5. Data tables (submissions, timesheet, leaves)
  
  All policies ensure:
  - Organization-level data isolation
  - Team-level access control
  - Role-based permissions
  - Hierarchical access patterns
*/

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to get current user ID from request context
-- This assumes we'll set a custom claim or use a session variable
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Try to get from custom claim first (if using custom auth)
  -- Otherwise, fall back to auth.uid() if using Supabase Auth
  RETURN COALESCE(
    current_setting('request.jwt.claims', true)::json->>'user_id',
    current_setting('app.current_user_id', true)::uuid,
    auth.uid()
  );
END;
$$;

-- Function to check if user belongs to organization
CREATE OR REPLACE FUNCTION user_belongs_to_org(org_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_belongs_to_org.user_id
      AND organization_id = user_belongs_to_org.org_id
      AND active = true
  );
END;
$$;

-- Function to check if user is member of team
CREATE OR REPLACE FUNCTION user_is_team_member(team_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.user_id = user_is_team_member.user_id
      AND user_teams.team_id = user_is_team_member.team_id
  );
END;
$$;

-- Function to check if user is manager of team
CREATE OR REPLACE FUNCTION user_is_team_manager(team_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_teams
    WHERE user_teams.user_id = user_is_team_manager.user_id
      AND user_teams.team_id = user_is_team_manager.team_id
      AND user_teams.role IN ('primary_manager', 'co_manager')
  ) OR EXISTS (
    SELECT 1 FROM teams
    WHERE teams.id = user_is_team_manager.team_id
      AND teams.manager_id = user_is_team_manager.user_id
  );
END;
$$;

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_org_id(user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM users
    WHERE id = get_user_org_id.user_id
      AND active = true
    LIMIT 1
  );
END;
$$;

-- Function to check if user has role
CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, role_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_has_role.user_id
      AND role = user_has_role.role_name
      AND active = true
  );
END;
$$;

-- Function to check if user can manage another user (hierarchical)
CREATE OR REPLACE FUNCTION can_manage_user(manager_id uuid, managed_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Direct management relationship
  IF EXISTS (
    SELECT 1 FROM management_hierarchy
    WHERE manager_id = can_manage_user.manager_id
      AND manages_user_id = can_manage_user.managed_user_id
      AND active = true
  ) THEN
    RETURN true;
  END IF;
  
  -- Same team with manager role
  IF EXISTS (
    SELECT 1 FROM user_teams ut1
    JOIN user_teams ut2 ON ut1.team_id = ut2.team_id
    WHERE ut1.user_id = can_manage_user.manager_id
      AND ut2.user_id = can_manage_user.managed_user_id
      AND ut1.role IN ('primary_manager', 'co_manager')
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- ============================================================================
-- 1. ORGANIZATIONS RLS POLICIES
-- ============================================================================

-- Users can view organizations they belong to
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.organization_id = organizations.id
        AND users.id = get_current_user_id()
        AND users.active = true
    )
  );

-- Super admins and org admins can insert organizations
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR user_has_role(get_current_user_id(), 'org_admin')
  );

-- Super admins and org admins can update their organization
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organizations.id, get_current_user_id())
    )
  );

-- Super admins can delete organizations
CREATE POLICY "Super admins can delete organizations"
  ON organizations FOR DELETE
  USING (user_has_role(get_current_user_id(), 'super_admin'));

-- ============================================================================
-- 2. USERS RLS POLICIES
-- ============================================================================

-- Users can view themselves and users in their organization
CREATE POLICY "Users can view organization members"
  ON users FOR SELECT
  USING (
    id = get_current_user_id()
    OR (
      user_belongs_to_org(organization_id, get_current_user_id())
      AND active = true
    )
  );

-- Admins can create users in their organization
CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Users can update themselves, admins can update org users
CREATE POLICY "Users can update themselves or admins update org users"
  ON users FOR UPDATE
  USING (
    id = get_current_user_id()
    OR user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Admins can deactivate users
CREATE POLICY "Admins can deactivate users"
  ON users FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- ============================================================================
-- 3. TEAMS RLS POLICIES
-- ============================================================================

-- Users can view teams in their organization
CREATE POLICY "Users can view organization teams"
  ON teams FOR SELECT
  USING (
    user_belongs_to_org(organization_id, get_current_user_id())
  );

-- Admins and managers can create teams
CREATE POLICY "Admins and managers can create teams"
  ON teams FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
    OR user_has_role(get_current_user_id(), 'senior_manager')
  );

-- Team managers and admins can update teams
CREATE POLICY "Managers and admins can update teams"
  ON teams FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
    OR user_is_team_manager(id, get_current_user_id())
  );

-- Admins can delete teams
CREATE POLICY "Admins can delete teams"
  ON teams FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- ============================================================================
-- 4. USER_TEAMS RLS POLICIES
-- ============================================================================

-- Users can view their own team memberships and team members
CREATE POLICY "Users can view team memberships"
  ON user_teams FOR SELECT
  USING (
    user_id = get_current_user_id()
    OR user_is_team_member(team_id, get_current_user_id())
  );

-- Managers and admins can add members to teams
CREATE POLICY "Managers and admins can add team members"
  ON user_teams FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = user_teams.team_id
          AND user_belongs_to_org(teams.organization_id, get_current_user_id())
      )
    )
    OR user_is_team_manager(team_id, get_current_user_id())
  );

-- Managers and admins can update team memberships
CREATE POLICY "Managers and admins can update team memberships"
  ON user_teams FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = user_teams.team_id
          AND user_belongs_to_org(teams.organization_id, get_current_user_id())
      )
    )
    OR user_is_team_manager(team_id, get_current_user_id())
  );

-- Managers and admins can remove team members
CREATE POLICY "Managers and admins can remove team members"
  ON user_teams FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND EXISTS (
        SELECT 1 FROM teams
        WHERE teams.id = user_teams.team_id
          AND user_belongs_to_org(teams.organization_id, get_current_user_id())
      )
    )
    OR user_is_team_manager(team_id, get_current_user_id())
  );

-- ============================================================================
-- 5. MANAGEMENT_HIERARCHY RLS POLICIES
-- ============================================================================

-- Users can view hierarchy in their organization
CREATE POLICY "Users can view organization hierarchy"
  ON management_hierarchy FOR SELECT
  USING (
    user_belongs_to_org(organization_id, get_current_user_id())
  );

-- Admins and senior managers can create hierarchy relationships
CREATE POLICY "Admins and senior managers can create hierarchy"
  ON management_hierarchy FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
    OR user_has_role(get_current_user_id(), 'senior_manager')
  );

-- Admins and managers can update hierarchy
CREATE POLICY "Admins and managers can update hierarchy"
  ON management_hierarchy FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
    OR manager_id = get_current_user_id()
  );

-- Admins can delete hierarchy relationships
CREATE POLICY "Admins can delete hierarchy"
  ON management_hierarchy FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- ============================================================================
-- 6. SPACES RLS POLICIES
-- ============================================================================

-- Users can view spaces in their organization
CREATE POLICY "Users can view organization spaces"
  ON spaces FOR SELECT
  USING (
    user_belongs_to_org(organization_id, get_current_user_id())
  );

-- Admins can create spaces
CREATE POLICY "Admins can create spaces"
  ON spaces FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Admins can update spaces
CREATE POLICY "Admins can update spaces"
  ON spaces FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Admins can delete spaces
CREATE POLICY "Admins can delete spaces"
  ON spaces FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- ============================================================================
-- 7. RESOURCE_ALLOCATIONS RLS POLICIES
-- ============================================================================

-- Users can view allocations in their organization
-- Users can view their own allocations
-- Managers can view team allocations
CREATE POLICY "Users can view relevant allocations"
  ON resource_allocations FOR SELECT
  USING (
    user_belongs_to_org(organization_id, get_current_user_id())
    AND (
      allocated_to_user_id = get_current_user_id()
      OR allocated_to_team_id IN (
        SELECT team_id FROM user_teams
        WHERE user_id = get_current_user_id()
      )
      OR user_is_team_manager(allocated_to_team_id, get_current_user_id())
      OR user_has_role(get_current_user_id(), 'org_admin')
      OR user_has_role(get_current_user_id(), 'super_admin')
    )
  );

-- Users can create allocations for themselves or their team
-- Managers can create allocations for their team
CREATE POLICY "Users and managers can create allocations"
  ON resource_allocations FOR INSERT
  WITH CHECK (
    user_belongs_to_org(organization_id, get_current_user_id())
    AND (
      allocated_to_user_id = get_current_user_id()
      OR user_is_team_manager(allocated_to_team_id, get_current_user_id())
      OR user_has_role(get_current_user_id(), 'org_admin')
      OR user_has_role(get_current_user_id(), 'super_admin')
    )
  );

-- Users can update their own allocations
-- Managers can update team allocations
CREATE POLICY "Users and managers can update allocations"
  ON resource_allocations FOR UPDATE
  USING (
    allocated_to_user_id = get_current_user_id()
    OR user_is_team_manager(allocated_to_team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can cancel their own allocations
-- Managers can cancel team allocations
CREATE POLICY "Users and managers can cancel allocations"
  ON resource_allocations FOR DELETE
  USING (
    allocated_to_user_id = get_current_user_id()
    OR user_is_team_manager(allocated_to_team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- ============================================================================
-- 8. EQUIPMENT RLS POLICIES
-- ============================================================================

-- Users can view equipment in their organization
CREATE POLICY "Users can view organization equipment"
  ON equipment FOR SELECT
  USING (
    user_belongs_to_org(organization_id, get_current_user_id())
  );

-- Admins can create equipment
CREATE POLICY "Admins can create equipment"
  ON equipment FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Admins can update equipment
CREATE POLICY "Admins can update equipment"
  ON equipment FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- Admins can delete equipment
CREATE POLICY "Admins can delete equipment"
  ON equipment FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND user_belongs_to_org(organization_id, get_current_user_id())
    )
  );

-- ============================================================================
-- 9. PERMISSION_TEMPLATES RLS POLICIES
-- ============================================================================

-- Users can view permission templates in their organization
CREATE POLICY "Users can view organization templates"
  ON permission_templates FOR SELECT
  USING (
    organization_id IS NULL
    OR user_belongs_to_org(organization_id, get_current_user_id())
  );

-- Admins can create permission templates
CREATE POLICY "Admins can create permission templates"
  ON permission_templates FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- Admins can update permission templates
CREATE POLICY "Admins can update permission templates"
  ON permission_templates FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- Admins can delete permission templates
CREATE POLICY "Admins can delete permission templates"
  ON permission_templates FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- ============================================================================
-- 10. USER_PERMISSIONS RLS POLICIES
-- ============================================================================

-- Users can view their own permissions
-- Admins can view all permissions in their org
CREATE POLICY "Users can view relevant permissions"
  ON user_permissions FOR SELECT
  USING (
    user_id = get_current_user_id()
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Admins can create user permissions
CREATE POLICY "Admins can create user permissions"
  ON user_permissions FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- Admins can update user permissions
CREATE POLICY "Admins can update user permissions"
  ON user_permissions FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- Admins can delete user permissions
CREATE POLICY "Admins can delete user permissions"
  ON user_permissions FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

-- ============================================================================
-- 11. DAILY_SUBMISSIONS RLS POLICIES
-- ============================================================================

-- Users can view their own submissions
-- Managers can view team submissions
CREATE POLICY "Users and managers can view submissions"
  ON daily_submissions FOR SELECT
  USING (
    user_id = get_current_user_id()
    OR user_is_team_member(team_id, get_current_user_id())
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can create their own submissions
CREATE POLICY "Users can create their own submissions"
  ON daily_submissions FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
    AND user_is_team_member(team_id, get_current_user_id())
  );

-- Users can update their own submissions
-- Managers can update team submissions
CREATE POLICY "Users and managers can update submissions"
  ON daily_submissions FOR UPDATE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can delete their own submissions
-- Managers can delete team submissions
CREATE POLICY "Users and managers can delete submissions"
  ON daily_submissions FOR DELETE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- ============================================================================
-- 12. ATTENDANCE_TIMESHEET RLS POLICIES
-- ============================================================================

-- Users can view their own timesheet
-- Managers can view team timesheets
CREATE POLICY "Users and managers can view timesheets"
  ON attendance_timesheet FOR SELECT
  USING (
    user_id = get_current_user_id()
    OR user_is_team_member(team_id, get_current_user_id())
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can create their own timesheet entries
CREATE POLICY "Users can create their own timesheet entries"
  ON attendance_timesheet FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
    AND user_is_team_member(team_id, get_current_user_id())
  );

-- Users can update their own timesheet
-- Managers can update team timesheets
CREATE POLICY "Users and managers can update timesheets"
  ON attendance_timesheet FOR UPDATE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can delete their own timesheet entries
-- Managers can delete team timesheet entries
CREATE POLICY "Users and managers can delete timesheet entries"
  ON attendance_timesheet FOR DELETE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- ============================================================================
-- 13. SCHEDULED_LEAVES RLS POLICIES
-- ============================================================================

-- Users can view their own leaves
-- Managers can view team leaves
CREATE POLICY "Users and managers can view leaves"
  ON scheduled_leaves FOR SELECT
  USING (
    user_id = get_current_user_id()
    OR user_is_team_member(team_id, get_current_user_id())
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can create their own leave requests
CREATE POLICY "Users can create their own leave requests"
  ON scheduled_leaves FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
    AND user_is_team_member(team_id, get_current_user_id())
  );

-- Users can update their own leaves
-- Managers can update team leaves (for approval)
CREATE POLICY "Users and managers can update leaves"
  ON scheduled_leaves FOR UPDATE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- Users can delete their own leaves
-- Managers can delete team leaves
CREATE POLICY "Users and managers can delete leaves"
  ON scheduled_leaves FOR DELETE
  USING (
    user_id = get_current_user_id()
    OR user_is_team_manager(team_id, get_current_user_id())
    OR user_has_role(get_current_user_id(), 'org_admin')
    OR user_has_role(get_current_user_id(), 'super_admin')
  );

-- ============================================================================
-- 14. APP_SETTINGS RLS POLICIES
-- ============================================================================

-- Users can view settings for their organization/team
CREATE POLICY "Users can view organization settings"
  ON app_settings FOR SELECT
  USING (
    organization_id IS NULL
    OR user_belongs_to_org(organization_id, get_current_user_id())
    OR (
      team_id IS NOT NULL
      AND user_is_team_member(team_id, get_current_user_id())
    )
  );

-- Admins can create settings
CREATE POLICY "Admins can create settings"
  ON app_settings FOR INSERT
  WITH CHECK (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
    OR (
      team_id IS NOT NULL
      AND user_is_team_manager(team_id, get_current_user_id())
    )
  );

-- Admins and team managers can update settings
CREATE POLICY "Admins and managers can update settings"
  ON app_settings FOR UPDATE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
    OR (
      team_id IS NOT NULL
      AND user_is_team_manager(team_id, get_current_user_id())
    )
  );

-- Admins can delete settings
CREATE POLICY "Admins can delete settings"
  ON app_settings FOR DELETE
  USING (
    user_has_role(get_current_user_id(), 'super_admin')
    OR (
      user_has_role(get_current_user_id(), 'org_admin')
      AND (
        organization_id IS NULL
        OR user_belongs_to_org(organization_id, get_current_user_id())
      )
    )
  );

