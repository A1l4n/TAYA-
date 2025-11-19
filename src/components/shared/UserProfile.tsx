'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Building2, Users, Shield, Calendar, Edit2, Save, X } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import { Badge } from './Badge';
import { Avatar } from './Avatar';
import { AuthService } from '@/lib/auth';
import { UserService } from '@/lib/services/UserService';
import { TeamService } from '@/lib/services/TeamService';
import { OrganizationService } from '@/lib/services/OrganizationService';
import type { User as UserType, Team, Organization } from '@/types';

export interface UserProfileProps {
  userId?: string; // If not provided, shows current user
  editable?: boolean;
}

export function UserProfile({ userId, editable = true }: UserProfileProps) {
  const authUser = AuthService.getCurrentUser();
  const [user, setUser] = useState<UserType | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      if (!authUser) return;

      setIsLoading(true);
      setError('');

      try {
        const targetUserId = userId || authUser.userId;
        const userData = await UserService.getUser(targetUserId);
        
        if (!userData) {
          setError('User not found');
          setIsLoading(false);
          return;
        }

        setUser(userData);
        setName(userData.name);
        setEmail(userData.email);

        // Load organization
        const org = await OrganizationService.getOrganization(userData.organization_id);
        setOrganization(org);

        // Load teams
        const userTeams = await UserService.getUserTeams(targetUserId);
        const teamData = await Promise.all(
          userTeams.map((ut) => TeamService.getTeam(ut.team_id))
        );
        setTeams(teamData.filter((t): t is Team => t !== null));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [authUser, userId]);

  const handleSave = async () => {
    if (!user || !editable) return;

    setIsSaving(true);
    setError('');
    setSuccess(false);

    try {
      const updated = await UserService.updateUser(user.id, {
        name,
        email,
      });

      setUser(updated);
      setIsEditing(false);
      setSuccess(true);

      // Refresh auth user if it's the current user
      if (!userId || userId === authUser?.userId) {
        await AuthService.refreshUser();
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
    setIsEditing(false);
    setError('');
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'org_admin':
        return 'error';
      case 'senior_manager':
      case 'manager':
        return 'info';
      case 'lead':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card padding="lg">
        <div className="text-center text-red-600 dark:text-red-400">
          {error || 'User not found'}
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="w-full">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={user.name}
            size="lg"
            className="ring-4 ring-blue-100 dark:ring-blue-900/30"
          />
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {isEditing ? 'Edit Profile' : 'User Profile'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        {editable && !isEditing && (
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-600 dark:text-green-400">
            Profile updated successfully!
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Basic Information
          </h3>
          <div className="space-y-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isEditing}
              fullWidth
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
              fullWidth
              icon={<Mail className="h-5 w-5" />}
            />
            <div>
              <label className="block text-sm font-medium mb-2">Role</label>
              <Badge variant={getRoleBadgeVariant(user.role)}>
                {user.role.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Badge variant={user.active ? 'success' : 'error'}>
                {user.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Organization */}
        {organization && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="font-medium">{organization.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Slug: {organization.slug}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Member since {new Date(user.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {/* Teams */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Teams ({teams.length})
          </h3>
          {teams.length > 0 ? (
            <div className="space-y-2">
              {teams.map((team) => {
                const userTeam = user ? 
                  teams.find((t) => t.id === team.id) : null;
                return (
                  <div
                    key={team.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{team.name}</p>
                      {team.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {team.description}
                        </p>
                      )}
                    </div>
                    {authUser?.currentTeamId === team.id && (
                      <Badge variant="info">Current Team</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No teams assigned</p>
          )}
        </div>

        {/* Account Information */}
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Information
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">User ID:</span>
              <span className="font-mono text-xs">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Created:</span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Last Updated:</span>
              <span>{new Date(user.updated_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && editable && (
          <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

