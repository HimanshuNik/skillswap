import { db } from '../../prisma/db.js';

export const billingWebhookRepository = {
  async recordEvent(params: {
    eventId: string;
    eventType: string;
    provider: string;
    payload: string;
  }): Promise<{ isDuplicate: boolean }> {
    const existing = await db.orm.public.BillingWebhookEvent.where({ eventId: params.eventId }).first();
    if (existing) {
      return { isDuplicate: true };
    }

    await db.orm.public.BillingWebhookEvent.create({
      eventId: params.eventId,
      eventType: params.eventType,
      provider: params.provider,
      payload: params.payload,
      status: 'PENDING',
    });

    return { isDuplicate: false };
  },

  async isEventProcessed(eventId: string): Promise<boolean> {
    const event = await db.orm.public.BillingWebhookEvent.where({ eventId }).first();
    return event?.status === 'PROCESSED';
  },

  async markProcessed(eventId: string): Promise<void> {
    await db.orm.public.BillingWebhookEvent.where({ eventId }).update({
      status: 'PROCESSED',
      processedAt: new Date().toISOString() as any,
    });
  },

  async markFailed(eventId: string, errorMessage: string): Promise<void> {
    await db.orm.public.BillingWebhookEvent.where({ eventId }).update({
      status: 'FAILED',
      errorMessage,
    });
  },
};

