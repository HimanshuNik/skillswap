import * as webpush from 'web-push';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  pushSubscriptionRepository,
  type PushSubscriptionRecord,
} from '../repositories/pushSubscription.repository.js';
import { pushDeliveryLogRepository } from '../repositories/pushDeliveryLog.repository.js';
import { notificationPreferenceRepository } from '../repositories/notificationPreference.repository.js';
import type { SubscribePushInput } from '../validators/push.validator.js';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    [key: string]: any;
  };
}

export class PushNotificationService {
  private isConfigured = false;

  constructor() {
    try {
      if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT) {
        webpush.setVapidDetails(
          env.VAPID_SUBJECT,
          env.VAPID_PUBLIC_KEY,
          env.VAPID_PRIVATE_KEY
        );
        this.isConfigured = true;
        logger.info('[PushNotificationService] Web Push configured successfully with VAPID.');
      } else {
        logger.warn('[PushNotificationService] Missing VAPID configuration. Push notifications will be mocked.');
      }
    } catch (err: any) {
      logger.error(`[PushNotificationService] Error initializing VAPID: ${err.message}`);
    }
  }

  getVapidPublicKey(): string {
    return env.VAPID_PUBLIC_KEY;
  }

  async subscribe(
    userId: number,
    input: SubscribePushInput
  ): Promise<PushSubscriptionRecord> {
    return pushSubscriptionRepository.upsert({
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent || null,
    });
  }

  async unsubscribe(userId: number, endpoint: string): Promise<boolean> {
    return pushSubscriptionRepository.delete(userId, endpoint);
  }

  async getUserSubscriptions(userId: number): Promise<Array<{
    id: number;
    endpoint: string;
    userAgent: string | null;
    createdAt: string;
  }>> {
    const subs = await pushSubscriptionRepository.findByUserId(userId);
    return subs.map((s) => ({
      id: s.id,
      endpoint: s.endpoint,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
    }));
  }

  /**
   * Evaluates user preferences before dispatching push notifications
   */
  private async isPushAllowedForEvent(
    userId: number,
    eventType: string
  ): Promise<boolean> {
    const prefs = await notificationPreferenceRepository.getOrDefault(userId);
    if (!prefs.pushEnabled) return false;

    const evUpper = eventType.toUpperCase();
    if (evUpper.includes('SWAP')) return prefs.pushSwapRequests;
    if (evUpper.includes('MESSAGE') || evUpper.includes('CHAT')) return prefs.pushMessages;
    if (evUpper.includes('REMINDER')) return prefs.pushReminders;
    if (evUpper.includes('SESSION')) return prefs.pushSessions;
    if (evUpper.includes('GROUP') || evUpper.includes('ANNOUNCEMENT')) return prefs.pushGroupActivity;

    return true;
  }

  /**
   * Dispatches push notification to all active device subscriptions for a user.
   */
  async sendPushToUser(
    userId: number,
    payload: PushPayload,
    eventType = 'GENERAL'
  ): Promise<{ sentCount: number; failureCount: number; suppressed: boolean }> {
    const isAllowed = await this.isPushAllowedForEvent(userId, eventType);
    if (!isAllowed) {
      logger.debug(`[PushNotificationService] Push suppressed for user ${userId} due to preference (event: ${eventType})`);
      return { sentCount: 0, failureCount: 0, suppressed: true };
    }

    const subscriptions = await pushSubscriptionRepository.findByUserId(userId);
    if (subscriptions.length === 0) {
      return { sentCount: 0, failureCount: 0, suppressed: false };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.svg',
      badge: payload.badge || '/icons/icon-192.svg',
      data: {
        url: payload.data?.url || '/dashboard',
        timestamp: Date.now(),
        eventType,
      },
    });

    let sentCount = 0;
    let failureCount = 0;

    for (const sub of subscriptions) {
      try {
        if (this.isConfigured && process.env.NODE_ENV !== 'test') {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            notificationPayload
          );
        }

        sentCount++;
        await pushDeliveryLogRepository.create({
          userId,
          endpoint: sub.endpoint,
          eventType,
          payloadJson: notificationPayload,
          status: 'DELIVERED',
          statusCode: 201,
        });
      } catch (err: any) {
        failureCount++;
        const statusCode = err.statusCode || null;

        // Auto-prune expired or revoked subscriptions
        if (statusCode === 404 || statusCode === 410) {
          logger.info(`[PushNotificationService] Pruning expired subscription: ${sub.endpoint}`);
          await pushSubscriptionRepository.delete(userId, sub.endpoint);

          await pushDeliveryLogRepository.create({
            userId,
            endpoint: sub.endpoint,
            eventType,
            payloadJson: notificationPayload,
            status: 'EXPIRED',
            statusCode,
            errorMessage: err.message || 'Subscription has expired or is no longer valid.',
          });
        } else {
          logger.warn(`[PushNotificationService] Push delivery error for user ${userId}: ${err.message}`);
          await pushDeliveryLogRepository.create({
            userId,
            endpoint: sub.endpoint,
            eventType,
            payloadJson: notificationPayload,
            status: 'FAILED',
            statusCode,
            errorMessage: err.message,
          });
        }
      }
    }

    return { sentCount, failureCount, suppressed: false };
  }

  async sendTestPush(
    userId: number,
    input?: { title?: string; body?: string }
  ): Promise<{ sentCount: number; failureCount: number }> {
    const payload: PushPayload = {
      title: input?.title || 'SkillSwap Push Notifications Active 🚀',
      body:
        input?.body ||
        'Your browser device is successfully connected to SkillSwap real-time alerts.',
      data: {
        url: '/settings',
      },
    };

    const res = await this.sendPushToUser(userId, payload, 'TEST');
    return { sentCount: res.sentCount, failureCount: res.failureCount };
  }
}

export const pushNotificationService = new PushNotificationService();

