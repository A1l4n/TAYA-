'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { DataService } from '@/lib/services/DataService';
import { AuthService } from '@/lib/auth';
import { TeamService } from '@/lib/services/TeamService';
import type { AttendanceRecord, AttendanceType, User } from '@/types';

export interface TimesheetProps {
  teamId?: string;
  startDate?: string;
  endDate?: string;
  viewMode?: 'day' | 'week' | 'month';
  managerView?: boolean;
}

export function Timesheet({
  teamId,
  startDate,
  endDate,
  viewMode = 'week',
  managerView = false,
}: TimesheetProps) {
  const authUser = AuthService.getCurrentUser();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || '');
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewStartDate, setViewStartDate] = useState(
    startDate || new Date().toISOString().split('T')[0]
  );
  const [viewEndDate, setViewEndDate] = useState(
    endDate || new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

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
        // Load attendance records
        const records = await DataService.getAttendanceByDateRange(
          selectedTeamId,
          viewStartDate,
          viewEndDate
        );
        setAttendanceRecords(records);

        // Load team members if manager view
        if (managerView) {
          const members = await TeamService.getTeamMembersWithUsers(selectedTeamId);
          setTeamMembers(members.map((m) => m.user));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load timesheet');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedTeamId, viewStartDate, viewEndDate, managerView]);

  const handleRecordAttendance = async (
    userId: string,
    date: string,
    type: AttendanceType
  ) => {
    if (!selectedTeamId) return;

    try {
      await DataService.recordAttendance({
        user_id: userId,
        team_id: selectedTeamId,
        date,
        attendance_type: type,
      });

      // Reload data
      const records = await DataService.getAttendanceByDateRange(
        selectedTeamId,
        viewStartDate,
        viewEndDate
      );
      setAttendanceRecords(records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record attendance');
    }
  };

  const getAttendanceTypeColor = (type: AttendanceType) => {
    switch (type) {
      case 'work':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300';
      case 'wfh':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300';
      case 'leave':
      case 'sick_leave':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300';
      case 'half_day':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300';
      case 'holiday':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
    }
  };

  const getAttendanceTypeLabel = (type: AttendanceType) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Generate date range for display
  const generateDateRange = () => {
    const dates: string[] = [];
    const start = new Date(viewStartDate);
    const end = new Date(viewEndDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d).toISOString().split('T')[0]);
    }
    
    return dates;
  };

  const dates = generateDateRange();
  const displayUsers = managerView ? teamMembers : (authUser ? [{ id: authUser.userId, name: authUser.displayName || '', email: authUser.email }] : []);

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Timesheet
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
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <input
            type="date"
            value={viewStartDate}
            onChange={(e) => setViewStartDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={viewEndDate}
            onChange={(e) => setViewEndDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Timesheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left p-3 font-semibold">User</th>
              {dates.map((date) => (
                <th key={date} className="text-center p-3 font-semibold text-sm">
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((user) => {
              const userRecords = attendanceRecords.filter((r) => r.user_id === user.id);
              return (
                <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  {dates.map((date) => {
                    const record = userRecords.find((r) => r.date === date);
                    return (
                      <td key={date} className="p-2 text-center">
                        {record ? (
                          <Badge
                            variant={
                              record.attendance_type === 'work' || record.attendance_type === 'wfh'
                                ? 'success'
                                : record.attendance_type === 'leave' ||
                                  record.attendance_type === 'sick_leave'
                                ? 'error'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {getAttendanceTypeLabel(record.attendance_type)}
                          </Badge>
                        ) : managerView ? (
                          <select
                            onChange={(e) =>
                              handleRecordAttendance(
                                user.id,
                                date,
                                e.target.value as AttendanceType
                              )
                            }
                            className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800"
                            defaultValue=""
                          >
                            <option value="">-</option>
                            <option value="work">Work</option>
                            <option value="wfh">WFH</option>
                            <option value="leave">Leave</option>
                            <option value="sick_leave">Sick Leave</option>
                            <option value="half_day">Half Day</option>
                            <option value="holiday">Holiday</option>
                          </select>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {displayUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No users found
        </div>
      )}

      {/* Summary Stats */}
      {attendanceRecords.length > 0 && (
        <div className="mt-6 grid grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {attendanceRecords.filter((r) => r.attendance_type === 'work').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Work Days</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {attendanceRecords.filter((r) => r.attendance_type === 'wfh').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">WFH</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {attendanceRecords.filter((r) => r.attendance_type === 'leave' || r.attendance_type === 'sick_leave').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Leaves</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {attendanceRecords.filter((r) => r.attendance_type === 'half_day').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Half Days</div>
          </div>
        </div>
      )}
    </Card>
  );
}

