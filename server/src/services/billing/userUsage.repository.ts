import { db } from '../../prisma/db.js';

export interface UserUsageRecord {
  id: number;
  userId: number;
  activeSwapRequestsCount: number;
  monthlySessionsBooked: number;
  cycleResetAt: string;
  createdAt: string;
  updatedAt: string;
}

export const userUsageRepository = {
  async getOrCreate(userId: number): Promise<UserUsageRecord> {
    const existing = await db.orm.public.UserUsage.where({ userId }).first();
    if (existing) {
      return existing as unknown as UserUsageRecord;
    }

    const created = await db.orm.public.UserUsage.create({
      userId,
      activeSwapRequestsCount: 0,
      monthlySessionsBooked: 0,
    });
    return created as unknown as UserUsageRecord;
  },

  async getActiveSwapCount(userId: number): Promise<number> {
    const activeStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];
    const sent = (await db.orm.public.SwapRequest.where({ senderId: userId }).all()) as any[];
    const count = sent.filter((r: any) => activeStatuses.includes(r.status)).length;


    // Cache to UserUsage
    const existing = await db.orm.public.UserUsage.where({ userId }).first();
    if (existing) {
      await db.orm.public.UserUsage.where({ id: existing.id }).update({
        activeSwapRequestsCount: count,
      });
    } else {
      await db.orm.public.UserUsage.create({
        userId,
        activeSwapRequestsCount: count,
      });
    }

    return count;
  },
};
