import type { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service.js';
import { notificationQuerySchema } from '../validators/notification.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class NotificationController {
  async getUserNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = notificationQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { limit: 20, page: 1 };

      const result = await notificationService.getUserNotifications(req.user.id, query);

      res.status(200).json({
        success: true,
        data: result,
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

      const result = await notificationService.getUnreadCount(req.user.id);

      res.status(200).json({
        success: true,
        data: result,
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

      const notificationId = parseInt(req.params.id as string, 10);
      if (isNaN(notificationId)) {
        res.status(400).json({ success: false, message: 'Invalid notification ID' });
        return;
      }

      const notification = await notificationService.markAsRead(notificationId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: { notification },
      });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const result = await notificationService.markAllAsRead(req.user.id);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();

