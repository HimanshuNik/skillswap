import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { userApi, authApi } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { AUTH_QUERY_KEY } from './useAuth';
import type { FullProfile, PublicUserProfile } from '../types/user';

export const USER_PROFILE_QUERY_KEY = ['users', 'me'];
export const USER_NOTIFICATION_PREFS_KEY = ['users', 'me', 'notification-preferences'];
export const PUBLIC_PROFILE_QUERY_KEY = (username: string) => ['users', 'profile', username];

export function useMyProfile() {
  return useQuery<FullProfile>({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: () => userApi.getMe(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function usePublicProfile(username: string) {
  return useQuery<PublicUserProfile>({
    queryKey: PUBLIC_PROFILE_QUERY_KEY(username),
    queryFn: () => userApi.getPublicProfile(username),
    enabled: Boolean(username),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (payload: {
      name?: string;
      bio?: string | null;
      location?: string | null;
      timezone?: string | null;
      avatarUrl?: string | null;
    }) => userApi.updateProfile(payload),
    onSuccess: (data) => {
      updateUser(data.user);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      toast.success('Profile updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update profile');
    },
  });
}

export function useAddTeachingSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { skillId?: number; skillName?: string; proficiencyLevel: string }) =>
      userApi.addTeachingSkill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Teaching skill added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add teaching skill');
    },
  });
}

export function useRemoveTeachingSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: number) => userApi.removeTeachingSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Teaching skill removed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove teaching skill');
    },
  });
}

export function useAddLearningSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { skillId?: number; skillName?: string; targetLevel: string }) =>
      userApi.addLearningSkill(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Learning skill added');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to add learning skill');
    },
  });
}

export function useRemoveLearningSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (skillId: number) => userApi.removeLearningSkill(skillId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Learning skill removed');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to remove learning skill');
    },
  });
}

export function useUpdateAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { schedule: Array<{ day: string; slots: string[] }>; timezone?: string }) =>
      userApi.updateAvailability(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_QUERY_KEY });
      toast.success('Availability schedule saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update availability');
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: USER_NOTIFICATION_PREFS_KEY,
    queryFn: () => userApi.getNotificationPreferences(),
    staleTime: 60 * 1000,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      swapRequests?: boolean;
      messages?: boolean;
      sessions?: boolean;
      reviews?: boolean;
      emailAlerts?: boolean;
      pushEnabled?: boolean;
      pushSwapRequests?: boolean;
      pushMessages?: boolean;
      pushSessions?: boolean;
      pushReminders?: boolean;
      pushGroupActivity?: boolean;
    }) => userApi.updateNotificationPreferences(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(USER_NOTIFICATION_PREFS_KEY, data);
      toast.success('Notification preferences updated');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update notification preferences');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Password changed successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to change password');
    },
  });
}

export function useDeleteAccount() {
  const logout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { password: string }) => userApi.deleteAccount(payload),
    onSuccess: () => {
      logout();
      queryClient.clear();
      toast.success('Your account has been deactivated');
      window.location.href = '/';
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to deactivate account');
    },
  });
}


