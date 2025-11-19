'use client';

import { DashboardLayout } from '@/components/shared/DashboardLayout';
import { ManagerDashboard } from '@/components/ManagerDashboard/Dashboard';
import { TaskSubmission, TeamStatus, Timesheet, LeaveScheduler } from '@/components/shared';
import { AuthService } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
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

    // Set current team ID
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

  const isManager = ['manager', 'senior_manager', 'org_admin', 'super_admin'].includes(user.role);

  return (
    <DashboardLayout
      userRole={user.role as any}
      userName={user.name}
      userEmail={user.email}
    >
      <div className="space-y-6">
        <ManagerDashboard />
        
        {currentTeamId && (
          <>
            {/* Task Submission & Team Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TaskSubmission teamId={currentTeamId} />
              <TeamStatus teamId={currentTeamId} />
            </div>
            
            {/* Timesheet */}
            <Timesheet 
              teamId={currentTeamId} 
              managerView={isManager}
            />
            
            {/* Leave Scheduler */}
            <LeaveScheduler 
              teamId={currentTeamId} 
              managerView={isManager}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
