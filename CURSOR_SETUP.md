# Cursor Setup for TAYA Development

## Switching from kickoff-main to TAYA

1. **Close kickoff-main project in Cursor**
   - File → Close Folder
   - Or close the Cursor window

2. **Open TAYA project**
   - File → Open Folder
   - Navigate to: `C:\Users\apo\Downloads\TAYA`
   - Click "Select Folder"

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set up Environment Variables**
   - Create `.env.local` file in the root directory
   - Copy the structure from `.env.example` (create it if needed)
   - Add your Supabase credentials

5. **Verify Setup**
   ```bash
   npm run dev
   ```
   - Should start the dev server on http://localhost:3000

## Next Development Steps

Once the project is open in Cursor:

1. **Database Migrations** (Phase 1)
   - Create migration files in `supabase/migrations/`
   - Start with organizations, teams, users tables

2. **Service Implementation** (Phase 2)
   - Implement OrganizationService
   - Implement TeamService
   - Implement UserService
   - And other services

3. **Component Development** (Phase 3)
   - Create authentication components
   - Create manager dashboard
   - Create resource management UI

## Project Structure

```
TAYA/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/              # Services and utilities
│   ├── types/            # TypeScript definitions
│   └── hooks/            # Custom hooks
├── supabase/
│   └── migrations/       # Database migrations
└── docs/                 # Documentation
```

## Development Workflow

1. Check current todos in the plan
2. Work on dependencies first
3. Mark todos as in_progress when starting
4. Mark as completed when done
5. Continue to next todo

