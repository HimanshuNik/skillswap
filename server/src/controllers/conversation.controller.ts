import type { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/message.service.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { getIO } from '../socket/index.js';
import { notificationService } from '../services/notification.service.js';
import {
  sendMessageSchema,
  getMessagesQuerySchema,
} from '../validators/message.validator.js';
import {
  ValidationError,
  UnauthorizedError,
  BadRequestError,
} from '../utils/errors.js';

export class ConversationController {
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const conversations = await messageService.getUserConversations(req.user.id);

      res.status(200).json({
        success: true,
        data: { conversations },
      });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const unreadCount = await messageService.getTotalUnreadCount(req.user.id);

      res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conversationId = parseInt(rawId, 10);
      if (isNaN(conversationId) || conversationId <= 0) {
        throw new BadRequestError('Invalid conversation ID');
      }

      const parsedQuery = getMessagesQuerySchema.safeParse(req.query);
      if (!parsedQuery.success) {
        const issues = parsedQuery.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid query parameters', issues);
      }

      const result = await messageService.getConversationMessages(
        req.user.id,
        conversationId,
        parsedQuery.data
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conversationId = parseInt(rawId, 10);
      if (isNaN(conversationId) || conversationId <= 0) {
        throw new BadRequestError('Invalid conversation ID');
      }

      const parsedBody = sendMessageSchema.safeParse(req.body);
      if (!parsedBody.success) {
        const issues = parsedBody.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid message data', issues);
      }

      const message = await messageService.sendMessage(
        req.user.id,
        conversationId,
        parsedBody.data.content,
        parsedBody.data.clientMessageId
      );

      // Broadcast to Socket.IO real-time clients if socket server is initialized
      try {
        const io = getIO();
        io.to(`conversation:${conversationId}`).emit('message:new', message);

        const participants = await conversationRepository.getParticipants(conversationId);
        for (const p of participants) {
          io.to(`user:${p.userId}`).emit('conversation:updated', {
            conversationId,
            latestMessage: message,
          });

          if (p.userId !== req.user.id) {
            notificationService
              .createNotification({
                userId: p.userId,
                type: 'MESSAGE_RECEIVED',
                title: 'New Message',
                message: `${req.user.name}: ${message.content.slice(0, 60)}`,
                linkUrl: `/messages?c=${conversationId}`,
                relatedEntityType: 'CONVERSATION',
                relatedEntityId: conversationId,
              })
              .catch(() => {});
          }
        }
      } catch {
        // Socket.IO may not be active in isolated unit tests
      }

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: { message },
      });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const conversationId = parseInt(rawId, 10);
      if (isNaN(conversationId) || conversationId <= 0) {
        throw new BadRequestError('Invalid conversation ID');
      }

      const result = await messageService.markConversationAsRead(
        req.user.id,
        conversationId
      );

      // Broadcast read receipt to room
      try {
        const io = getIO();
        io.to(`conversation:${conversationId}`).emit('message:read_ack', {
          conversationId,
          readerId: req.user.id,
          lastReadAt: result.lastReadAt,
        });
      } catch {
        // Socket.IO may not be active
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const conversationController = new ConversationController();
