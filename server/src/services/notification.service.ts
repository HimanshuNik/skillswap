import {
  notificationRepository,
  type NotificationRecord,
} from '../repositories/notification.repository.js';
import { notificationPreferenceRepository } from '../repositories/notificationPreference.repository.js';
import type { NotificationQueryInput } from '../validators/notification.validator.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { getIO } from '../socket/index.js';
import { logger } from '../config/logger.js';
import { pushNotificationService } from './pushNotification.service.js';

export class NotificationService {
  private emitSocketEvent(room: string, event: string, data: any) {
    try {
      const io = getIO();
      io.to(room).emit(event, data);
    } catch (err: any) {
      logger.debug(`[NotificationService] Socket emit failed or inactive: ${err.message}`);
    }
  }

  private createSuppressedNotification(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    linkUrl?: string | null;
    link?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: number | null;
  }): NotificationRecord {
    return {
      id: 0,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: true,
      linkUrl: data.linkUrl || data.link || null,
      referenceId: data.relatedEntityId || null,
      referenceType: data.relatedEntityType || null,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      readAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Persists a notification to PostgreSQL and emits a real-time event to the user.
   */
  async createNotification(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
    linkUrl?: string | null;
    link?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: number | null;
  }): Promise<NotificationRecord> {
    // Check user's notification preferences
    const prefs = await notificationPreferenceRepository.getOrDefault(data.userId);
    const typeUpper = data.type.toUpperCase();

    if (typeUpper.startsWith('SWAP_') && !prefs.swapRequests) {
      return this.createSuppressedNotification(data);
    }
    if (typeUpper.startsWith('SESSION_') && !prefs.sessions) {
      return this.createSuppressedNotification(data);
    }
    if (typeUpper.startsWith('REVIEW_') && !prefs.reviews) {
      return this.createSuppressedNotification(data);
    }
    if (typeUpper.startsWith('MESSAGE_') && !prefs.messages) {
      return this.createSuppressedNotification(data);
    }

    const notification = await notificationRepository.create(data);

    // Fetch updated unread count
    const unreadCount = await notificationRepository.countUnread(data.userId);

    // Emit real-time events to user room
    this.emitSocketEvent(`user:${data.userId}`, 'notification:new', notification);
    this.emitSocketEvent(`user:${data.userId}`, 'notification:count', { unreadCount });

    // Dispatch Web Push notification to user's registered devices
    pushNotificationService
      .sendPushToUser(
        data.userId,
        {
          title: data.title,
          body: data.message,
          data: {
            url: data.linkUrl || data.link || '/dashboard',
          },
        },
        data.type
      )
      .catch((err: any) => {
        logger.debug(`[NotificationService] Web Push delivery background error: ${err.message}`);
      });

    return notification;
  }

  async getUserNotifications(
    userId: number,
    query: NotificationQueryInput
  ): Promise<{
    notifications: NotificationRecord[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
  }> {
    return notificationRepository.findByUser(userId, query);
  }

  async getUnreadCount(userId: number): Promise<{ unreadCount: number }> {
    const count = await notificationRepository.countUnread(userId);
    return { unreadCount: count };
  }

  async markAsRead(id: number, userId: number): Promise<NotificationRecord> {
    const existing = await notificationRepository.findById(id);
    if (!existing) {
      throw new NotFoundError('Notification not found');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenError('You are not authorized to mark this notification as read');
    }

    const updated = await notificationRepository.markAsRead(id, userId);
    const unreadCount = await notificationRepository.countUnread(userId);

    this.emitSocketEvent(`user:${userId}`, 'notification:read', {
      id,
      notificationId: id,
      readAt: updated?.readAt,
    });
    this.emitSocketEvent(`user:${userId}`, 'notification:count', { unreadCount });

    return updated || existing;
  }

  async markAllAsRead(userId: number): Promise<{ markedCount: number; unreadCount: number }> {
    const markedCount = await notificationRepository.markAllAsRead(userId);

    this.emitSocketEvent(`user:${userId}`, 'notification:read', {
      all: true,
    });
    this.emitSocketEvent(`user:${userId}`, 'notification:count', { unreadCount: 0 });

    return { markedCount, unreadCount: 0 };
  }
}

export const notificationService = new NotificationService();
