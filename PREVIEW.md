# TAYA ERP Platform - Preview Guide

## Quick Start Preview

To see the application in action, follow these steps:

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key

### 3. Run Database Migrations

In your Supabase dashboard SQL Editor, run these migrations in order:
1. `supabase/migrations/20250115000000_create_multi_tenant_schema.sql`
2. `supabase/migrations/20250115000001_add_rls_policies.sql`
3. `supabase/migrations/20250115000002_migrate_existing_data.sql`

This will create:
- Default organization ("Default Organization")
- Default team ("Default Team")
- Default admin user (admin@taya.local - password must be set)

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## What You'll See

### Home Page (`/`)
- **AuthForm Component**: Beautiful login/signup form with role-based routing
- Gradient background with glass-morphism design
- Email/password authentication

### Dashboard (`/dashboard`)
After logging in, you'll see:

1. **Manager Dashboard**
   - Stats cards showing team metrics
   - Task completion overview
   - Performance indicators

2. **Task Submission Component**
   - Daily task submission form
   - Team selection (if user belongs to multiple teams)
   - Location tracking (Office, WFH, Leave, etc.)
   - Multiple task entries
   - Date selection

3. **Team Status Component**
   - Real-time team status for selected date
   - Member submission status
   - Leave tracking
   - Stats summary (Total, Submitted, On Leave, Pending)
   - Color-coded status badges

### Features Implemented

✅ **Authentication**
- Email/password sign-in
- Role-based routing (admin → /dashboard/admin, manager → /dashboard/manager)
- Session management
- Team context switching

✅ **Task Management**
- Daily task submissions
- Team-aware submissions
- Location tracking
- Task list management

✅ **Team Status**
- Real-time team status view
- Date-based filtering
- Member status tracking
- Leave management integration

✅ **UI Components**
- Modern, responsive design
- Dark mode support
- Glass-morphism effects
- Smooth animations
- Accessible components

## Current Status

### Completed Phases:
- ✅ Phase 1: Repository Setup & Foundation
- ✅ Phase 2: Database Schema (all tables + RLS policies + migration)
- ✅ Phase 3: Service Layer (all 8 services implemented)
- 🔄 Phase 4: UI Components (3/6 core components done)

### Next Steps:
- User Profile component
- Timesheet component
- Leave Scheduler component
- Manager Dashboard enhancements
- Resource Management UI

## Testing the Application

### Mock Authentication (Development)
For testing without a backend, you can modify `src/app/page.tsx` to use mock authentication.

### With Supabase
1. Set up Supabase project
2. Run migrations
3. Create a user via Supabase dashboard or API
4. Set password hash (use bcrypt or similar)
5. Login with real credentials

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Supabase Connection Issues
- Verify your `.env.local` has correct credentials
- Check Supabase project is active
- Ensure migrations have been run

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

## Preview Screenshots Locations

The application features:
- **Home**: `/` - Authentication page
- **Dashboard**: `/dashboard` - Main dashboard with tasks and team status
- **Teams**: `/dashboard/teams` - Team management
- **Hierarchy**: `/dashboard/hierarchy` - Organization hierarchy
- **Resources**: `/dashboard/resources` - Resource management
- **Settings**: `/dashboard/settings` - User/organization settings

Enjoy exploring TAYA ERP Platform! 🚀

