// Global type definitions for TAYA ERP Platform

// ============================================================================
// Organization & Multi-Tenancy Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Team Types
// ============================================================================

export interface Team {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  manager_id?: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface UserTeam {
  user_id: string;
  team_id: string;
  role: 'primary_manager' | 'co_manager' | 'lead' | 'member';
  reports_to?: string;
  manages_users?: string[];
  permissions: Record<string, unknown>;
  joined_at: string;
}

// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'super_admin' | 'org_admin' | 'senior_manager' | 'manager' | 'lead' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash?: string;
  role: UserRole;
  organization_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  uid: string;
  email: string;
  displayName?: string;
  userId: string;
  organizationId: string;
  teams: Array<{
    teamId: string;
    role: 'primary_manager' | 'co_manager' | 'lead' | 'member';
    name: string;
  }>;
  currentTeamId?: string;
  role: UserRole;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Hierarchical Management Types
// ============================================================================

export interface ManagementHierarchy {
  id: string;
  organization_id: string;
  manager_id: string;
  manages_user_id: string;
  team_id?: string;
  scope: 'team' | 'org_wide';
  level: number;
  delegated_permissions: Record<string, unknown>;
  active: boolean;
  started_at: string;
  ended_at?: string;
}

// ============================================================================
// Resource Management Types
// ============================================================================

export type SpaceType = 'building' | 'floor' | 'department' | 'room' | 'desk' | 'parking_spot' | 'equipment';

export interface Space {
  id: string;
  organization_id: string;
  parent_space_id?: string;
  space_type: SpaceType;
  name: string;
  code?: string;
  description?: string;
  capacity?: number;
  location?: {
    address?: string;
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  };
  floor_number?: number;
  area_sqm?: number;
  features: Record<string, unknown>;
  amenities?: string[];
  status: 'active' | 'maintenance' | 'unavailable';
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type ResourceType = 'desk' | 'room' | 'parking' | 'equipment' | 'vehicle';

export interface ResourceAllocation {
  id: string;
  organization_id: string;
  team_id?: string;
  space_id: string;
  resource_type: ResourceType;
  allocated_to_user_id?: string;
  allocated_to_team_id?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  recurrence_pattern?: {
    type: 'daily' | 'weekly' | 'monthly';
    days?: number[];
    interval?: number;
  };
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  notes?: string;
  created_by?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  organization_id: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  space_id?: string;
  allocated_to_user_id?: string;
  status: 'available' | 'allocated' | 'maintenance' | 'retired';
  purchase_date?: string;
  purchase_cost?: number;
  current_value?: number;
  specifications: Record<string, unknown>;
  warranty_info?: Record<string, unknown>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Permission Types
// ============================================================================

export interface PermissionTemplate {
  id: string;
  organization_id?: string;
  name: string;
  description?: string;
  permissions: {
    tasks?: {
      view_own?: boolean;
      view_team?: boolean;
      create?: boolean;
      edit_own?: boolean;
      edit_team?: boolean;
      delete_own?: boolean;
      approve?: boolean;
    };
    timesheet?: {
      view_own?: boolean;
      view_team?: boolean;
      edit_own?: boolean;
      approve_team?: boolean;
    };
    leaves?: {
      view_own?: boolean;
      view_team?: boolean;
      request?: boolean;
      approve_team?: boolean;
    };
    resources?: {
      view?: boolean;
      book?: boolean;
      allocate?: boolean;
      manage?: boolean;
    };
    analytics?: {
      view_own?: boolean;
      view_team?: boolean;
      view_org?: boolean;
    };
    members?: {
      view?: boolean;
      add?: boolean;
      edit?: boolean;
      remove?: boolean;
    };
  };
  created_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  organization_id?: string;
  team_id?: string;
  source?: 'role' | 'template' | 'custom';
  template_id?: string;
  custom_permissions?: Record<string, unknown>;
  effective_permissions: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Data Types (Team-Aware)
// ============================================================================

export type LocationType = 'Office' | 'WFH' | 'Local Leave' | 'Sick Leave' | 'Half Day Leave';

export type LeaveType = 'Local Leave' | 'Sick Leave' | 'Half Day Leave' | 'WFH';

export type AttendanceType = 'work' | 'leave' | 'sick_leave' | 'half_day' | 'wfh' | 'holiday';

export interface DailySubmission {
  id?: string;
  date: string;
  user_id: string;
  team_id: string;
  location: LocationType;
  tasks: string[];
  submitted_at?: string;
}

export interface AttendanceRecord {
  id?: string;
  user_id: string;
  team_id: string;
  date: string;
  attendance_type: AttendanceType;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ScheduledLeave {
  id?: string;
  user_id: string;
  team_id: string;
  leave_date: string;
  leave_type: LeaveType;
  created_at?: string;
}

// ============================================================================
// Component Prop Types
// ============================================================================

export interface TaskSubmissionProps {
  userId: string;
  currentDate: string;
  teamId?: string;
}

export interface TeamStatusProps {
  currentDate: string;
  teamId: string;
}

export interface LeaveSchedulerProps {
  currentDate: string;
  teamId?: string;
}

export interface AuthFormProps {
  onSuccess: () => void;
}

// ============================================================================
// Status & Completion Types
// ============================================================================

export interface TeamStatusItem {
  member: User;
  submission: DailySubmission | null;
  leave: ScheduledLeave | null;
}

export interface StatusInfo {
  status: 'pending' | 'submitted' | 'leave';
  text: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}

export interface TeamCompletion {
  allComplete: boolean;
  lastSubmitter: string | null;
}

// ============================================================================
// Error & Response Types
// ============================================================================

export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  userId?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Form Types
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface TaskFormData {
  location: LocationType;
  tasks: string[];
  teamId: string;
}

export interface LeaveFormData {
  userId: string;
  leaveDate: string;
  leaveType: LeaveType;
  teamId: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// Event Types
// ============================================================================

export interface SubmissionSavedEvent extends CustomEvent {
  detail: {
    date: string;
    userId: string;
    teamId: string;
  };
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  name: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  features: {
    analytics: boolean;
    errorReporting: boolean;
    caching: boolean;
  };
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface NavigationItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  active?: boolean;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

