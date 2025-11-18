/*
  # TAYA Multi-Tenant Schema - Phase 1
  
  Creates the core multi-tenant tables:
  1. organizations - Root of multi-tenancy
  2. teams - Teams within organizations
  3. users - Enhanced user system with roles
  4. user_teams - Many-to-many with multiple managers support
  5. management_hierarchy - Managers managing managers
  6. spaces - Resource management (buildings, floors, rooms, desks)
  7. resource_allocations - Desk bookings, room reservations
  8. equipment - Asset tracking
  9. permission_templates - Reusable permission sets
  10. user_permissions - Custom permission overrides
  11. daily_submissions - Team-aware task submissions
  12. attendance_timesheet - Team-aware attendance
  13. scheduled_leaves - Team-aware leaves
*/

-- ============================================================================
-- 1. ORGANIZATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created ON organizations(created_at);

-- ============================================================================
-- 2. USERS TABLE (Enhanced Role System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  password_hash text,
  role text NOT NULL CHECK (role IN (
    'super_admin',
    'org_admin',
    'senior_manager',
    'manager',
    'lead',
    'member'
  )),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);

-- ============================================================================
-- 3. TEAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  manager_id uuid REFERENCES users(id),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_manager ON teams(manager_id);

-- ============================================================================
-- 4. USER-TEAMS JUNCTION TABLE (Multiple Managers Support)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_teams (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'primary_manager',
    'co_manager',
    'lead',
    'member'
  )),
  reports_to uuid REFERENCES users(id),
  manages_users uuid[] DEFAULT ARRAY[]::uuid[],
  permissions jsonb DEFAULT '{
    "can_edit_tasks": true,
    "can_approve_leaves": true,
    "can_view_analytics": true,
    "can_manage_members": false,
    "can_allocate_resources": false
  }',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_reports_to ON user_teams(reports_to);
CREATE INDEX IF NOT EXISTS idx_user_teams_role ON user_teams(role);

-- ============================================================================
-- 5. MANAGEMENT HIERARCHY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS management_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manages_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  scope text DEFAULT 'team' CHECK (scope IN ('team', 'org_wide')),
  level integer DEFAULT 1,
  delegated_permissions jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(manager_id, manages_user_id, team_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_hierarchy_manager ON management_hierarchy(manager_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_manages ON management_hierarchy(manages_user_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_team ON management_hierarchy(team_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_org ON management_hierarchy(organization_id);
CREATE INDEX IF NOT EXISTS idx_hierarchy_active ON management_hierarchy(active);

-- ============================================================================
-- 6. SPACES TABLE (Resource Management)
-- ============================================================================

CREATE TABLE IF NOT EXISTS spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  space_type text NOT NULL CHECK (space_type IN (
    'building',
    'floor',
    'department',
    'room',
    'desk',
    'parking_spot',
    'equipment'
  )),
  name text NOT NULL,
  code text,
  description text,
  capacity integer,
  location jsonb,
  floor_number integer,
  area_sqm numeric,
  features jsonb DEFAULT '{}',
  amenities text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'unavailable')),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spaces_org ON spaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_spaces_type ON spaces(space_type);
CREATE INDEX IF NOT EXISTS idx_spaces_parent ON spaces(parent_space_id);
CREATE INDEX IF NOT EXISTS idx_spaces_status ON spaces(status);

-- ============================================================================
-- 7. RESOURCE ALLOCATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS resource_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  space_id uuid NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN (
    'desk',
    'room',
    'parking',
    'equipment',
    'vehicle'
  )),
  allocated_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  allocated_to_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,
  recurrence_pattern jsonb,
  status text DEFAULT 'active' CHECK (status IN (
    'active',
    'pending',
    'cancelled',
    'expired'
  )),
  notes text,
  created_by uuid REFERENCES users(id),
  approved_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_allocations_space ON resource_allocations(space_id);
CREATE INDEX IF NOT EXISTS idx_allocations_user ON resource_allocations(allocated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_team ON resource_allocations(allocated_to_team_id);
CREATE INDEX IF NOT EXISTS idx_allocations_dates ON resource_allocations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_allocations_status ON resource_allocations(status);
CREATE INDEX IF NOT EXISTS idx_allocations_org ON resource_allocations(organization_id);

-- ============================================================================
-- 8. EQUIPMENT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  brand text,
  model text,
  serial_number text UNIQUE,
  space_id uuid REFERENCES spaces(id) ON DELETE SET NULL,
  allocated_to_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text DEFAULT 'available' CHECK (status IN (
    'available',
    'allocated',
    'maintenance',
    'retired'
  )),
  purchase_date date,
  purchase_cost numeric,
  current_value numeric,
  specifications jsonb DEFAULT '{}',
  warranty_info jsonb DEFAULT '{}',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_org ON equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_user ON equipment(allocated_to_user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment(category);

-- ============================================================================
-- 9. PERMISSION TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{
    "tasks": {
      "view_own": true,
      "view_team": false,
      "create": true,
      "edit_own": true,
      "edit_team": false,
      "delete_own": false,
      "approve": false
    },
    "timesheet": {
      "view_own": true,
      "view_team": false,
      "edit_own": true,
      "approve_team": false
    },
    "leaves": {
      "view_own": true,
      "view_team": false,
      "request": true,
      "approve_team": false
    },
    "resources": {
      "view": false,
      "book": false,
      "allocate": false,
      "manage": false
    },
    "analytics": {
      "view_own": true,
      "view_team": false,
      "view_org": false
    },
    "members": {
      "view": true,
      "add": false,
      "edit": false,
      "remove": false
    }
  }',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permission_templates_org ON permission_templates(organization_id);

-- ============================================================================
-- 10. USER PERMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  source text CHECK (source IN ('role', 'template', 'custom')),
  template_id uuid REFERENCES permission_templates(id) ON DELETE SET NULL,
  custom_permissions jsonb,
  effective_permissions jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_team ON user_permissions(team_id);

-- ============================================================================
-- 11. DAILY SUBMISSIONS TABLE (Team-Aware)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  location text NOT NULL,
  tasks text[] DEFAULT ARRAY[]::text[],
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(date, user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_team ON daily_submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON daily_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_date ON daily_submissions(team_id, date);
CREATE INDEX IF NOT EXISTS idx_submissions_date ON daily_submissions(date);

-- ============================================================================
-- 12. ATTENDANCE TIMESHEET TABLE (Team-Aware)
-- ============================================================================

CREATE TABLE IF NOT EXISTS attendance_timesheet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  date date NOT NULL,
  attendance_type text NOT NULL CHECK (attendance_type IN (
    'work',
    'leave',
    'sick_leave',
    'half_day',
    'wfh',
    'holiday'
  )),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_timesheet_team ON attendance_timesheet(team_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_user ON attendance_timesheet(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_team_date ON attendance_timesheet(team_id, date);
CREATE INDEX IF NOT EXISTS idx_timesheet_date ON attendance_timesheet(date);

-- ============================================================================
-- 13. SCHEDULED LEAVES TABLE (Team-Aware)
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(leave_date, user_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_leaves_team ON scheduled_leaves(team_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON scheduled_leaves(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_team_date ON scheduled_leaves(team_id, leave_date);
CREATE INDEX IF NOT EXISTS idx_leaves_date ON scheduled_leaves(leave_date);

-- ============================================================================
-- 14. APP SETTINGS TABLE (Organization-Scoped)
-- ============================================================================

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  webhook_url text DEFAULT '',
  auto_send_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settings_org ON app_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_team ON app_settings(team_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_timesheet ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be created in a separate migration file
-- (20250115000002_add_rls_policies.sql)

