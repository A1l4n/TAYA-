// Data Service - Stub
// TODO: Implement team-aware data operations

import type { DailySubmission, AttendanceRecord, ScheduledLeave, TeamCompletion } from '@/types';
import { supabase } from '../supabase';

export class DataService {
  static async getSubmissionsByTeam(teamId: string, date: string): Promise<DailySubmission[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getTimesheetByTeam(teamId: string, date: string): Promise<AttendanceRecord[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getLeavesByTeam(teamId: string, date: string): Promise<ScheduledLeave[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getTeamStatus(teamId: string, date: string): Promise<{ member: unknown; submission: DailySubmission | null; leave: ScheduledLeave | null }[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async computeTeamCompletion(teamId: string, date: string): Promise<TeamCompletion> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }
}

