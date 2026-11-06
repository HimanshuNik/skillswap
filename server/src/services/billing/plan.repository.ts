import { db } from '../../prisma/db.js';

export interface PlanEntitlements {
  maxActiveSwaps: number;
  advancedFilters: boolean;
  priorityMatching: boolean;
  learningAnalytics: boolean;
  exportHistory: boolean;
}

export interface SubscriptionPlanRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  isActive: boolean;
  features: string[];
  entitlements: PlanEntitlements;
  createdAt: string;
  updatedAt: string;
}

function parsePlan(raw: any): SubscriptionPlanRecord {
  let features: string[] = [];
  try {
    features = typeof raw.features === 'string' ? JSON.parse(raw.features) : raw.features;
  } catch {
    features = [];
  }

  let entitlements: PlanEntitlements = {
    maxActiveSwaps: 3,
    advancedFilters: false,
    priorityMatching: false,
    learningAnalytics: false,
    exportHistory: false,
  };
  try {
    entitlements = typeof raw.entitlements === 'string' ? JSON.parse(raw.entitlements) : raw.entitlements;
  } catch {
    // default
  }

  return {
    ...raw,
    features,
    entitlements,
  };
}

export const planRepository = {
  async findAllActive(): Promise<SubscriptionPlanRecord[]> {
    const plans = await db.orm.public.SubscriptionPlan.where({ isActive: true }).all();
    return (plans as any[]).map(parsePlan);
  },


  async findByCode(code: string): Promise<SubscriptionPlanRecord | null> {
    const plan = await db.orm.public.SubscriptionPlan.where({ code }).first();
    return plan ? parsePlan(plan) : null;
  },

  async findById(id: number): Promise<SubscriptionPlanRecord | null> {
    const plan = await db.orm.public.SubscriptionPlan.where({ id }).first();
    return plan ? parsePlan(plan) : null;
  },
};
