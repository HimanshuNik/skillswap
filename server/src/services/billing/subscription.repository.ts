import { db } from '../../prisma/db.js';
import { planRepository, type PlanEntitlements } from './plan.repository.js';

export interface UserSubscriptionDetails {
  id: number;
  userId: number;
  planId: number;
  planCode: string;
  status: string; // FREE, TRIALING, ACTIVE, PAST_DUE, CANCELED, EXPIRED
  billingCycle: string; // MONTHLY, YEARLY, NONE
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  plan?: {
    name: string;
    description: string | null;
    monthlyPriceCents: number;
    yearlyPriceCents: number;
    currency: string;
    features: string[];
    entitlements: PlanEntitlements;
  };
}

export const subscriptionRepository = {
  async findByUserId(userId: number): Promise<UserSubscriptionDetails | null> {
    const sub = await db.orm.public.UserSubscription.where({ userId }).first();
    if (!sub) return null;

    const plan = await planRepository.findById(sub.planId);
    return {
      ...sub,
      plan: plan
        ? {
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            yearlyPriceCents: plan.yearlyPriceCents,
            currency: plan.currency,
            features: plan.features,
            entitlements: plan.entitlements,
          }
        : undefined,
    };
  },

  async findByProviderSubscriptionId(subId: string): Promise<UserSubscriptionDetails | null> {
    const sub = await db.orm.public.UserSubscription.where({ providerSubscriptionId: subId }).first();
    if (!sub) return null;
    const plan = await planRepository.findById(sub.planId);
    return {
      ...sub,
      plan: plan
        ? {
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            yearlyPriceCents: plan.yearlyPriceCents,
            currency: plan.currency,
            features: plan.features,
            entitlements: plan.entitlements,
          }
        : undefined,
    };
  },

  async upsertSubscription(data: {
    userId: number;
    planId: number;
    planCode: string;
    status: string;
    billingCycle: string;
    provider: string;
    providerCustomerId?: string | null;
    providerSubscriptionId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
    canceledAt?: string | null;
  }): Promise<UserSubscriptionDetails> {
    const existing = await db.orm.public.UserSubscription.where({ userId: data.userId }).first();

    let record: any;
    if (existing) {
      await db.orm.public.UserSubscription.where({ id: existing.id }).update({
        planId: data.planId,
        planCode: data.planCode,
        status: data.status,
        billingCycle: data.billingCycle,
        provider: data.provider,
        providerCustomerId: data.providerCustomerId ?? existing.providerCustomerId,
        providerSubscriptionId: data.providerSubscriptionId ?? existing.providerSubscriptionId,
        currentPeriodStart: data.currentPeriodStart !== undefined ? (data.currentPeriodStart as any) : existing.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd !== undefined ? (data.currentPeriodEnd as any) : existing.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? existing.cancelAtPeriodEnd,
        canceledAt: data.canceledAt !== undefined ? (data.canceledAt as any) : existing.canceledAt,
      });
      record = await db.orm.public.UserSubscription.where({ id: existing.id }).first();
    } else {
      record = await db.orm.public.UserSubscription.create({
        userId: data.userId,
        planId: data.planId,
        planCode: data.planCode,
        status: data.status,
        billingCycle: data.billingCycle,
        provider: data.provider,
        providerCustomerId: data.providerCustomerId ?? null,
        providerSubscriptionId: data.providerSubscriptionId ?? null,
        currentPeriodStart: (data.currentPeriodStart as any) ?? null,
        currentPeriodEnd: (data.currentPeriodEnd as any) ?? null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        canceledAt: (data.canceledAt as any) ?? null,
      });
    }

    // Keep User.subscriptionTier in sync
    await db.orm.public.User.where({ id: data.userId }).update({
      subscriptionTier: data.status === 'ACTIVE' || data.status === 'TRIALING' ? data.planCode : 'FREE',
    });

    const plan = await planRepository.findById(record.planId);
    return {
      ...record,
      plan: plan
        ? {
            name: plan.name,
            description: plan.description,
            monthlyPriceCents: plan.monthlyPriceCents,
            yearlyPriceCents: plan.yearlyPriceCents,
            currency: plan.currency,
            features: plan.features,
            entitlements: plan.entitlements,
          }
        : undefined,
    };
  },

  async updateStatus(
    userId: number,
    status: string,
    extra?: {
      cancelAtPeriodEnd?: boolean;
      canceledAt?: string | null;
      currentPeriodEnd?: string | null;
      planCode?: string;
      planId?: number;
    }
  ): Promise<void> {
    const existing = await db.orm.public.UserSubscription.where({ userId }).first();
    if (!existing) return;

    const updates: Record<string, any> = { status };
    if (extra?.cancelAtPeriodEnd !== undefined) updates['cancelAtPeriodEnd'] = extra.cancelAtPeriodEnd;
    if (extra?.canceledAt !== undefined) updates['canceledAt'] = extra.canceledAt;
    if (extra?.currentPeriodEnd !== undefined) updates['currentPeriodEnd'] = extra.currentPeriodEnd;
    if (extra?.planCode !== undefined) updates['planCode'] = extra.planCode;
    if (extra?.planId !== undefined) updates['planId'] = extra.planId;

    await db.orm.public.UserSubscription.where({ id: existing.id }).update(updates);

    // Update User.subscriptionTier
    const effectiveTier = status === 'ACTIVE' || status === 'TRIALING' ? (extra?.planCode ?? existing.planCode) : 'FREE';
    await db.orm.public.User.where({ id: userId }).update({
      subscriptionTier: effectiveTier,
    });
  },

  async findAllWithFilters(params: {
    page?: number;
    limit?: number;
    status?: string;
    planCode?: string;
  }): Promise<{ subscriptions: any[]; total: number; totalPages: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(100, params.limit || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (params.status && params.status !== 'ALL') where['status'] = params.status;
    if (params.planCode && params.planCode !== 'ALL') where['planCode'] = params.planCode;

    const rows = (await db.orm.public.UserSubscription.where(where).all()) as any[];
    const total = rows.length;
    const paginated = rows.slice(offset, offset + limit);

    // Enrich with user email/name and plan name
    const enriched = await Promise.all(
      paginated.map(async (sub: any) => {
        const user = await db.orm.public.User.where({ id: sub.userId })
          .select('id', 'name', 'email', 'username')
          .first();
        const plan = await planRepository.findById(sub.planId);
        return {
          ...sub,
          user: user || { id: sub.userId, name: 'Unknown', email: '', username: '' },
          planName: plan?.name || sub.planCode,
        };
      })
    );

    return {
      subscriptions: enriched,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  async getStatusCounts(): Promise<{
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    free: number;
    total: number;
  }> {
    const all = (await db.orm.public.UserSubscription.all()) as any[];

    let active = 0;
    let trialing = 0;
    let pastDue = 0;
    let canceled = 0;
    let free = 0;

    for (const s of all) {
      if (s.status === 'ACTIVE') active++;
      else if (s.status === 'TRIALING') trialing++;
      else if (s.status === 'PAST_DUE') pastDue++;
      else if (s.status === 'CANCELED') canceled++;
      else if (s.status === 'FREE') free++;
    }

    return {
      active,
      trialing,
      pastDue,
      canceled,
      free,
      total: all.length,
    };
  },
};
