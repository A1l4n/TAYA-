# Database Migrations

This directory contains SQL migration files for the TAYA database schema.

## Migration Naming Convention

Migrations should be named with the following format:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20250115000000_create_multi_tenant_schema.sql`

## Migration Order

Migrations must be run in chronological order:

1. `20250115000000_create_multi_tenant_schema.sql` - Core multi-tenant tables
2. `20250115000001_migrate_existing_data.sql` - Data migration
3. `20250115000002_add_rls_policies.sql` - Row Level Security policies
4. `20250115000003_create_default_org.sql` - Default organization setup

## Running Migrations

Run migrations in your Supabase dashboard SQL Editor in order, or use the Supabase CLI:

```bash
supabase db push
```

## Rollback

Each migration should include rollback instructions in comments. To rollback, run the reverse operations in reverse order.

