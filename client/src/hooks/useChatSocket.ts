import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket, connectSocket } from '../lib/socket';
import { useAuthStore } from '../store/useAuthStore';
import { CONVERSATIONS_KEYS } from './useConversations';
import type {
  ChatMessage,
  ConversationSummary,
  TypingUpdateEvent,
  PresenceUpdateEvent,
  MessageReadAckEvent,
  ConversationMessagesResponse,
} from '../types/chat';

export function useChatSocket(activeConversationId: number | null) {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [peerTypingName, setPeerTypingName] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect socket when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    connectSocket();

    return () => {
      // Don't disconnect immediately on component unmount, but leave active room
    };
  }, [isAuthenticated, user]);

  // Join/leave active conversation room
  useEffect(() => {
    if (!activeConversationId || !isAuthenticated) {
      return;
    }

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('conversation:join', { conversationId: activeConversationId });

    // Mark as read immediately on entering conversation
    socket.emit('message:read', { conversationId: activeConversationId });

    return () => {
      socket.emit('conversation:leave', { conversationId: activeConversationId });
      setPeerIsTyping(false);
      setPeerTypingName(null);
    };
  }, [activeConversationId, isAuthenticated]);

  // Socket event listeners
  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = getSocket();

    // 1. Handle incoming new messages
    const handleMessageNew = (message: ChatMessage) => {
      const convId = message.conversationId;

      // Update message thread if active
      if (activeConversationId === convId) {
        queryClient.setQueryData<ConversationMessagesResponse>(
          CONVERSATIONS_KEYS.messages(convId),
          (old) => {
            if (!old) return { conversation: null, messages: [message] };
            const exists = old.messages.some((m) => m.id === message.id);
            if (exists) return old;
            return {
              ...old,
              messages: [...old.messages, message],
            };
          }
        );

        // Mark as read if user is viewing this active conversation
        if (message.senderId !== user?.id) {
          socket.emit('message:read', { conversationId: convId });
        }
      }

      // Update conversations list preview and unread counts
      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_KEYS.list(),
        (old) => {
          if (!old) return [];
          const idx = old.findIndex((c) => c.id === convId);
          if (idx === -1) {
            queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.list() });
            return old;
          }

          const existing = old[idx];
          const shouldIncrementUnread =
            activeConversationId !== convId && message.senderId !== user?.id;

          const updated: ConversationSummary = {
            ...existing,
            latestMessage: message,
            unreadCount: shouldIncrementUnread
              ? existing.unreadCount + 1
              : existing.unreadCount,
          };

          // Re-sort to move the conversation to the top
          const rest = old.filter((_, i) => i !== idx);
          return [updated, ...rest];
        }
      );

      // Invalidate total unread count if message is from peer in inactive chat
      if (activeConversationId !== convId && message.senderId !== user?.id) {
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.unreadCount() });
      }
    };

    // 2. Handle typing updates
    const handleTypingUpdate = (data: TypingUpdateEvent) => {
      if (data.conversationId === activeConversationId && data.userId !== user?.id) {
        if (data.isTyping) {
          setPeerIsTyping(true);
          setPeerTypingName(data.user?.name || 'Someone');

          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          // Auto-stop typing indicator after 4 seconds of silence
          typingTimeoutRef.current = setTimeout(() => {
            setPeerIsTyping(false);
            setPeerTypingName(null);
          }, 4000);
        } else {
          setPeerIsTyping(false);
          setPeerTypingName(null);
        }
      }
    };

    // 3. Handle online presence updates
    const handlePresenceUpdate = (data: PresenceUpdateEvent) => {
      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_KEYS.list(),
        (old) => {
          if (!old) return [];
          return old.map((conv) => {
            if (conv.peer.id === data.userId) {
              return {
                ...conv,
                peer: {
                  ...conv.peer,
                  isOnline: data.isOnline,
                },
              };
            }
            return conv;
          });
        }
      );
    };

    // 4. Handle message read acknowledgments
    const handleMessageReadAck = (data: MessageReadAckEvent) => {
      if (data.conversationId === activeConversationId) {
        queryClient.setQueryData<ConversationMessagesResponse>(
          CONVERSATIONS_KEYS.messages(data.conversationId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.map((m) =>
                m.senderId === user?.id && !m.readAt
                  ? { ...m, readAt: data.lastReadAt }
                  : m
              ),
            };
          }
        );
      }
    };

    // 5. Handle conversation updated event (e.g. from background)
    const handleConversationUpdated = (data: { conversationId: number; latestMessage: ChatMessage }) => {
      queryClient.setQueryData<ConversationSummary[]>(
        CONVERSATIONS_KEYS.list(),
        (old) => {
          if (!old) return [];
          const idx = old.findIndex((c) => c.id === data.conversationId);
          if (idx === -1) return old;
          const conv = old[idx];
          const updated = { ...conv, latestMessage: data.latestMessage };
          const rest = old.filter((_, i) => i !== idx);
          return [updated, ...rest];
        }
      );
    };

    // 6. Handle socket reconnection (restores room membership and syncs missed messages)
    const handleReconnect = () => {
      if (activeConversationId) {
        socket.emit('conversation:join', { conversationId: activeConversationId });
        socket.emit('message:read', { conversationId: activeConversationId });
        queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.messages(activeConversationId) });
      }
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.list() });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEYS.unreadCount() });
    };

    socket.on('message:new', handleMessageNew);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:read_ack', handleMessageReadAck);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:read_ack', handleMessageReadAck);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('connect', handleReconnect);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [activeConversationId, isAuthenticated, user?.id, queryClient]);

  // Actions
  const sendMessage = useCallback(
    (content: string): Promise<ChatMessage> => {
      return new Promise((resolve, reject) => {
        if (!activeConversationId) {
          return reject(new Error('No active conversation selected'));
        }
        const socket = getSocket();
        const clientMessageId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        socket.emit(
          'message:send',
          {
            conversationId: activeConversationId,
            content,
            clientMessageId,
          },
          (response: { success: boolean; message?: ChatMessage; error?: string }) => {
            if (response?.success && response.message) {
              resolve(response.message);
            } else {
              reject(new Error(response?.error || 'Failed to send message'));
            }
          }
        );
      });
    },
    [activeConversationId]
  );

  const startTyping = useCallback(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    socket.emit('typing:start', { conversationId: activeConversationId });
  }, [activeConversationId]);

  const stopTyping = useCallback(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    socket.emit('typing:stop', { conversationId: activeConversationId });
  }, [activeConversationId]);

  const markAsRead = useCallback(() => {
    if (!activeConversationId) return;
    const socket = getSocket();
    socket.emit('message:read', { conversationId: activeConversationId });
  }, [activeConversationId]);

  return {
    peerIsTyping,
    peerTypingName,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
  };
}
