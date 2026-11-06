import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationsApi } from '../lib/api';
import { getSocket, connectSocket } from '../lib/socket';
import { useAuthStore } from '../store/useAuthStore';
import type { Notification, NotificationsResponse } from '../types/notification';

export const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (unreadOnly?: boolean, page?: number) =>
    [...NOTIFICATION_KEYS.all, 'list', { unreadOnly, page }] as const,
  unreadCount: () => [...NOTIFICATION_KEYS.all, 'unread-count'] as const,
};

export function useNotifications(unreadOnly = false, page = 1) {
  return useQuery<NotificationsResponse>({
    queryKey: NOTIFICATION_KEYS.list(unreadOnly, page),
    queryFn: () => notificationsApi.getNotifications({ unreadOnly, page }),
    staleTime: 15 * 1000,
  });
}

export function useUnreadNotificationsCount() {
  return useQuery<number>({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    staleTime: 15 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.setQueryData<number>(NOTIFICATION_KEYS.unreadCount(), (old) =>
        Math.max(0, (old || 1) - 1)
      );
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      queryClient.setQueryData<number>(NOTIFICATION_KEYS.unreadCount(), 0);
    },
  });
}

/**
 * Hook to manage real-time notification socket events and multi-tab synchronization.
 */
export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    connectSocket();
    const socket = getSocket();

    const handleNewNotification = (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
      // Surface toast notification
      toast.info(notification.title, {
        description: notification.message,
      });
    };

    const handleCountUpdate = ({ unreadCount }: { unreadCount: number }) => {
      queryClient.setQueryData(NOTIFICATION_KEYS.unreadCount(), unreadCount);
    };

    const handleReadAck = () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);
    socket.on('notification:read', handleReadAck);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
      socket.off('notification:read', handleReadAck);
    };
  }, [isAuthenticated, user, queryClient]);
}
