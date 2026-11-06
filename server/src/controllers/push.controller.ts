import type { Request, Response, NextFunction } from 'express';
import { pushNotificationService } from '../services/pushNotification.service.js';
import {
  subscribePushSchema,
  unsubscribePushSchema,
  testPushSchema,
} from '../validators/push.validator.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors.js';

export class PushController {
  async getPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const publicKey = pushNotificationService.getVapidPublicKey();
      res.status(200).json({
        success: true,
        data: { publicKey },
      });
    } catch (err) {
      next(err);
    }
  }

  async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = subscribePushSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid push subscription payload', issues);
      }

      // Add userAgent from request header if not explicitly provided
      const userAgent =
        parsed.data.userAgent ||
        (typeof req.headers['user-agent'] === 'string'
          ? req.headers['user-agent']
          : undefined);

      const subscription = await pushNotificationService.subscribe(req.user.id, {
        ...parsed.data,
        userAgent,
      });

      res.status(201).json({
        success: true,
        message: 'Push subscription registered successfully',
        data: {
          id: subscription.id,
          endpoint: subscription.endpoint,
          createdAt: subscription.createdAt,
          subscription: {
            id: subscription.id,
            endpoint: subscription.endpoint,
            createdAt: subscription.createdAt,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = unsubscribePushSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid unsubscribe payload', issues);
      }

      const deleted = await pushNotificationService.unsubscribe(
        req.user.id,
        parsed.data.endpoint
      );

      if (!deleted) {
        throw new NotFoundError('Subscription not found');
      }

      res.status(200).json({
        success: true,
        message: 'Push subscription removed successfully',
        data: { deleted },
      });
    } catch (err) {
      next(err);
    }
  }

  async getSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const subscriptions = await pushNotificationService.getUserSubscriptions(req.user.id);

      res.status(200).json({
        success: true,
        data: { subscriptions },
      });
    } catch (err) {
      next(err);
    }
  }

  async sendTestPush(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = testPushSchema.safeParse(req.body || {});
      const input = parsed.success ? parsed.data : undefined;

      const outcome = await pushNotificationService.sendTestPush(req.user.id, input);

      res.status(200).json({
        success: true,
        message:
          outcome.sentCount > 0
            ? 'Test push notification delivered successfully'
            : 'No active device subscriptions available or push is disabled in preferences',
        data: outcome,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const pushController = new PushController();
