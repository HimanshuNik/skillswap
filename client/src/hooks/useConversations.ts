import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from '../lib/api';
import type { ConversationSummary, ConversationMessagesResponse } from '../types/chat';

export const CONVERSATIONS_KEYS = {
  all: ['conversations'] as const,
  list: () => [...CONVERSATIONS_KEYS.all, 'list'] as const,
  unreadCount: () => [...CONVERSATIONS_KEYS.all, 'unread-count'] as const,
  messages: (conversationId: number) =>
    [...CONVERSATIONS_KEYS.all, 'messages', conversationId] as const,
};

export function useConversations() {
  return useQuery<ConversationSummary[]>({
    queryKey: CONVERSATIONS_KEYS.list(),
    queryFn: () => conversationsApi.getConversations(),
    staleTime: 15 * 1000,
  });
}

export function useUnreadMessagesCount() {
  return useQuery<number>({
    queryKey: CONVERSATIONS_KEYS.unreadCount(),
    queryFn: () => conversationsApi.getUnreadCount(),
    staleTime: 15 * 1000,
  });
}

export function useConversationMessages(conversationId: number | null) {
  return useQuery<ConversationMessagesResponse>({
    queryKey: CONVERSATIONS_KEYS.messages(conversationId ?? 0),
    queryFn: () =>
      conversationId
        ? conversationsApi.getMessages(conversationId)
        : Promise.resolve({ conversation: null, messages: [] }),
    enabled: !!conversationId && conversationId > 0,
    staleTime: 10 * 1000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      clientMessageId,
    }: {
      conversationId: number;
      content: string;
      clientMessageId?: string;
    }) => conversationsApi.sendMessage(conversationId, content, clientMessageId),
    onSuccess: (newMessage, variables) => {
      // Optimistically append new message to the messages cache
      queryClient.setQueryData<ConversationMessagesResponse>(
        CONVERSATIONS_KEYS.messages(variables.conversationId),
        (old) => {
          if (!old) return { conversation: null, messages: [newMessage] };
          // Check for deduplication
          const exists = old.messages.some((m) => m.id === newMessage.id);
          if (exists) return old;
          return {
            ...old,
            messages: [...old.messages, newMessage],
          };
        }
      );

      // Invalidate conversation list so latestMessage preview updates
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.list() });
    },
  });
}

export function useMarkConversationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: number) =>
      conversationsApi.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      // Set unread count for this conversation in list to 0
      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_KEYS.list(),
        (old) => {
          if (!old) return [];
          return old.map((c) =>
            c.id === conversationId ? { ...c, unreadCount: 0 } : c
          );
        }
      );
      // Invalidate total unread count badge
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.unreadCount() });
    },
  });
}

