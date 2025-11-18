/*
  # TAYA Data Migration - Phase 2
  
  This migration:
  1. Creates a default organization for new installations
  2. Creates a default team
  3. Optionally migrates existing team_members data if it exists
  4. Sets up initial admin user if needed
*/

-- ============================================================================
-- 1. CREATE DEFAULT ORGANIZATION
-- ============================================================================

-- Only create default org if no organizations exist
DO $$
DECLARE
  default_org_id uuid;
  default_team_id uuid;
  admin_user_id uuid;
BEGIN
  -- Check if any organizations exist
  IF NOT EXISTS (SELECT 1 FROM organizations LIMIT 1) THEN
    -- Create default organization
    INSERT INTO organizations (name, slug, settings)
    VALUES (
      'Default Organization',
      'default-org',
      '{"welcome_message": "Welcome to TAYA ERP Platform"}'
    )
    RETURNING id INTO default_org_id;

    RAISE NOTICE 'Created default organization with ID: %', default_org_id;

    -- ============================================================================
    -- 2. CREATE DEFAULT TEAM
    -- ============================================================================

    INSERT INTO teams (organization_id, name, description, settings)
    VALUES (
      default_org_id,
      'Default Team',
      'Initial team for the organization',
      '{}'
    )
    RETURNING id INTO default_team_id;

    RAISE NOTICE 'Created default team with ID: %', default_team_id;

    -- ============================================================================
    -- 3. CREATE DEFAULT ADMIN USER (if no users exist)
    -- ============================================================================

    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
      -- Create a default super admin user
      -- Note: Password should be set via application or user must change on first login
      INSERT INTO users (email, name, role, organization_id, active)
      VALUES (
        'admin@taya.local',
        'System Administrator',
        'super_admin',
        default_org_id,
        true
      )
      RETURNING id INTO admin_user_id;

      -- Add admin to default team as primary_manager
      INSERT INTO user_teams (user_id, team_id, role, permissions)
      VALUES (
        admin_user_id,
        default_team_id,
        'primary_manager',
        '{
          "can_edit_tasks": true,
          "can_approve_leaves": true,
          "can_view_analytics": true,
          "can_manage_members": true,
          "can_allocate_resources": true
        }'
      );

      -- Set admin as team manager
      UPDATE teams SET manager_id = admin_user_id WHERE id = default_team_id;

      RAISE NOTICE 'Created default admin user with ID: %', admin_user_id;
      RAISE NOTICE 'Default admin email: admin@taya.local (password must be set)';
    END IF;

    -- ============================================================================
    -- 4. MIGRATE EXISTING TEAM_MEMBERS (if table exists)
    -- ============================================================================

    -- Check if legacy team_members table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'team_members'
    ) THEN
      RAISE NOTICE 'Found legacy team_members table, attempting migration...';

      -- Migrate team_members to users and user_teams
      -- This assumes team_members has: id, name, email, team_id, role, etc.
      -- Adjust column names based on actual legacy schema

      INSERT INTO users (id, email, name, role, organization_id, active, created_at, updated_at)
      SELECT DISTINCT ON (tm.email)
        COALESCE(tm.user_id, gen_random_uuid()) as id,
        LOWER(COALESCE(tm.email, tm.name || '@migrated.local')) as email,
        tm.name,
        CASE 
          WHEN tm.role = 'manager' THEN 'manager'
          WHEN tm.role = 'admin' THEN 'org_admin'
          ELSE 'member'
        END as role,
        default_org_id as organization_id,
        COALESCE(tm.active, true) as active,
        COALESCE(tm.created_at, now()) as created_at,
        COALESCE(tm.updated_at, now()) as updated_at
      FROM team_members tm
      WHERE NOT EXISTS (
        SELECT 1 FROM users u WHERE u.email = LOWER(COALESCE(tm.email, tm.name || '@migrated.local'))
      )
      ON CONFLICT (email) DO NOTHING;

      -- Migrate team memberships to user_teams
      INSERT INTO user_teams (user_id, team_id, role, joined_at)
      SELECT 
        u.id as user_id,
        COALESCE(tm.team_id, default_team_id) as team_id,
        CASE 
          WHEN tm.role = 'manager' THEN 'primary_manager'
          WHEN tm.role = 'lead' THEN 'lead'
          ELSE 'member'
        END as role,
        COALESCE(tm.created_at, now()) as joined_at
      FROM team_members tm
      INNER JOIN users u ON u.email = LOWER(COALESCE(tm.email, tm.name || '@migrated.local'))
      WHERE NOT EXISTS (
        SELECT 1 FROM user_teams ut 
        WHERE ut.user_id = u.id 
        AND ut.team_id = COALESCE(tm.team_id, default_team_id)
      );

      RAISE NOTICE 'Migration from team_members completed';
    ELSE
      RAISE NOTICE 'No legacy team_members table found, skipping migration';
    END IF;

  ELSE
    RAISE NOTICE 'Organizations already exist, skipping default organization creation';
  END IF;
END $$;

-- ============================================================================
-- 5. UPDATE EXISTING DATA WITHOUT TEAM_ID (if any)
-- ============================================================================

-- Update any daily_submissions without team_id
-- Assign them to user's first team or default team
UPDATE daily_submissions ds
SET team_id = (
  SELECT COALESCE(
    (SELECT ut.team_id FROM user_teams ut WHERE ut.user_id = ds.user_id LIMIT 1),
    (SELECT id FROM teams WHERE organization_id = (SELECT organization_id FROM users WHERE id = ds.user_id) LIMIT 1)
  )
)
WHERE team_id IS NULL OR team_id NOT IN (SELECT id FROM teams);

-- Update any attendance_timesheet without team_id
UPDATE attendance_timesheet at
SET team_id = (
  SELECT COALESCE(
    (SELECT ut.team_id FROM user_teams ut WHERE ut.user_id = at.user_id LIMIT 1),
    (SELECT id FROM teams WHERE organization_id = (SELECT organization_id FROM users WHERE id = at.user_id) LIMIT 1)
  )
)
WHERE team_id IS NULL OR team_id NOT IN (SELECT id FROM teams);

-- Update any scheduled_leaves without team_id
UPDATE scheduled_leaves sl
SET team_id = (
  SELECT COALESCE(
    (SELECT ut.team_id FROM user_teams ut WHERE ut.user_id = sl.user_id LIMIT 1),
    (SELECT id FROM teams WHERE organization_id = (SELECT organization_id FROM users WHERE id = sl.user_id) LIMIT 1)
  )
)
WHERE team_id IS NULL OR team_id NOT IN (SELECT id FROM teams);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Log summary
DO $$
DECLARE
  org_count integer;
  team_count integer;
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO team_count FROM teams;
  SELECT COUNT(*) INTO user_count FROM users;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Organizations: %', org_count;
  RAISE NOTICE '  Teams: %', team_count;
  RAISE NOTICE '  Users: %', user_count;
END $$;

