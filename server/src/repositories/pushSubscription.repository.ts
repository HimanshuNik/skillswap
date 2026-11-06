import { db } from '../prisma/db.js';

export interface PushSubscriptionRecord {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePushSubscriptionInput {
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

export class PushSubscriptionRepository {
  async findByUserIdAndEndpoint(
    userId: number,
    endpoint: string,
    client: any = db
  ): Promise<PushSubscriptionRecord | null> {
    const record = await client.orm.public.PushSubscription.where({
      userId,
      endpoint,
    }).first();
    return record as unknown as PushSubscriptionRecord | null;
  }

  async findByUserId(
    userId: number,
    client: any = db
  ): Promise<PushSubscriptionRecord[]> {
    const records = await client.orm.public.PushSubscription.where({
      userId,
    }).all();
    return records as unknown as PushSubscriptionRecord[];
  }

  async upsert(
    input: CreatePushSubscriptionInput,
    client: any = db
  ): Promise<PushSubscriptionRecord> {
    const existing = await this.findByUserIdAndEndpoint(input.userId, input.endpoint, client);

    if (existing) {
      const updated = await client.orm.public.PushSubscription.where({ id: existing.id }).update({
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || existing.userAgent,
      });
      return updated as unknown as PushSubscriptionRecord;
    }

    const created = await client.orm.public.PushSubscription.create({
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent || null,
    });
    return created as unknown as PushSubscriptionRecord;
  }

  async delete(
    userId: number,
    endpoint: string,
    client: any = db
  ): Promise<boolean> {
    const existing = await this.findByUserIdAndEndpoint(userId, endpoint, client);
    if (!existing) return false;

    await client.orm.public.PushSubscription.where({ id: existing.id }).delete();
    return true;
  }

  async deleteByEndpoint(
    endpoint: string,
    client: any = db
  ): Promise<boolean> {
    const records = await client.orm.public.PushSubscription.where({ endpoint }).all();
    if (!records || records.length === 0) return false;

    for (const r of records) {
      await client.orm.public.PushSubscription.where({ id: r.id }).delete();
    }
    return true;
  }
}

export const pushSubscriptionRepository = new PushSubscriptionRepository();

