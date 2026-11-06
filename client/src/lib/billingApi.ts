import { apiFetch } from './api';

export interface PlanEntitlements {
  maxActiveSwaps: number;
  advancedFilters: boolean;
  priorityMatching: boolean;
  learningAnalytics: boolean;
  exportHistory: boolean;
}

export interface SubscriptionPlan {
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
}

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

export interface AdminSubscriptionRecord extends UserSubscriptionDetails {
  user?: {
    id: number;
    email: string;
    name: string;
    username: string;
  };
}

export interface UserSubscriptionResponse {
  subscription: UserSubscriptionDetails | null;
  entitlements: {
    planCode: string;
    planName: string;
    status: string;
    entitlements: PlanEntitlements;
    usage: {
      activeSwaps: number;
      maxActiveSwaps: number;
    };
  };
}

export interface BillingInvoice {
  id: number;
  userId: number;
  subscriptionId: number | null;
  providerInvoiceId: string | null;
  invoiceNumber: string;
  amountPaidCents: number;
  currency: string;
  status: string; // PAID, OPEN, VOID, UNCOLLECTIBLE
  invoicePdfUrl: string | null;
  hostedInvoiceUrl: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface PaymentTransaction {
  id: number;
  userId: number;
  subscriptionId: number | null;
  providerPaymentId: string | null;
  providerInvoiceId: string | null;
  amountCents: number;
  currency: string;
  status: string;
  paymentMethod: string | null;
  errorMessage: string | null;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AdminBillingOverview {
  mrrCents: number;
  arrCents: number;
  totalRevenueCents: number;
  activeSubscribers: number;
  totalUsers: number;
  conversionRate: number;
  failedPaymentRate: number;
  tiers: {
    free: number;
    pro: number;
    premium: number;
  };
  subscriptionStatuses: {
    active: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    free: number;
    total: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const billingApi = {
  async getPlans(): Promise<{ plans: SubscriptionPlan[] }> {
    const res = await apiFetch<ApiResponse<{ plans: SubscriptionPlan[] }>>('/api/billing/plans');
    return res.data;
  },

  async getSubscription(): Promise<UserSubscriptionResponse> {
    const res = await apiFetch<ApiResponse<UserSubscriptionResponse>>('/api/billing/subscription');
    return res.data;
  },

  async createCheckout(params: {
    planCode: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ sessionId: string; checkoutUrl: string; provider: string }> {
    const res = await apiFetch<ApiResponse<{ sessionId: string; checkoutUrl: string; provider: string }>>(
      '/api/billing/checkout',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
    return res.data;
  },

  async cancelSubscription(): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch<ApiResponse<{ success: boolean; message: string }>>('/api/billing/cancel', {
      method: 'POST',
    });
    return res.data;
  },

  async reactivateSubscription(): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch<ApiResponse<{ success: boolean; message: string }>>('/api/billing/reactivate', {
      method: 'POST',
    });
    return res.data;
  },

  async getInvoices(page = 1, limit = 20): Promise<{ invoices: BillingInvoice[]; total: number; totalPages: number }> {
    const res = await apiFetch<ApiResponse<BillingInvoice[]>>(`/api/billing/invoices?page=${page}&limit=${limit}`);
    return {
      invoices: res.data,
      total: res.pagination?.total || res.data.length,
      totalPages: res.pagination?.totalPages || 1,
    };
  },

  async createCustomerPortal(): Promise<{ portalUrl: string }> {
    const res = await apiFetch<ApiResponse<{ portalUrl: string }>>('/api/billing/portal', {
      method: 'POST',
    });
    return res.data;
  },

  async getAdminBillingOverview(): Promise<AdminBillingOverview> {
    const res = await apiFetch<ApiResponse<AdminBillingOverview>>('/api/admin/billing/overview');
    return res.data;
  },

  async getAdminSubscriptions(page = 1, limit = 20, status?: string, planCode?: string) {
    let url = `/api/admin/billing/subscriptions?page=${page}&limit=${limit}`;
    if (status && status !== 'ALL') url += `&status=${status}`;
    if (planCode && planCode !== 'ALL') url += `&planCode=${planCode}`;
    const res = await apiFetch<ApiResponse<AdminSubscriptionRecord[]>>(url);
    return {
      subscriptions: res.data,
      total: res.pagination?.total || 0,
      totalPages: res.pagination?.totalPages || 1,
    };
  },

  async getAdminTransactions(page = 1, limit = 20) {
    const res = await apiFetch<ApiResponse<PaymentTransaction[]>>(`/api/admin/billing/transactions?page=${page}&limit=${limit}`);
    return {
      transactions: res.data,
      total: res.pagination?.total || 0,
      totalPages: res.pagination?.totalPages || 1,
    };
  },
};
