# TAYA Architecture Overview

## System Architecture

TAYA is a multi-tenant ERP platform built with Next.js, Supabase, and modern web technologies. The architecture is designed for scalability, security, and maintainability.

## Core Principles

1. **Multi-Tenancy**: Complete data isolation between organizations
2. **Hierarchical Management**: Support for managers managing managers
3. **Flexible Permissions**: Granular, template-based permission system
4. **Resource Management**: Unified space and equipment management
5. **Real-time Updates**: Live synchronization across all devices

## Technology Stack

### Frontend
- **Next.js 15.5.4** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Lucide React** - Icons

### Backend
- **Supabase** - PostgreSQL database, Realtime, Row Level Security
- **Next.js API Routes** - Server-side API endpoints

### Infrastructure
- **PostgreSQL** - Primary database
- **Row Level Security (RLS)** - Data isolation
- **Supabase Realtime** - Real-time updates

## Database Architecture

### Core Tables

#### Organizations
- Root of multi-tenancy
- Each organization is completely isolated
- Contains organization-level settings

#### Teams
- Belong to organizations
- Can have multiple managers
- Team-level settings and configuration

#### Users
- Enhanced role system (super_admin, org_admin, senior_manager, manager, lead, member)
- Belong to organizations
- Can be members of multiple teams

#### User-Teams
- Many-to-many relationship
- Supports multiple managers per team
- Hierarchical reporting structure

### Resource Management

#### Spaces
- Hierarchical structure (buildings → floors → departments → rooms → desks)
- Support for various space types
- Location and feature tracking

#### Resource Allocations
- Desk bookings
- Room reservations
- Equipment checkout
- Recurring allocations

#### Equipment
- Asset tracking
- Allocation management
- Maintenance tracking

### Permissions System

#### Permission Templates
- Reusable permission sets
- Organization-specific templates
- Granular permission definitions

#### User Permissions
- Template-based or custom
- Effective permission computation
- Context-aware (org/team level)

## Service Layer

### Core Services

- **OrganizationService** - Organization CRUD and management
- **TeamService** - Team management with multi-manager support
- **UserService** - User management with hierarchy support
- **DataService** - Team-aware data operations
- **AuthService** - Authentication with org/team context

### Advanced Services

- **ResourceService** - Space and equipment management
- **HierarchyService** - Management hierarchy operations
- **PermissionService** - Permission checking and management
- **AllocationService** - Resource booking and allocation

## Component Architecture

### Component Organization

```
src/components/
├── AdminPanel/          # Organization admin components
├── ManagerDashboard/    # Manager-specific components
├── ResourceManagement/  # Resource management UI
├── Hierarchy/          # Hierarchy visualization
└── shared/             # Shared/reusable components
```

### Role-Based Views

- **Super Admin** - Platform-wide management
- **Org Admin** - Organization settings and management
- **Senior Manager** - Multi-team oversight
- **Manager** - Team management dashboard
- **Member** - Task submission and personal dashboard

## Security Architecture

### Row Level Security (RLS)

All tables have RLS policies ensuring:
- Organization-level isolation
- Team-level access control
- Role-based permissions
- Hierarchical access (managers see their teams)

### Permission System

- Template-based permissions
- Custom permission overrides
- Effective permission computation
- Context-aware checks (org/team/user)

### Authentication

- Custom authentication system
- Session management with org/team context
- Role-based access control
- Secure password hashing

## Data Flow

1. **User Authentication** → Org/Team context established
2. **Permission Check** → Verify user has required permissions
3. **Data Query** → Filtered by org/team via RLS
4. **Real-time Updates** → Supabase Realtime subscriptions
5. **UI Update** → React state management

## Scalability Considerations

- Database indexes on all foreign keys
- Efficient RLS policies
- Caching strategy for frequently accessed data
- Lazy loading for heavy components
- Optimized queries with proper joins

## Future Enhancements

- Mobile app (React Native)
- Advanced analytics with ML
- API for third-party integrations
- Custom workflows
- Bulk operations
- Export/import functionality

