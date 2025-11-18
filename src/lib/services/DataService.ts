// Data Service - Full Implementation
// Handles team-aware data operations for submissions, timesheets, and leaves

import type {
  DailySubmission,
  AttendanceRecord,
  ScheduledLeave,
  TeamCompletion,
  TeamStatusItem,
  User,
} from '@/types';
import { supabase } from '../supabase';
import { TeamService } from './TeamService';
import { UserService } from './UserService';

export class DataService {
  /**
   * Get all submissions for a team on a specific date
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Array of daily submissions
   */
  static async getSubmissionsByTeam(teamId: string, date: string): Promise<DailySubmission[]> {
    const { data, error } = await supabase
      .from('daily_submissions')
      .select('*')
      .eq('team_id', teamId)
      .eq('date', date)
      .order('submitted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get submissions: ${error.message}`);
    }

    return (data || []) as DailySubmission[];
  }

  /**
   * Create or update a daily submission
   * @param submission Submission data
   * @returns Created or updated submission
   */
  static async submitDailyTask(submission: Partial<DailySubmission>): Promise<DailySubmission> {
    if (!submission.date || !submission.user_id || !submission.team_id || !submission.location) {
      throw new Error('date, user_id, team_id, and location are required');
    }

    // Check if submission already exists
    const { data: existing } = await supabase
      .from('daily_submissions')
      .select('id')
      .eq('date', submission.date)
      .eq('user_id', submission.user_id)
      .eq('team_id', submission.team_id)
      .single();

    if (existing) {
      // Update existing submission
      const { data, error } = await supabase
        .from('daily_submissions')
        .update({
          location: submission.location,
          tasks: submission.tasks || [],
          submitted_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update submission: ${error.message}`);
      }

      return data as DailySubmission;
    } else {
      // Create new submission
      const { data, error } = await supabase
        .from('daily_submissions')
        .insert({
          date: submission.date,
          user_id: submission.user_id,
          team_id: submission.team_id,
          location: submission.location,
          tasks: submission.tasks || [],
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create submission: ${error.message}`);
      }

      return data as DailySubmission;
    }
  }

  /**
   * Get timesheet records for a team on a specific date
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Array of attendance records
   */
  static async getTimesheetByTeam(teamId: string, date: string): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_timesheet')
      .select('*')
      .eq('team_id', teamId)
      .eq('date', date)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get timesheet: ${error.message}`);
    }

    return (data || []) as AttendanceRecord[];
  }

  /**
   * Create or update attendance record
   * @param record Attendance record data
   * @returns Created or updated record
   */
  static async recordAttendance(record: Partial<AttendanceRecord>): Promise<AttendanceRecord> {
    if (!record.date || !record.user_id || !record.team_id || !record.attendance_type) {
      throw new Error('date, user_id, team_id, and attendance_type are required');
    }

    // Check if record already exists
    const { data: existing } = await supabase
      .from('attendance_timesheet')
      .select('id')
      .eq('date', record.date)
      .eq('user_id', record.user_id)
      .eq('team_id', record.team_id)
      .single();

    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('attendance_timesheet')
        .update({
          attendance_type: record.attendance_type,
          notes: record.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update attendance: ${error.message}`);
      }

      return data as AttendanceRecord;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('attendance_timesheet')
        .insert({
          date: record.date,
          user_id: record.user_id,
          team_id: record.team_id,
          attendance_type: record.attendance_type,
          notes: record.notes || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create attendance: ${error.message}`);
      }

      return data as AttendanceRecord;
    }
  }

  /**
   * Get leaves for a team on a specific date
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Array of scheduled leaves
   */
  static async getLeavesByTeam(teamId: string, date: string): Promise<ScheduledLeave[]> {
    const { data, error } = await supabase
      .from('scheduled_leaves')
      .select('*')
      .eq('team_id', teamId)
      .eq('leave_date', date)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get leaves: ${error.message}`);
    }

    return (data || []) as ScheduledLeave[];
  }

  /**
   * Schedule a leave
   * @param leave Leave data
   * @returns Created leave
   */
  static async scheduleLeave(leave: Partial<ScheduledLeave>): Promise<ScheduledLeave> {
    if (!leave.leave_date || !leave.user_id || !leave.team_id || !leave.leave_type) {
      throw new Error('leave_date, user_id, team_id, and leave_type are required');
    }

    // Check if leave already exists
    const { data: existing } = await supabase
      .from('scheduled_leaves')
      .select('id')
      .eq('leave_date', leave.leave_date)
      .eq('user_id', leave.user_id)
      .eq('team_id', leave.team_id)
      .single();

    if (existing) {
      throw new Error('Leave already scheduled for this date');
    }

    const { data, error } = await supabase
      .from('scheduled_leaves')
      .insert({
        leave_date: leave.leave_date,
        user_id: leave.user_id,
        team_id: leave.team_id,
        leave_type: leave.leave_type,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to schedule leave: ${error.message}`);
    }

    return data as ScheduledLeave;
  }

  /**
   * Cancel a scheduled leave
   * @param leaveId Leave ID
   */
  static async cancelLeave(leaveId: string): Promise<void> {
    const { error } = await supabase.from('scheduled_leaves').delete().eq('id', leaveId);

    if (error) {
      throw new Error(`Failed to cancel leave: ${error.message}`);
    }
  }

  /**
   * Get team status for a specific date (all members with their submissions and leaves)
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Array of team status items
   */
  static async getTeamStatus(teamId: string, date: string): Promise<TeamStatusItem[]> {
    // Get all team members
    const members = await TeamService.getTeamMembersWithUsers(teamId);

    // Get all submissions for the date
    const submissions = await this.getSubmissionsByTeam(teamId, date);
    const submissionsMap = new Map(submissions.map((s) => [s.user_id, s]));

    // Get all leaves for the date
    const leaves = await this.getLeavesByTeam(teamId, date);
    const leavesMap = new Map(leaves.map((l) => [l.user_id, l]));

    // Combine into status items
    return members.map((member) => ({
      member: member.user,
      submission: submissionsMap.get(member.user_id) || null,
      leave: leavesMap.get(member.user_id) || null,
    }));
  }

  /**
   * Compute team completion metrics for a date
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Team completion metrics
   */
  static async computeTeamCompletion(teamId: string, date: string): Promise<TeamCompletion> {
    // Get all team members
    const members = await TeamService.getTeamMembersWithUsers(teamId);
    const activeMembers = members.filter((m) => m.user.active);

    if (activeMembers.length === 0) {
      return {
        allComplete: false,
        lastSubmitter: null,
      };
    }

    // Get all submissions
    const submissions = await this.getSubmissionsByTeam(teamId, date);
    const submissionsSet = new Set(submissions.map((s) => s.user_id));

    // Get all leaves
    const leaves = await this.getLeavesByTeam(teamId, date);
    const leavesSet = new Set(leaves.map((l) => l.user_id));

    // Check if all active members have submitted or are on leave
    const allComplete = activeMembers.every(
      (member) => submissionsSet.has(member.user_id) || leavesSet.has(member.user_id)
    );

    // Find last submitter
    let lastSubmitter: string | null = null;
    if (submissions.length > 0) {
      const lastSubmission = submissions[0]; // Already sorted by submitted_at desc
      const user = await UserService.getUser(lastSubmission.user_id);
      lastSubmitter = user?.name || null;
    }

    return {
      allComplete,
      lastSubmitter,
    };
  }

  /**
   * Get user's submission for a date
   * @param userId User ID
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Submission or null
   */
  static async getUserSubmission(
    userId: string,
    teamId: string,
    date: string
  ): Promise<DailySubmission | null> {
    const { data, error } = await supabase
      .from('daily_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get submission: ${error.message}`);
    }

    return data as DailySubmission;
  }

  /**
   * Get user's attendance for a date
   * @param userId User ID
   * @param teamId Team ID
   * @param date Date string (YYYY-MM-DD)
   * @returns Attendance record or null
   */
  static async getUserAttendance(
    userId: string,
    teamId: string,
    date: string
  ): Promise<AttendanceRecord | null> {
    const { data, error } = await supabase
      .from('attendance_timesheet')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get attendance: ${error.message}`);
    }

    return data as AttendanceRecord;
  }

  /**
   * Get submissions for a date range
   * @param teamId Team ID
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   * @returns Array of submissions
   */
  static async getSubmissionsByDateRange(
    teamId: string,
    startDate: string,
    endDate: string
  ): Promise<DailySubmission[]> {
    const { data, error } = await supabase
      .from('daily_submissions')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('submitted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get submissions: ${error.message}`);
    }

    return (data || []) as DailySubmission[];
  }

  /**
   * Get attendance records for a date range
   * @param teamId Team ID
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   * @returns Array of attendance records
   */
  static async getAttendanceByDateRange(
    teamId: string,
    startDate: string,
    endDate: string
  ): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_timesheet')
      .select('*')
      .eq('team_id', teamId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) {
      throw new Error(`Failed to get attendance: ${error.message}`);
    }

    return (data || []) as AttendanceRecord[];
  }
}
