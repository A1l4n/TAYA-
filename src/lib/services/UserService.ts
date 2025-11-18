// User Service - Stub
// TODO: Implement with hierarchy support

import type { User, UserTeam } from '@/types';
import { supabase } from '../supabase';

export class UserService {
  static async createUser(email: string, name: string, orgId: string, password: string): Promise<User> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async inviteUser(email: string, teamId: string, role: 'primary_manager' | 'co_manager' | 'lead' | 'member'): Promise<User> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getUsersByOrganization(orgId: string): Promise<User[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getUsersByTeam(teamId: string): Promise<User[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async updateUser(userId: string, data: Partial<User>): Promise<User> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async deactivateUser(userId: string): Promise<void> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }

  static async getUserTeams(userId: string): Promise<UserTeam[]> {
    // TODO: Implement
    throw new Error('Not yet implemented');
  }
}

