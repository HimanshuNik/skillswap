import { db } from './db.js';
import { logger } from '../config/logger.js';

export const INITIAL_PLANS = [
  {
    code: 'FREE',
    name: 'SkillSwap Free',
    description: 'Essential peer-to-peer skill exchange for lifelong learners',
    monthlyPriceCents: 0,
    yearlyPriceCents: 0,
    currency: 'USD',
    isActive: true,
    features: JSON.stringify([
      'Up to 3 active skill swap proposals',
      'Full community discovery & keyword search',
      'Deterministic reciprocal skill matching',
      'Real-time 1-on-1 messaging & presence',
      'Integrated Jitsi Meet video sessions',
      'Verified peer reviews & ratings',
    ]),
    entitlements: JSON.stringify({
      maxActiveSwaps: 3,
      advancedFilters: false,
      priorityMatching: false,
      learningAnalytics: false,
      exportHistory: false,
    }),
  },
  {
    code: 'PRO',
    name: 'SkillSwap Pro',
    description: 'For active skill traders who want expanded swaps and advanced discovery',
    monthlyPriceCents: 1500, // $15.00/mo (dev/sandbox preview)
    yearlyPriceCents: 14400, // $144.00/yr ($12.00/mo)
    currency: 'USD',
    isActive: true,
    features: JSON.stringify([
      'Up to 10 active skill swap proposals',
      'Advanced discovery filters (rating, level, availability)',
      'Reciprocal matching insights & score breakdown',
      'Pro Member badge on public profile',
      'Priority placement in match recommendations',
      'Unlimited session history & message archives',
    ]),
    entitlements: JSON.stringify({
      maxActiveSwaps: 10,
      advancedFilters: true,
      priorityMatching: true,
      learningAnalytics: false,
      exportHistory: true,
    }),
  },
  {
    code: 'PREMIUM',
    name: 'SkillSwap Premium',
    description: 'For power mentors and serious learners needing maximum capacity and analytics',
    monthlyPriceCents: 2900, // $29.00/mo (dev/sandbox preview)
    yearlyPriceCents: 28800, // $288.00/yr ($24.00/mo)
    currency: 'USD',
    isActive: true,
    features: JSON.stringify([
      'Up to 50 active skill swap proposals',
      'Advanced learning & teaching performance analytics',
      'Priority matching placement in user search',
      'Dedicated Premium Gold badge',
      'Early access to new platform features',
      'Priority dispute resolution',
    ]),
    entitlements: JSON.stringify({
      maxActiveSwaps: 50,
      advancedFilters: true,
      priorityMatching: true,
      learningAnalytics: true,
      exportHistory: true,
    }),
  },
];

export async function seedPlans() {
  logger.info('Starting subscription plans verification/seeding...');
  let added = 0;
  let updated = 0;

  for (const plan of INITIAL_PLANS) {
    const existing = await db.orm.public.SubscriptionPlan.where({ code: plan.code }).first();
    if (!existing) {
      await db.orm.public.SubscriptionPlan.create({
        code: plan.code,
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        currency: plan.currency,
        isActive: plan.isActive,
        features: plan.features,
        entitlements: plan.entitlements,
      });
      added++;
    } else {
      await db.orm.public.SubscriptionPlan.where({ code: plan.code }).update({
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        features: plan.features,
        entitlements: plan.entitlements,
      });
      updated++;
    }
  }

  logger.info(`Subscription plans seeding complete: ${added} added, ${updated} verified/updated.`);
}

if (process.argv[1]?.endsWith('seedPlans.ts') || process.argv[1]?.endsWith('seedPlans.js')) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error({ error: err }, 'Error seeding plans');
      process.exit(1);
    });
}

