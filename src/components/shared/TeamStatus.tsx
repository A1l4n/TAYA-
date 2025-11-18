'use client';

import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { DataService } from '@/lib/services/DataService';
import { AuthService } from '@/lib/auth';
import type { TeamStatusItem } from '@/types';

export interface TeamStatusProps {
  teamId: string;
  date?: string;
  onRefresh?: () => void;
}

export function TeamStatus({ teamId, date, onRefresh }: TeamStatusProps) {
  const authUser = AuthService.getCurrentUser();
  const [statusItems, setStatusItems] = useState<TeamStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(date || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const loadStatus = async () => {
      if (!teamId) return;

      setIsLoading(true);
      setError('');

      try {
        const status = await DataService.getTeamStatus(teamId, selectedDate);
        setStatusItems(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load team status');
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [teamId, selectedDate]);

  const getStatusInfo = (item: TeamStatusItem) => {
    if (item.leave) {
      return {
        status: 'leave' as const,
        text: `On ${item.leave.leave_type}`,
        icon: <Calendar className="h-4 w-4" />,
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-200 dark:border-purple-800',
      };
    }

    if (item.submission) {
      return {
        status: 'submitted' as const,
        text: 'Submitted',
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
      };
    }

    return {
      status: 'pending' as const,
      text: 'Pending',
      icon: <Clock className="h-4 w-4" />,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
    };
  };

  const stats = {
    total: statusItems.length,
    submitted: statusItems.filter((item) => item.submission).length,
    onLeave: statusItems.filter((item) => item.leave).length,
    pending: statusItems.filter((item) => !item.submission && !item.leave).length,
  };

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="lg">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <p>{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Team Status
        </h2>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
        />
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.submitted}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Submitted</div>
        </div>
        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.onLeave}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">On Leave</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.pending}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
      </div>

      {/* Team Members List */}
      <div className="space-y-2">
        {statusItems.map((item) => {
          const statusInfo = getStatusInfo(item);
          return (
            <div
              key={item.member.id}
              className={`p-4 rounded-lg border ${statusInfo.border} ${statusInfo.bg} flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${statusInfo.bg}`}>
                  {statusInfo.icon}
                </div>
                <div>
                  <div className="font-medium">{item.member.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {item.member.email}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    statusInfo.status === 'submitted'
                      ? 'success'
                      : statusInfo.status === 'leave'
                      ? 'info'
                      : 'warning'
                  }
                >
                  {statusInfo.text}
                </Badge>
                {item.submission && (
                  <span className="text-xs text-gray-500">
                    {item.submission.location}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {statusItems.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No team members found
        </div>
      )}
    </Card>
  );
}

