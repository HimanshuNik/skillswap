import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { Check, Sparkles, Shield, Zap, ArrowRight, HelpCircle } from 'lucide-react';
import { billingApi, type SubscriptionPlan } from '../lib/billingApi';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'sonner';

export const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');

  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['billingPlans'],
    queryFn: () => billingApi.getPlans(),
  });

  const { data: subData } = useQuery({
    queryKey: ['userSubscription'],
    queryFn: () => billingApi.getSubscription(),
    enabled: !!user,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (planCode: string) => {
      return billingApi.createCheckout({
        planCode,
        billingCycle,
        successUrl: `${window.location.origin}/settings/billing?status=success`,
        cancelUrl: `${window.location.origin}/pricing?status=cancelled`,
      });
    },
    onSuccess: (data) => {
      toast.success('Redirecting to secure checkout...');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to initiate checkout session');
    },
  });

  const currentPlanCode = subData?.entitlements?.planCode || 'FREE';
  const plans = plansData?.plans || [];

  const handlePlanAction = (plan: SubscriptionPlan) => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }

    if (plan.code === 'FREE') {
      navigate('/dashboard');
      return;
    }

    if (currentPlanCode === plan.code) {
      navigate('/settings/billing');
      return;
    }

    checkoutMutation.mutate(plan.code);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="max-w-4xl mx-auto text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Flexible SaaS Memberships</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Supercharge Your Skill Exchange
        </h1>
        <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          SkillSwap is always free for peer learning. Upgrade to Pro or Premium for expanded swap capacity, advanced matching insights, and priority visibility.
        </p>

        {/* Sandbox Notice Banner */}
        <div className="mt-4 inline-block bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
          <strong>Sandbox Preview:</strong> Payment integration is configured in safe developer test mode. No actual credit cards are charged.
        </div>

        {/* Billing Cycle Selector */}
        <div className="mt-8 inline-flex items-center p-1 bg-slate-200/80 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              billingCycle === 'YEARLY'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
        {plansLoading ? (
          <div className="col-span-3 text-center py-12 text-slate-500">Loading membership tiers...</div>
        ) : (
          plans.map((plan) => {
            const isCurrent = currentPlanCode === plan.code;
            const isPro = plan.code === 'PRO';
            const isPremium = plan.code === 'PREMIUM';

            const price =
              plan.code === 'FREE'
                ? '$0'
                : billingCycle === 'YEARLY'
                ? `$${(plan.yearlyPriceCents / 100 / 12).toFixed(0)}`
                : `$${(plan.monthlyPriceCents / 100).toFixed(0)}`;

            const cycleLabel = plan.code === 'FREE' ? '/ forever' : '/ month';

            return (
              <div
                key={plan.code}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                  isPro
                    ? 'border-emerald-500 dark:border-emerald-400 shadow-xl shadow-emerald-500/10 bg-white dark:bg-slate-800'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 shadow-sm'
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
                    Most Popular
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-600">
                    Active Plan
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 min-h-[32px]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{price}</span>
                  <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {cycleLabel}
                  </span>
                </div>

                {billingCycle === 'YEARLY' && plan.code !== 'FREE' && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium -mt-4 mb-4">
                    Billed annually (${(plan.yearlyPriceCents / 100).toFixed(0)}/yr)
                  </p>
                )}

                {/* Features list */}
                <div className="flex-1 border-t border-slate-100 dark:border-slate-700/60 pt-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    What's included
                  </p>
                  <ul className="space-y-2.5">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start text-xs text-slate-700 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mr-2 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action CTA */}
                <div className="mt-8 pt-4">
                  <button
                    type="button"
                    disabled={isCurrent || checkoutMutation.isPending}
                    onClick={() => handlePlanAction(plan)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                      isCurrent
                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        : isPro
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]'
                        : isPremium
                        ? 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white shadow-sm'
                        : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span>
                      {isCurrent
                        ? 'Current Plan'
                        : plan.code === 'FREE'
                        ? 'Use Free Tier'
                        : `Upgrade to ${plan.code === 'PRO' ? 'Pro' : 'Premium'}`}
                    </span>
                    {!isCurrent && <ArrowRight className="w-4 h-4 ml-0.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Feature Comparison Matrix */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-16">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plan Comparison Matrix</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Detailed breakdown of limits and capabilities across all membership tiers.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700">
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">Feature</th>
                <th className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-center">Free</th>
                <th className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 text-center">Pro</th>
                <th className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400 text-center">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <td className="py-3.5 px-4 font-medium">Active Swap Proposals</td>
                <td className="py-3.5 px-4 text-center">Up to 3</td>
                <td className="py-3.5 px-4 text-center font-semibold text-emerald-600 dark:text-emerald-400">Up to 10</td>
                <td className="py-3.5 px-4 text-center font-semibold text-indigo-600 dark:text-indigo-400">Up to 50</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Reciprocal Skill Matching</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Real-Time Messaging & Presence</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Integrated Video Sessions (Jitsi)</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Advanced Discovery & Rating Filters</td>
                <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Priority Placement in Match Engine</td>
                <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Learning & Teaching Performance Analytics</td>
                <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center text-slate-400">—</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-medium">Community Safety & Abuse Reporting</td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
                <td className="py-3.5 px-4 text-center"><Check className="w-4 h-4 text-emerald-500 mx-auto" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white text-center mb-8">
          Frequently Asked Questions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Can I exchange skills without paying?</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Yes, absolutely. SkillSwap's core mission is peer skill trading. The Free plan allows up to 3 simultaneous active proposals, full chat, video meetings, and reviews forever.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Are safety and moderation features paywalled?</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Never. Abuse reporting, user verification, moderation queues, and account security features are 100% accessible to every single user on every tier.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>What happens if I cancel my subscription?</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You retain full access to your paid benefits until the end of your billing cycle. After that, you seamlessly revert to the Free tier. All existing conversations, sessions, and reviews remain preserved.
            </p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>How do I download tax invoices and receipts?</span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              You can view, search, and download your entire invoice history directly from your Billing Dashboard in Settings anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
