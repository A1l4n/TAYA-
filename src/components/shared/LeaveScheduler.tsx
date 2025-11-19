'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle, Plus } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { Modal } from './Modal';
import { Input } from './Input';
import { DataService } from '@/lib/services/DataService';
import { AuthService } from '@/lib/auth';
import { TeamService } from '@/lib/services/TeamService';
import type { ScheduledLeave, LeaveType, User } from '@/types';

export interface LeaveSchedulerProps {
  teamId?: string;
  currentDate?: string;
  managerView?: boolean;
}

export function LeaveScheduler({
  teamId,
  currentDate,
  managerView = false,
}: LeaveSchedulerProps) {
  const authUser = AuthService.getCurrentUser();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || '');
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [leaves, setLeaves] = useState<ScheduledLeave[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    currentDate || new Date().toISOString().split('T')[0]
  );
  const [viewMonth, setViewMonth] = useState(new Date().toISOString().split('T')[0].slice(0, 7));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveType, setLeaveType] = useState<LeaveType>('Local Leave');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const leaveTypes: LeaveType[] = ['Local Leave', 'Sick Leave', 'Half Day Leave', 'WFH'];

  useEffect(() => {
    if (authUser) {
      const loadTeams = async () => {
        try {
          const userTeams = await TeamService.getTeamsByUser(authUser.userId);
          setAvailableTeams(userTeams.map((t) => ({ id: t.id, name: t.name })));
          
          if (!selectedTeamId && userTeams.length > 0) {
            setSelectedTeamId(authUser.currentTeamId || userTeams[0].id);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load teams');
        }
      };
      loadTeams();
    }
  }, [authUser, selectedTeamId]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedTeamId) return;

      setIsLoading(true);
      setError('');

      try {
        // Load leaves for the month
        const monthStart = new Date(viewMonth + '-01');
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        
        const leavesData = await DataService.getLeavesByTeam(
          selectedTeamId,
          monthStart.toISOString().split('T')[0]
        );
        
        // Filter for the month
        const monthLeaves = leavesData.filter(
          (leave) =>
            leave.leave_date >= monthStart.toISOString().split('T')[0] &&
            leave.leave_date <= monthEnd.toISOString().split('T')[0]
        );
        
        setLeaves(monthLeaves);

        // Load team members if manager view
        if (managerView) {
          const members = await TeamService.getTeamMembersWithUsers(selectedTeamId);
          setTeamMembers(members.map((m) => m.user));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaves');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedTeamId, viewMonth, managerView]);

  const handleScheduleLeave = async () => {
    if (!selectedTeamId || !leaveDate) {
      setError('Please select a date');
      return;
    }

    const userId = managerView && selectedUserId ? selectedUserId : authUser?.userId;
    if (!userId) {
      setError('User not found');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await DataService.scheduleLeave({
        user_id: userId,
        team_id: selectedTeamId,
        leave_date: leaveDate,
        leave_type: leaveType,
      });

      // Reload leaves
      const monthStart = new Date(viewMonth + '-01');
      const leavesData = await DataService.getLeavesByTeam(
        selectedTeamId,
        monthStart.toISOString().split('T')[0]
      );
      setLeaves(leavesData);

      setIsModalOpen(false);
      setLeaveDate('');
      setLeaveType('Local Leave');
      setSelectedUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    try {
      await DataService.cancelLeave(leaveId);
      
      // Reload leaves
      const monthStart = new Date(viewMonth + '-01');
      const leavesData = await DataService.getLeavesByTeam(
        selectedTeamId,
        monthStart.toISOString().split('T')[0]
      );
      setLeaves(leavesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel leave');
    }
  };

  const getLeaveTypeColor = (type: LeaveType) => {
    switch (type) {
      case 'Sick Leave':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'Local Leave':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'Half Day Leave':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'WFH':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  // Generate calendar days for the month
  const generateCalendarDays = () => {
    const year = parseInt(viewMonth.split('-')[0]);
    const month = parseInt(viewMonth.split('-')[1]) - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{ date: number; fullDate: string; isCurrentMonth: boolean }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: 0, fullDate: '', isCurrentMonth: false });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date: day, fullDate, isCurrentMonth: true });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();
  const today = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card padding="lg" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Leave Scheduler
          </h2>
          <div className="flex items-center gap-2">
            {availableTeams.length > 1 && (
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              >
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Leave
            </Button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <input
            type="month"
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const date = new Date(viewMonth + '-01');
                date.setMonth(date.getMonth() - 1);
                setViewMonth(date.toISOString().split('T')[0].slice(0, 7));
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const date = new Date(viewMonth + '-01');
                date.setMonth(date.getMonth() + 1);
                setViewMonth(date.toISOString().split('T')[0].slice(0, 7));
              }}
            >
              Next
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Calendar View */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-gray-600 dark:text-gray-400 p-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => {
            const dayLeaves = leaves.filter((l) => l.leave_date === day.fullDate);
            const isToday = day.fullDate === today;
            const isPast = day.fullDate < today;

            return (
              <div
                key={index}
                className={`
                  min-h-24 p-2 border rounded-lg
                  ${day.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'}
                  ${isToday ? 'ring-2 ring-blue-500' : ''}
                  ${isPast ? 'opacity-60' : ''}
                `}
              >
                {day.isCurrentMonth && (
                  <>
                    <div className="text-sm font-medium mb-1">{day.date}</div>
                    <div className="space-y-1">
                      {dayLeaves.map((leave) => {
                        const user = managerView
                          ? teamMembers.find((m) => m.id === leave.user_id)
                          : authUser;
                        return (
                          <div
                            key={leave.id}
                            className={`text-xs p-1 rounded ${getLeaveTypeColor(leave.leave_type)}`}
                          >
                            <div className="font-medium truncate">
                              {managerView ? user?.name || 'Unknown' : leave.leave_type}
                            </div>
                            {managerView && (
                              <div className="text-xs opacity-75">{leave.leave_type}</div>
                            )}
                            {!isPast && (
                              <button
                                onClick={() => handleCancelLeave(leave.id!)}
                                className="mt-1 text-red-600 hover:text-red-800"
                                title="Cancel leave"
                              >
                                <XCircle className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {leaveTypes.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${getLeaveTypeColor(type)}`}></div>
              <span>{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Schedule Leave Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setLeaveDate('');
          setLeaveType('Local Leave');
          setSelectedUserId('');
          setError('');
        }}
        title="Schedule Leave"
        size="md"
      >
        <div className="space-y-4">
          {managerView && teamMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">Team Member</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                required
              >
                <option value="">Select member</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Leave Date"
            type="date"
            value={leaveDate}
            onChange={(e) => setLeaveDate(e.target.value)}
            required
            fullWidth
          />

          <div>
            <label className="block text-sm font-medium mb-2">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              required
            >
              {leaveTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleScheduleLeave} isLoading={isSubmitting} fullWidth>
              Schedule Leave
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setLeaveDate('');
                setLeaveType('Local Leave');
                setSelectedUserId('');
                setError('');
              }}
              fullWidth
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

