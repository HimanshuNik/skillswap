import { subscriptionRepository } from './subscription.repository.js';
import { planRepository, type PlanEntitlements } from './plan.repository.js';
import { userUsageRepository } from './userUsage.repository.js';

export interface UserEntitlementSummary {
  planCode: string;
  planName: string;
  status: string;
  entitlements: PlanEntitlements;
  usage: {
    activeSwaps: number;
    maxActiveSwaps: number;
  };
}

export const entitlementService = {
  async getUserPlan(userId: number): Promise<{
    planCode: string;
    planName: string;
    status: string;
    entitlements: PlanEntitlements;
  }> {
    const sub = await subscriptionRepository.findByUserId(userId);

    // If active or trialing, grant subscription entitlements
    if (sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
      const plan = await planRepository.findById(sub.planId);
      if (plan) {
        return {
          planCode: plan.code,
          planName: plan.name,
          status: sub.status,
          entitlements: plan.entitlements,
        };
      }
    }

    // Default to FREE plan
    const freePlan = await planRepository.findByCode('FREE');
    return {
      planCode: 'FREE',
      planName: freePlan?.name || 'SkillSwap Free',
      status: 'FREE',
      entitlements: freePlan?.entitlements || {
        maxActiveSwaps: 3,
        advancedFilters: false,
        priorityMatching: false,
        learningAnalytics: false,
        exportHistory: false,
      },
    };
  },

  async canCreateSwapRequest(userId: number): Promise<{
    allowed: boolean;
    current: number;
    max: number;
    planCode: string;
    reason?: string;
  }> {
    const planInfo = await this.getUserPlan(userId);
    const activeCount = await userUsageRepository.getActiveSwapCount(userId);
    const max = planInfo.entitlements.maxActiveSwaps;

    if (activeCount >= max) {
      return {
        allowed: false,
        current: activeCount,
        max,
        planCode: planInfo.planCode,
        reason: `You have reached your limit of ${max} active swap requests on the ${planInfo.planName}. Please upgrade your membership to send more swap requests.`,
      };
    }

    return {
      allowed: true,
      current: activeCount,
      max,
      planCode: planInfo.planCode,
    };
  },

  async canUseAdvancedFilters(userId: number): Promise<boolean> {
    const planInfo = await this.getUserPlan(userId);
    return planInfo.entitlements.advancedFilters;
  },

  async canAccessLearningAnalytics(userId: number): Promise<boolean> {
    const planInfo = await this.getUserPlan(userId);
    return planInfo.entitlements.learningAnalytics;
  },

  async getUserEntitlementSummary(userId: number): Promise<UserEntitlementSummary> {
    const planInfo = await this.getUserPlan(userId);
    const activeSwaps = await userUsageRepository.getActiveSwapCount(userId);
    return {
      planCode: planInfo.planCode,
      planName: planInfo.planName,
      status: planInfo.status,
      entitlements: planInfo.entitlements,
      usage: {
        activeSwaps,
        maxActiveSwaps: planInfo.entitlements.maxActiveSwaps,
      },
    };
  },
};

