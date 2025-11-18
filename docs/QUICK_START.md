# Quick Start Guide

## Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- A Supabase account (free tier works)
- Git

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/TAYA.git
cd TAYA
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your project URL and anon key
3. Go to SQL Editor in your Supabase dashboard

## Step 4: Run Database Migrations

Run the migration files from `supabase/migrations/` in order:

1. `20250115000000_create_multi_tenant_schema.sql`
2. `20250115000001_migrate_existing_data.sql`
3. `20250115000002_add_rls_policies.sql`
4. `20250115000003_create_default_org.sql`

## Step 5: Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Email configuration
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_app_password
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=noreply@yourdomain.com
```

## Step 6: Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7: Create Your First Organization

1. Sign up as a super admin (or use the default admin account)
2. Create your first organization
3. Create your first team
4. Invite team members

## Next Steps

- Read the [Architecture Overview](./ARCHITECTURE.md)
- Review the [Database Schema](./DATABASE_SCHEMA.md)
- Explore the component structure
- Set up your organization and teams

## Troubleshooting

### Database Connection Issues

- Verify your Supabase URL and key are correct
- Check that migrations have been run
- Ensure RLS policies are active

### Build Errors

- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`

### Permission Issues

- Verify user roles are set correctly
- Check permission templates are created
- Review RLS policies

## Getting Help

- Check the documentation in the `docs/` folder
- Open an issue on GitHub
- Contact the maintainers

