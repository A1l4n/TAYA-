'use client';

import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { TaskSubmission, TeamStatus, UserProfile, Timesheet, LeaveScheduler } from '@/components/shared';
import { AuthService } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ComponentsDemoPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; name?: string; email?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTeamId, setCurrentTeamId] = useState<string>('');

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      router.push('/');
      return;
    }
    
    setUser({
      role: currentUser.role || 'member',
      name: currentUser.displayName || 'User',
      email: currentUser.email || '',
    });

    if (currentUser.currentTeamId) {
      setCurrentTeamId(currentUser.currentTeamId);
    } else if (currentUser.teams.length > 0) {
      setCurrentTeamId(currentUser.teams[0].teamId);
    }

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
    <DashboardLayout
      userRole={user.role as any}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Component Showcase</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Preview all Phase 4 UI components
          </p>
        </div>

        {/* User Profile */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">User Profile</h2>
          <UserProfile editable={true} />
        </section>

        {/* Task Submission & Team Status */}
        {currentTeamId && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Task Management</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskSubmission teamId={currentTeamId} />
              <TeamStatus teamId={currentTeamId} />
            </div>
          </section>
        )}

        {/* Timesheet */}
        {currentTeamId && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Timesheet</h2>
            <Timesheet teamId={currentTeamId} managerView={['manager', 'senior_manager', 'org_admin', 'super_admin'].includes(user.role)} />
          </section>
        )}

        {/* Leave Scheduler */}
        {currentTeamId && (
          <section>
            <h2 className="text-2xl font-semibold mb-4">Leave Scheduler</h2>
            <LeaveScheduler teamId={currentTeamId} managerView={['manager', 'senior_manager', 'org_admin', 'super_admin'].includes(user.role)} />
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

