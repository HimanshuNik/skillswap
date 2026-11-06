import { apiFetch } from './api';

export interface DeviceSubscriptionItem {
  id: number;
  endpoint: string;
  userAgent: string | null;
  createdAt: string;
}

export const pwaApi = {
  async getPublicKey(): Promise<string> {
    const res = await apiFetch<{ success: boolean; data: { publicKey: string } }>(
      '/api/notifications/push/public-key'
    );
    return res.data.publicKey;
  },

  async subscribe(
    subscription: PushSubscription,
    userAgent?: string
  ): Promise<{ id: number; endpoint: string }> {
    const subJson = subscription.toJSON();
    const payload = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJson.keys?.p256dh || '',
        auth: subJson.keys?.auth || '',
      },
      userAgent,
    };

    const res = await apiFetch<{
      success: boolean;
      data: { id: number; endpoint: string };
    }>('/api/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async unsubscribe(endpoint: string): Promise<void> {
    await apiFetch('/api/notifications/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },

  async getSubscriptions(): Promise<DeviceSubscriptionItem[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { subscriptions: DeviceSubscriptionItem[] };
    }>('/api/notifications/push/subscriptions');
    return res.data.subscriptions;
  },

  async sendTestPush(payload?: {
    title?: string;
    body?: string;
  }): Promise<{ sentCount: number; failureCount: number }> {
    const res = await apiFetch<{
      success: boolean;
      data: { sentCount: number; failureCount: number };
    }>('/api/notifications/push/test', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
    return res.data;
  },
};

