'use client';

import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { AdminPanel } from '@/components/AdminPanel/AdminPanel';
import { AuthService } from '@/lib/auth';
import { PermissionGuard } from '@/components/shared/PermissionGuard';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: UserRole; name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }

    // Check if user is admin
    if (!['super_admin', 'org_admin'].includes(currentUser.role)) {
      router.push('/dashboard');
      return;
    }

    setUser({
      role: currentUser.role,
      name: currentUser.displayName || 'User',
      email: currentUser.email || '',
    });

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <PermissionGuard
      permission="analytics.view_org"
      showError={true}
    >
      <DashboardLayout
        userRole={user.role}
        userName={user.name}
        userEmail={user.email}
      >
        <AdminPanel />
      </DashboardLayout>
    </PermissionGuard>
  );
}

