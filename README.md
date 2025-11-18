# TAYA - Multi-Tenant ERP Platform

A modern, enterprise-grade multi-tenant ERP platform with hierarchical management, resource allocation, and advanced permissions system.

## Features

### Core Features
- ✅ **Multi-Tenant Architecture** - Complete organization isolation
- ✅ **Hierarchical Management** - Managers can manage other managers
- ✅ **Multiple Managers Per Team** - Co-management and shared responsibility
- ✅ **Resource Management** - Spaces, desks, rooms, equipment tracking
- ✅ **Advanced Permissions** - Granular, template-based permission system
- ✅ **Real-time Updates** - Live synchronization across all devices
- ✅ **Task Management** - Daily task submission and tracking
- ✅ **Timesheet & Attendance** - Comprehensive attendance tracking
- ✅ **Leave Management** - Leave requests and approval workflows

### Advanced Features
- 🎯 **Smart Analytics** - Predictive insights and recommendations
- 📊 **Team Comparison** - Compare multiple teams side-by-side
- 🏢 **Space Allocation** - Desk booking, room reservations, equipment checkout
- 🔐 **Permission Matrix** - Visual permission overview
- 📈 **Advanced Reporting** - Custom reports and exports
- 🔄 **Audit Logging** - Complete audit trail for sensitive operations

## Tech Stack

- **Frontend**: Next.js 15.5.4 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL, Realtime, Row Level Security)
- **Email**: Nodemailer with SMTP
- **Icons**: Lucide React
- **Validation**: Zod

## Quick Start

### Prerequisites

- Node.js 20+ installed
- A Supabase project (free tier works)
- (Optional) SMTP credentials for email functionality

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/TAYA.git
cd TAYA
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon/public key
- (Optional) SMTP credentials for email

4. Run database migrations:

In your Supabase dashboard, run the SQL files from `supabase/migrations/` in order.

5. Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
TAYA/
├── .github/
│   └── workflows/          # CI/CD workflows
├── src/
│   ├── app/               # Next.js app router
│   │   ├── api/           # API routes
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/        # React components
│   │   ├── AdminPanel/    # Admin components
│   │   ├── ManagerDashboard/  # Manager components
│   │   ├── ResourceManagement/  # Resource management
│   │   ├── Hierarchy/     # Hierarchy visualization
│   │   └── shared/        # Shared components
│   ├── lib/               # Services and utilities
│   │   ├── services/      # Business logic services
│   │   ├── auth.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── hooks/             # Custom React hooks
│   ├── types/             # TypeScript definitions
│   └── styles/            # Global styles
├── supabase/
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── docs/                  # Documentation
└── tests/                 # Test files
```

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md) - System architecture and design decisions
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Complete database schema documentation
- [Quick Start Guide](./docs/QUICK_START.md) - Detailed setup instructions
- [API Documentation](./docs/API_DOCUMENTATION.md) - API endpoints and usage

## Role Hierarchy

```
Super Admin (Platform Owner)
├─ Full system access
├─ Create/manage organizations
└─ Platform-wide settings

Organization Admin (Org Admin)
├─ Full org access
├─ Create/manage teams
├─ Manage all org members
├─ Resource allocation (org-wide)
└─ Analytics (org-wide)

Senior Manager (Manages Managers)
├─ Manage multiple teams
├─ Manage other managers
├─ Cross-team analytics
└─ Strategic oversight

Manager (Team Manager)
├─ Manage team members
├─ View team tasks/timesheets
├─ Approve leaves
└─ Resource allocation (team level)

Co-Manager (Multiple Managers Per Team)
├─ Same as Manager
├─ Works alongside other managers
└─ Shared team responsibility

Lead (Team Lead)
├─ Delegate tasks
├─ View team status
└─ Reports to Manager

Member (Team Member)
├─ Submit tasks
├─ Fill timesheets
├─ Request leaves
└─ Book resources
```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

For support, please open an issue on GitHub or contact the maintainers.

---

**Built with ❤️ for modern teams**

