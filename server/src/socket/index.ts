import type { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AUTH_COOKIE_NAME } from '../middleware/auth.middleware.js';
import { verifyToken } from '../utils/tokens.js';
import { userRepository, type SafeUser } from '../repositories/user.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { studyGroupMemberRepository } from '../repositories/studyGroupMember.repository.js';
import { messageService } from '../services/message.service.js';
import { groupChatService } from '../services/collaboration/groupChat.service.js';

interface AuthenticatedSocket extends Socket {
  data: {
    user: SafeUser;
  };
}

let io: SocketIOServer | null = null;

// Track online user connections: userId -> Set of socket IDs
const onlineUsers = new Map<number, Set<string>>();

// Track socket message timestamps for rate limiting: socketId -> number[]
const socketMessageTimestamps = new Map<string, number[]>();

export const isUserOnline = (userId: number): boolean => {
  const sockets = onlineUsers.get(userId);
  return !!sockets && sockets.size > 0;
};

export const getSocketMetrics = () => {
  return {
    activeSockets: io?.engine?.clientsCount || 0,
    onlineUsersCount: onlineUsers.size,
  };
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return io;
};

export const closeSocketServer = async (): Promise<void> => {
  if (io) {
    onlineUsers.clear();
    socketMessageTimestamps.clear();
    await new Promise<void>((resolve) => {
      io!.close(() => resolve());
    });
    io = null;
  }
};

export const emitToGroup = (groupId: number, event: string, payload: any) => {
  try {
    io?.to(`group:${groupId}`).emit(event, payload);
  } catch (err: any) {
    logger.debug(`[SocketIO] emitToGroup failed: ${err.message}`);
  }
};

function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const val = parts.slice(1).join('=').trim();
    list[name] = decodeURIComponent(val);
  });
  return list;
}

export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      // 1. Check cookies from handshake headers
      const cookies = parseCookies(socket.handshake.headers.cookie);
      let token = cookies[AUTH_COOKIE_NAME];

      // 2. Fallback to auth object in handshake
      if (!token && socket.handshake.auth && typeof socket.handshake.auth.token === 'string') {
        token = socket.handshake.auth.token;
      }

      // 3. Fallback to Authorization header
      if (!token && socket.handshake.headers.authorization?.startsWith('Bearer ')) {
        token = socket.handshake.headers.authorization.split(' ')[1];
      }

      if (!token) {
        logger.warn('[SocketIO] Connection attempt rejected: No authentication token');
        return next(new Error('Authentication required'));
      }

      const payload = verifyToken(token);
      if (!payload) {
        logger.warn('[SocketIO] Connection attempt rejected: Invalid token payload');
        return next(new Error('Invalid or expired authentication token'));
      }

      const user = await userRepository.findById(payload.userId);
      if (!user || user.isActive === false) {
        logger.warn(`[SocketIO] Connection attempt rejected: User ${payload.userId} not found or deactivated`);
        return next(new Error(user && user.isActive === false ? 'Account is deactivated' : 'User not found'));
      }

      (socket as AuthenticatedSocket).data = {
        user: userRepository.toSafeUser(user),
      };

      next();
    } catch (err: any) {
      logger.warn(`[SocketIO] Authentication error: ${err.message}`);
      next(new Error('Invalid or expired authentication token'));
    }
  });

  // Connection handling
  io.on('connection', (socketRaw) => {
    const socket = socketRaw as AuthenticatedSocket;
    const user = socket.data.user;
    const userId = user.id;

    logger.info(`[SocketIO] User connected: id=${userId} name="${user.name}" (socket=${socket.id})`);

    // Add to presence tracking
    const existingSockets = onlineUsers.get(userId) || new Set<string>();
    const wasOffline = existingSockets.size === 0;
    existingSockets.add(socket.id);
    onlineUsers.set(userId, existingSockets);

    // Join personal user room for targeted notifications
    socket.join(`user:${userId}`);

    // If user just transitioned to online, broadcast to everyone
    if (wasOffline) {
      io?.emit('presence:update', { userId, isOnline: true });
    }

    // Join Conversation Room
    socket.on('conversation:join', async (data: { conversationId: number }, callback?: Function) => {
      try {
        const conversationId = Number(data?.conversationId);
        if (!conversationId || isNaN(conversationId)) {
          throw new Error('Invalid conversation ID');
        }

        const isParticipant = await conversationRepository.isParticipant(conversationId, userId);
        if (!isParticipant) {
          throw new Error('You are not authorized to join this conversation');
        }

        const roomName = `conversation:${conversationId}`;
        await socket.join(roomName);
        logger.debug(`[SocketIO] Socket ${socket.id} (user ${userId}) joined ${roomName}`);

        if (typeof callback === 'function') {
          callback({ success: true, conversationId });
        }
        socket.emit('conversation:joined', { conversationId });
      } catch (err: any) {
        logger.warn(`[SocketIO] conversation:join error: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
        socket.emit('error', { message: err.message });
      }
    });

    // Leave Conversation Room
    socket.on('conversation:leave', async (data: { conversationId: number }, callback?: Function) => {
      try {
        const conversationId = Number(data?.conversationId);
        if (conversationId) {
          const roomName = `conversation:${conversationId}`;
          await socket.leave(roomName);
          logger.debug(`[SocketIO] Socket ${socket.id} left ${roomName}`);
        }
        if (typeof callback === 'function') {
          callback({ success: true, conversationId });
        }
        socket.emit('conversation:left', { conversationId });
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // Send Real-Time Message
    socket.on(
      'message:send',
      async (
        data: { conversationId: number; content: string; clientMessageId?: string },
        callback?: Function
      ) => {
        try {
          // Socket rate limit: max 10 messages per 5 seconds per connection
          const now = Date.now();
          const timestamps = (socketMessageTimestamps.get(socket.id) || []).filter((t) => now - t < 5000);
          if (timestamps.length >= 10) {
            throw new Error('Rate limit exceeded: You are sending messages too quickly');
          }
          timestamps.push(now);
          socketMessageTimestamps.set(socket.id, timestamps);

          const conversationId = Number(data?.conversationId);
          if (!conversationId || isNaN(conversationId)) {
            throw new Error('Invalid conversation ID');
          }

          const message = await messageService.sendMessage(
            userId,
            conversationId,
            data.content,
            data.clientMessageId
          );

          // 1. Acknowledge back to sender
          if (typeof callback === 'function') {
            callback({ success: true, message });
          }
          socket.emit('message:ack', {
            clientMessageId: data.clientMessageId,
            message,
          });

          // 2. Broadcast message to the conversation room
          io?.to(`conversation:${conversationId}`).emit('message:new', message);

          // 3. Notify participants' personal rooms for sidebar/badge refresh
          const participants = await conversationRepository.getParticipants(conversationId);
          for (const p of participants) {
            io?.to(`user:${p.userId}`).emit('conversation:updated', {
              conversationId,
              latestMessage: message,
            });
          }
        } catch (err: any) {
          logger.warn(`[SocketIO] message:send failed: ${err.message}`);
          if (typeof callback === 'function') {
            callback({ success: false, error: err.message });
          }
          socket.emit('error', { message: err.message });
        }
      }
    );

    // Typing Indicators
    socket.on('typing:start', async (data: { conversationId: number }) => {
      const conversationId = Number(data?.conversationId);
      if (!conversationId) return;

      const isParticipant = await conversationRepository.isParticipant(conversationId, userId);
      if (!isParticipant) return;

      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: true,
        user: {
          id: user.id,
          name: user.name,
        },
      });
    });

    socket.on('typing:stop', async (data: { conversationId: number }) => {
      const conversationId = Number(data?.conversationId);
      if (!conversationId) return;

      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    // Mark Messages as Read
    socket.on('message:read', async (data: { conversationId: number }, callback?: Function) => {
      try {
        const conversationId = Number(data?.conversationId);
        if (!conversationId) return;

        const result = await messageService.markConversationAsRead(userId, conversationId);

        if (typeof callback === 'function') {
          callback({ success: true, result });
        }

        // Notify other participants in room that their messages were read
        io?.to(`conversation:${conversationId}`).emit('message:read_ack', {
          conversationId,
          readerId: userId,
          lastReadAt: result.lastReadAt,
        });

        // Notify reader's personal room to decrement total badge count
        socket.emit('unread:updated', { conversationId });
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    // --- Study Group Real-Time Chat ---
    socket.on('group:join', async (data: { groupId: number }, callback?: Function) => {
      try {
        const groupId = Number(data?.groupId);
        if (!groupId || isNaN(groupId)) {
          throw new Error('Invalid study group ID');
        }

        const member = await studyGroupMemberRepository.findMember(groupId, userId);
        if (!member || member.status !== 'ACTIVE') {
          throw new Error('You are not authorized to join this group room');
        }

        const roomName = `group:${groupId}`;
        await socket.join(roomName);
        logger.debug(`[SocketIO] Socket ${socket.id} (user ${userId}) joined ${roomName}`);

        if (typeof callback === 'function') {
          callback({ success: true, groupId });
        }
        socket.emit('group:joined', { groupId });
      } catch (err: any) {
        logger.warn(`[SocketIO] group:join error: ${err.message}`);
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('group:leave', async (data: { groupId: number }, callback?: Function) => {
      try {
        const groupId = Number(data?.groupId);
        if (groupId) {
          const roomName = `group:${groupId}`;
          await socket.leave(roomName);
          logger.debug(`[SocketIO] Socket ${socket.id} left ${roomName}`);
        }
        if (typeof callback === 'function') {
          callback({ success: true, groupId });
        }
        socket.emit('group:left', { groupId });
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ success: false, error: err.message });
        }
      }
    });

    socket.on(
      'group:message:send',
      async (data: { groupId: number; content: string }, callback?: Function) => {
        try {
          const now = Date.now();
          const timestamps = (socketMessageTimestamps.get(socket.id) || []).filter(
            (t) => now - t < 5000
          );
          if (timestamps.length >= 10) {
            throw new Error('Rate limit exceeded: You are sending messages too quickly');
          }
          timestamps.push(now);
          socketMessageTimestamps.set(socket.id, timestamps);

          const groupId = Number(data?.groupId);
          if (!groupId || isNaN(groupId)) {
            throw new Error('Invalid group ID');
          }

          const message = await groupChatService.sendMessage(groupId, userId, data.content);

          if (typeof callback === 'function') {
            callback({ success: true, message });
          }
        } catch (err: any) {
          logger.warn(`[SocketIO] group:message:send error: ${err.message}`);
          if (typeof callback === 'function') {
            callback({ success: false, error: err.message });
          }
          socket.emit('error', { message: err.message });
        }
      }
    );

    // Disconnect
    socket.on('disconnect', () => {
      logger.info(`[SocketIO] User disconnected: id=${userId} (socket=${socket.id})`);
      socketMessageTimestamps.delete(socket.id);

      const userSocketSet = onlineUsers.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast offline event to all clients
          io?.emit('presence:update', { userId, isOnline: false });
        }
      }
    });
  });

  return io;
};
