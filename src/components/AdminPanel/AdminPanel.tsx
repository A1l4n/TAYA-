'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/auth';
import { InteractiveCard, Button, useToast, StatCard } from '@/components/shared';
import { 
  Settings, 
  Building2, 
  Shield, 
  Calendar, 
  BarChart3, 
  FileText, 
  Grid3x3, 
  Users, 
  TrendingUp,
  LayoutDashboard
} from 'lucide-react';
import { OrganizationSettings } from './OrganizationSettings';
import { SpaceConfiguration } from './SpaceConfiguration';
import { PermissionManager } from './PermissionManager';
import { ResourceAllocationAdmin } from './ResourceAllocationAdmin';
import { SystemAnalytics } from './SystemAnalytics';
import { AuditLog } from './AuditLog';
import { PermissionMatrix } from './PermissionMatrix';
import { TeamComparison } from './TeamComparison';
import { AdvancedAnalytics } from './AdvancedAnalytics';

type AdminView = 
  | 'dashboard'
  | 'organization'
  | 'spaces'
  | 'permissions'
  | 'resources'
  | 'analytics'
  | 'audit'
  | 'permission-matrix'
  | 'team-comparison'
  | 'advanced-analytics';

export function AdminPanel() {
  const router = useRouter();
  const toast = useToast();
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [user, setUser] = useState<{ role: string; name?: string; email?: string; organizationId?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }

    // Check if user has admin privileges
    if (currentUser.role !== 'org_admin' && currentUser.role !== 'super_admin') {
      toast.error('Access Denied', 'You do not have permission to access the admin panel');
      router.push('/dashboard');
      return;
    }

    setUser({
      role: currentUser.role,
      name: currentUser.displayName || 'Admin',
      email: currentUser.email || '',
      organizationId: currentUser.organizationId,
    });
    setLoading(false);
  }, [router, toast]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard' as AdminView, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'organization' as AdminView, label: 'Organization', icon: Settings },
    { id: 'spaces' as AdminView, label: 'Spaces', icon: Building2 },
    { id: 'permissions' as AdminView, label: 'Permissions', icon: Shield },
    { id: 'resources' as AdminView, label: 'Resources', icon: Calendar },
    { id: 'analytics' as AdminView, label: 'Analytics', icon: BarChart3 },
    { id: 'audit' as AdminView, label: 'Audit Log', icon: FileText },
    { id: 'permission-matrix' as AdminView, label: 'Permission Matrix', icon: Grid3x3 },
    { id: 'team-comparison' as AdminView, label: 'Team Comparison', icon: Users },
    { id: 'advanced-analytics' as AdminView, label: 'Advanced Analytics', icon: TrendingUp },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <AdminDashboard organizationId={user.organizationId!} />;
      case 'organization':
        return <OrganizationSettings organizationId={user.organizationId!} />;
      case 'spaces':
        return <SpaceConfiguration organizationId={user.organizationId!} />;
      case 'permissions':
        return <PermissionManager organizationId={user.organizationId!} />;
      case 'resources':
        return <ResourceAllocationAdmin organizationId={user.organizationId!} />;
      case 'analytics':
        return <SystemAnalytics organizationId={user.organizationId!} />;
      case 'audit':
        return <AuditLog organizationId={user.organizationId!} />;
      case 'permission-matrix':
        return <PermissionMatrix organizationId={user.organizationId!} />;
      case 'team-comparison':
        return <TeamComparison organizationId={user.organizationId!} />;
      case 'advanced-analytics':
        return <AdvancedAnalytics organizationId={user.organizationId!} />;
      default:
        return <AdminDashboard organizationId={user.organizationId!} />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Admin Panel
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your organization settings, permissions, and resources
        </p>
      </div>

      {/* Navigation Menu */}
      <InteractiveCard variant="elevated" className="p-4">
        <div className="flex flex-wrap gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'primary' : 'ghost'}
                onClick={() => setCurrentView(item.id)}
                className="flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            );
          })}
        </div>
      </InteractiveCard>

      {/* Current View */}
      {renderView()}
    </div>
  );
}

// Admin Dashboard Component
function AdminDashboard({ organizationId }: { organizationId: string }) {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTeams: 0,
    totalSpaces: 0,
    activeAllocations: 0,
  });

  useEffect(() => {
    // Load stats - in production, this would fetch from services
    // For now, using mock data
    setStats({
      totalUsers: 156,
      totalTeams: 12,
      totalSpaces: 48,
      activeAllocations: 234,
    });
  }, [organizationId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          id="users"
          label="Total Users"
          value={stats.totalUsers.toString()}
          change="+12 this month"
          trend="up"
          icon={<Users className="h-8 w-8" />}
          color="from-blue-500 to-blue-600"
        />
        <StatCard
          id="teams"
          label="Total Teams"
          value={stats.totalTeams.toString()}
          change="+2 this month"
          trend="up"
          icon={<Users className="h-8 w-8" />}
          color="from-green-500 to-green-600"
        />
        <StatCard
          id="spaces"
          label="Total Spaces"
          value={stats.totalSpaces.toString()}
          change="+5 this month"
          trend="up"
          icon={<Building2 className="h-8 w-8" />}
          color="from-purple-500 to-purple-600"
        />
        <StatCard
          id="allocations"
          label="Active Allocations"
          value={stats.activeAllocations.toString()}
          change="+18 this week"
          trend="up"
          icon={<Calendar className="h-8 w-8" />}
          color="from-yellow-500 to-yellow-600"
        />
      </div>

      <InteractiveCard variant="elevated">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start">
            <Settings className="h-4 w-4 mr-2" />
            Configure Organization
          </Button>
          <Button variant="outline" className="justify-start">
            <Shield className="h-4 w-4 mr-2" />
            Manage Permissions
          </Button>
          <Button variant="outline" className="justify-start">
            <Building2 className="h-4 w-4 mr-2" />
            Configure Spaces
          </Button>
        </div>
      </InteractiveCard>
    </div>
  );
}


