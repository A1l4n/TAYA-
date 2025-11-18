'use client';

import { useState, FormEvent, useEffect } from 'react';
import { Calendar, MapPin, ListTodo, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';
import { DataService } from '@/lib/services/DataService';
import { AuthService } from '@/lib/auth';
import { TeamService } from '@/lib/services/TeamService';
import type { DailySubmission, LocationType } from '@/types';

export interface TaskSubmissionProps {
  currentDate?: string;
  teamId?: string;
  onSuccess?: () => void;
}

export function TaskSubmission({ currentDate, teamId, onSuccess }: TaskSubmissionProps) {
  const authUser = AuthService.getCurrentUser();
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teamId || '');
  const [availableTeams, setAvailableTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [location, setLocation] = useState<LocationType>('Office');
  const [tasks, setTasks] = useState<string[]>(['']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [date, setDate] = useState(currentDate || new Date().toISOString().split('T')[0]);
  const [existingSubmission, setExistingSubmission] = useState<DailySubmission | null>(null);

  useEffect(() => {
    if (authUser) {
      // Load user's teams
      const loadTeams = async () => {
        try {
          const userTeams = await TeamService.getTeamsByUser(authUser.userId);
          setAvailableTeams(userTeams.map((t) => ({ id: t.id, name: t.name })));
          
          // Set default team if not provided
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
    // Load existing submission for the date
    if (authUser && selectedTeamId && date) {
      const loadExisting = async () => {
        try {
          const existing = await DataService.getUserSubmission(
            authUser.userId,
            selectedTeamId,
            date
          );
          if (existing) {
            setExistingSubmission(existing);
            setLocation(existing.location);
            setTasks(existing.tasks.length > 0 ? existing.tasks : ['']);
            setSuccess(false);
          } else {
            setExistingSubmission(null);
            setLocation('Office');
            setTasks(['']);
          }
        } catch (err) {
          console.error('Failed to load existing submission:', err);
        }
      };
      loadExisting();
    }
  }, [authUser, selectedTeamId, date]);

  const handleAddTask = () => {
    setTasks([...tasks, '']);
  };

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const handleRemoveTask = (index: number) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authUser || !selectedTeamId) {
      setError('Please select a team');
      return;
    }

    const validTasks = tasks.filter((t) => t.trim() !== '');
    if (validTasks.length === 0) {
      setError('Please add at least one task');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      await DataService.submitDailyTask({
        date,
        user_id: authUser.userId,
        team_id: selectedTeamId,
        location,
        tasks: validTasks,
      });

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }

      // Reset after a delay
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const locationOptions: LocationType[] = ['Office', 'WFH', 'Local Leave', 'Sick Leave', 'Half Day Leave'];

  return (
    <Card padding="lg" className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ListTodo className="h-6 w-6" />
          Daily Task Submission
        </h2>
        {existingSubmission && (
          <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Already submitted
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date Selection */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-500" />
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="flex-1"
          />
        </div>

        {/* Team Selection */}
        {availableTeams.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-2">Team</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
              required
            >
              {availableTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Location Selection */}
        <div>
          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value as LocationType)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            required
          >
            {locationOptions.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>

        {/* Tasks */}
        <div>
          <label className="block text-sm font-medium mb-2">Tasks</label>
          <div className="space-y-2">
            {tasks.map((task, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={task}
                  onChange={(e) => handleTaskChange(index, e.target.value)}
                  placeholder={`Task ${index + 1}`}
                  className="flex-1"
                />
                {tasks.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveTask(index)}
                    className="px-3"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTask}
              className="w-full"
            >
              + Add Task
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <p className="text-sm text-green-600 dark:text-green-400">
              Task submitted successfully!
            </p>
          </div>
        )}

        <Button
          type="submit"
          fullWidth
          isLoading={isSubmitting}
          disabled={isSubmitting || !selectedTeamId}
        >
          {existingSubmission ? 'Update Submission' : 'Submit Tasks'}
        </Button>
      </form>
    </Card>
  );
}

