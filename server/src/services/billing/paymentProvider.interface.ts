export interface CreateCheckoutParams {
  userId: number;
  userEmail: string;
  userName: string;
  planCode: string; // PRO, PREMIUM
  billingCycle: 'MONTHLY' | 'YEARLY';
  amountCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
}

export interface CustomerPortalParams {
  customerId: string;
  returnUrl: string;
}

export interface CustomerPortalResult {
  portalUrl: string;
}

export interface WebhookEventPayload {
  id: string;
  type: string;
  data: {
    object: Record<string, any>;
  };
}

export interface SubscriptionCancelResult {
  success: boolean;
  cancelAtPeriodEnd: boolean;
  status: string;
}

export interface SubscriptionResumeResult {
  success: boolean;
  cancelAtPeriodEnd: boolean;
  status: string;
}

export interface IPaymentProvider {
  readonly name: string;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult>;
  createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalResult>;
  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): WebhookEventPayload;
  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<SubscriptionCancelResult>;
  resumeSubscription(providerSubscriptionId: string): Promise<SubscriptionResumeResult>;
}

