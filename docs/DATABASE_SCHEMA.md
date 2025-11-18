# Database Schema Documentation

## Overview

TAYA uses PostgreSQL with Supabase, implementing a comprehensive multi-tenant schema with hierarchical management, resource allocation, and advanced permissions.

## Core Tables

### Organizations

Root of multi-tenancy. Each organization is completely isolated.

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Teams

Teams belong to organizations and can have multiple managers.

```sql
CREATE TABLE teams (
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
```

### Users

Enhanced role system supporting hierarchical management.

```sql
CREATE TABLE users (
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
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### User-Teams

Many-to-many relationship supporting multiple managers per team.

```sql
CREATE TABLE user_teams (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN (
    'primary_manager',
    'co_manager',
    'lead',
    'member'
  )),
  reports_to uuid REFERENCES users(id),
  manages_users uuid[],
  permissions jsonb DEFAULT '{}',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, team_id)
);
```

## Hierarchical Management

### Management Hierarchy

Tracks who manages whom across the organization.

```sql
CREATE TABLE management_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  manages_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id),
  scope text DEFAULT 'team' CHECK (scope IN ('team', 'org_wide')),
  level integer DEFAULT 1,
  delegated_permissions jsonb DEFAULT '{}',
  active boolean DEFAULT true,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  UNIQUE(manager_id, manages_user_id, team_id, scope)
);
```

## Resource Management

### Spaces

Hierarchical space structure (buildings → floors → rooms → desks).

```sql
CREATE TABLE spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parent_space_id uuid REFERENCES spaces(id),
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
  amenities text[],
  status text DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'unavailable')),
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Resource Allocations

Desk bookings, room reservations, equipment checkout.

```sql
CREATE TABLE resource_allocations (
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
  allocated_to_user_id uuid REFERENCES users(id),
  allocated_to_team_id uuid REFERENCES teams(id),
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
```

### Equipment

Asset tracking and management.

```sql
CREATE TABLE equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  brand text,
  model text,
  serial_number text UNIQUE,
  space_id uuid REFERENCES spaces(id),
  allocated_to_user_id uuid REFERENCES users(id),
  status text DEFAULT 'available' CHECK (status IN (
    'available',
    'allocated',
    'maintenance',
    'retired'
  )),
  purchase_date date,
  purchase_cost numeric,
  current_value numeric,
  specifications jsonb,
  warranty_info jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Permissions System

### Permission Templates

Reusable permission sets.

```sql
CREATE TABLE permission_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

### User Permissions

Custom permission overrides.

```sql
CREATE TABLE user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id),
  team_id uuid REFERENCES teams(id),
  source text CHECK (source IN ('role', 'template', 'custom')),
  template_id uuid REFERENCES permission_templates(id),
  custom_permissions jsonb,
  effective_permissions jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id, team_id)
);
```

## Data Tables (Team-Aware)

### Daily Submissions

```sql
CREATE TABLE daily_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  location text NOT NULL,
  tasks text[] DEFAULT ARRAY[]::text[],
  submitted_at timestamptz DEFAULT now(),
  UNIQUE(date, user_id, team_id)
);
```

### Attendance Timesheet

```sql
CREATE TABLE attendance_timesheet (
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
```

### Scheduled Leaves

```sql
CREATE TABLE scheduled_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  leave_date date NOT NULL,
  leave_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(leave_date, user_id, team_id)
);
```

## Indexes

All foreign keys and frequently queried columns are indexed for optimal performance.

## Row Level Security

All tables have RLS enabled with policies ensuring:
- Organization-level data isolation
- Team-level access control
- Role-based permissions
- Hierarchical access patterns

