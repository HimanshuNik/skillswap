import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
} from 'lucide-react';
import {
  billingApi,
  type AdminSubscriptionRecord,
  type PaymentTransaction,
} from '../../lib/billingApi';

export const AdminSubscriptions: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'TRANSACTIONS'>('SUBSCRIPTIONS');

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['adminBillingOverview'],
    queryFn: () => billingApi.getAdminBillingOverview(),
  });

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['adminSubscriptions', page, statusFilter, planFilter],
    queryFn: () => billingApi.getAdminSubscriptions(page, 20, statusFilter, planFilter),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['adminTransactions', page],
    queryFn: () => billingApi.getAdminTransactions(page, 20),
  });

  const mrr = overview?.mrrCents ? (overview.mrrCents / 100).toFixed(2) : '0.00';
  const arr = overview?.arrCents ? (overview.arrCents / 100).toFixed(2) : '0.00';
  const totalRev = overview?.totalRevenueCents ? (overview.totalRevenueCents / 100).toFixed(2) : '0.00';

  if (overviewLoading) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-8 w-64 bg-slate-800 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscriptions & Revenue Analytics</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Real-time PostgreSQL financial metrics, MRR/ARR velocity, subscriber health, and payment ledgers.
        </p>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">${mrr}</div>
          <p className="text-[11px] text-slate-400 mt-1">Estimated MRR from active subscriptions</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Annual Run Rate (ARR)</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">${arr}</div>
          <p className="text-[11px] text-slate-400 mt-1">Annualized recurring run-rate</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Active Paid Subscribers</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">
            {overview?.activeSubscribers ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
            {overview?.conversionRate ?? 0}% paid subscriber conversion
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Total Cash Collected</span>
            <CreditCard className="w-4 h-4 text-teal-500" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">${totalRev}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Failed payment rate: {overview?.failedPaymentRate ?? 0}%
          </p>
        </div>
      </div>

      {/* Tier Distribution Visual Bar */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Membership Tier Distribution</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <span className="text-xs text-slate-500">Free Members</span>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {overview?.tiers?.free ?? 0}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-center">
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">Pro Members ($15/mo)</span>
            <p className="text-xl font-bold text-emerald-800 dark:text-emerald-200 mt-0.5">
              {overview?.tiers?.pro ?? 0}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800/60 text-center">
            <span className="text-xs text-indigo-700 dark:text-indigo-300 font-semibold">Premium Members ($29/mo)</span>
            <p className="text-xl font-bold text-indigo-800 dark:text-indigo-200 mt-0.5">
              {overview?.tiers?.premium ?? 0}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => {
            setActiveTab('SUBSCRIPTIONS');
            setPage(1);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 -mb-[2px] ${
            activeTab === 'SUBSCRIPTIONS'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          User Subscriptions ({subsData?.total ?? 0})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('TRANSACTIONS');
            setPage(1);
          }}
          className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 -mb-[2px] ${
            activeTab === 'TRANSACTIONS'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Payment Transactions ({txData?.total ?? 0})
        </button>
      </div>

      {/* Active Tab: Subscriptions Table */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="CANCELED">Canceled</option>
                <option value="FREE">Free</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-semibold">Plan:</span>
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 font-medium"
              >
                <option value="ALL">All Plans</option>
                <option value="PRO">Pro</option>
                <option value="PREMIUM">Premium</option>
                <option value="FREE">Free</option>
              </select>
            </div>
          </div>

          {subsLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading subscriptions...</div>
          ) : (subsData?.subscriptions?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No subscriptions match the selected criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="py-3 px-4 font-semibold">Subscriber</th>
                    <th className="py-3 px-4 font-semibold">Plan</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Cycle</th>
                    <th className="py-3 px-4 font-semibold">Current Period End</th>
                    <th className="py-3 px-4 font-semibold">Provider</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {subsData?.subscriptions.map((s: AdminSubscriptionRecord) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900 dark:text-white">{s.user?.name || 'User'}</p>
                        <p className="text-[11px] text-slate-400">{s.user?.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.planCode === 'PREMIUM'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              : s.planCode === 'PRO'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {s.planCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            s.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                              : s.status === 'PAST_DUE'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {s.status}
                          {s.cancelAtPeriodEnd && ' (Canceling)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{s.billingCycle}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{s.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Tab: Payment Transactions Ledger */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {txLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading transaction history...</div>
          ) : (txData?.transactions?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No payment transactions recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="py-3 px-4 font-semibold">Date</th>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Amount</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {txData?.transactions.map((tx: PaymentTransaction) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {tx.user?.name || `User #${tx.userId}`}
                      </td>
                      <td className="py-3 px-4 font-semibold">${(tx.amountCents / 100).toFixed(2)} {tx.currency}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'SUCCEEDED'
                              ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                              : tx.status === 'FAILED'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {tx.providerPaymentId || `tx_${tx.id}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptions;
