import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowUpRight,
  RotateCcw,
  Receipt,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import AppLayout from '../components/app/AppLayout';
import { billingApi } from '../lib/billingApi';
import { Modal } from '../components/ui/Modal';
import { toast } from 'sonner';

export const BillingSettings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Show status toasts on redirect
  const statusParam = searchParams.get('status');
  React.useEffect(() => {
    if (statusParam === 'success') {
      toast.success('Your subscription was successfully activated! Welcome aboard.');
    } else if (statusParam === 'cancelled') {
      toast.info('Checkout was cancelled. No charges were made.');
    }
  }, [statusParam]);

  const { data: subData, isLoading: subLoading } = useQuery({
    queryKey: ['userSubscription'],
    queryFn: () => billingApi.getSubscription(),
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery({
    queryKey: ['userInvoices'],
    queryFn: () => billingApi.getInvoices(1, 20),
  });

  const cancelMutation = useMutation({
    mutationFn: () => billingApi.cancelSubscription(),
    onSuccess: (data) => {
      toast.success(data.message);
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to cancel subscription');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () => billingApi.reactivateSubscription(),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['userSubscription'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reactivate subscription');
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => billingApi.createCustomerPortal(),
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to open billing portal');
    },
  });

  const sub = subData?.subscription;
  const entitlements = subData?.entitlements;
  const planCode = entitlements?.planCode || 'FREE';
  const isPaid = planCode !== 'FREE' && sub?.status === 'ACTIVE';
  const cancelAtPeriodEnd = sub?.cancelAtPeriodEnd;
  const invoices = invoicesData?.invoices || [];

  const activeSwapsUsed = entitlements?.usage?.activeSwaps ?? 0;
  const maxActiveSwaps = entitlements?.usage?.maxActiveSwaps ?? 3;
  const swapPercentage = Math.min(100, Math.round((activeSwapsUsed / maxActiveSwaps) * 100));

  if (subLoading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-8" />
          <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-2xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Membership & Billing</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your subscription tier, track feature quotas, and view past invoices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>Browse Plans</span>
            </button>
          </div>
        </div>

        {/* Cancellation Notice Banner */}
        {cancelAtPeriodEnd && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Subscription Cancellation Scheduled
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  Your plan benefits will remain active until{' '}
                  <strong>
                    {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'the end of your cycle'}
                  </strong>
                  . Afterward, you will revert to the SkillSwap Free tier.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={reactivateMutation.isPending}
              onClick={() => reactivateMutation.mutate()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shrink-0 transition"
            >
              {reactivateMutation.isPending ? 'Resuming...' : 'Reactivate Plan'}
            </button>
          </div>
        )}

        {/* Current Plan Overview Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {entitlements?.planName || 'SkillSwap Free'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    planCode === 'PREMIUM'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : planCode === 'PRO'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {planCode}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${
                    sub?.status === 'ACTIVE'
                      ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800'
                      : sub?.status === 'PAST_DUE'
                      ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}
                >
                  {sub?.status || 'Active'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isPaid ? (
                <>
                  <button
                    type="button"
                    onClick={() => portalMutation.mutate()}
                    disabled={portalMutation.isPending}
                    className="flex-1 sm:flex-initial px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Manage Card</span>
                  </button>
                  {!cancelAtPeriodEnd && (
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      className="flex-1 sm:flex-initial px-4 py-2 border border-red-200 dark:border-red-800/60 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel Subscription
                    </button>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Upgrade to Pro</span>
                </button>
              )}
            </div>
          </div>

          {/* Subscription Metadata Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Billing Period</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {sub?.billingCycle === 'YEARLY' ? 'Annual Billing' : sub?.billingCycle === 'MONTHLY' ? 'Monthly Billing' : 'Complimentary'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Next Renewal Date</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'N/A (Free Tier)'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Payment Gateway</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {sub?.provider === 'STRIPE' ? 'Stripe Billing' : 'Sandbox Simulated Provider'}
              </p>
            </div>
          </div>
        </div>

        {/* Feature Quotas & Usage Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Feature Entitlements & Usage Quotas
          </h3>

          <div className="space-y-6">
            {/* Active Swap Proposals Quota */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Active Swap Proposals
                </span>
                <span className="font-medium text-slate-500 dark:text-slate-400">
                  {activeSwapsUsed} of {maxActiveSwaps} used ({maxActiveSwaps - activeSwapsUsed} remaining)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    swapPercentage >= 100
                      ? 'bg-red-500'
                      : swapPercentage >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${swapPercentage}%` }}
                />
              </div>
              {swapPercentage >= 100 && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                  You have reached your active proposal limit. Upgrade your membership or wait for completed sessions to send more.
                </p>
              )}
            </div>

            {/* Feature Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Advanced Filters
                  </span>
                  {entitlements?.entitlements?.advancedFilters ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                      Unlocked
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-md">
                      Pro / Premium
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Filter users by rating, proficiency level, and available time slots.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Priority Matching
                  </span>
                  {entitlements?.entitlements?.priorityMatching ? (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold rounded-md">
                      Unlocked
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-md">
                      Pro / Premium
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Highlighted placement in discovery recommendations and match cards.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Learning Analytics
                  </span>
                  {entitlements?.entitlements?.learningAnalytics ? (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-bold rounded-md">
                      Unlocked
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold rounded-md">
                      Premium Only
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Teaching performance insights, completion velocity, and rating analysis.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History & Invoices */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Payment History & Invoices</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Download receipts and view past subscription renewal transactions.
            </p>
          </div>

          {invoicesLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading invoice records...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center">
              <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No billing invoices found. Your subscription history will appear here once you upgrade.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">Invoice #</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold">${(inv.amountPaidCents / 100).toFixed(2)} USD</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" />
                          <span>{inv.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.hostedInvoiceUrl || inv.invoicePdfUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl || inv.invoicePdfUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                          >
                            <span>View</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">INV-{inv.id}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to cancel your <strong>{entitlements?.planName}</strong> subscription?
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <p>• You will retain full access to all plan perks until the end of your billing cycle.</p>
            <p>• Your account will automatically revert to the Free tier after that date.</p>
            <p>• All your chat history, sessions, and verified reviews will remain completely safe.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Keep Membership
            </button>
            <button
              type="button"
              disabled={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition"
            >
              {cancelMutation.isPending ? 'Canceling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

export default BillingSettings;
