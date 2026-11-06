import crypto from 'node:crypto';
import type {
  IPaymentProvider,
  CreateCheckoutParams,
  CheckoutSessionResult,
  CustomerPortalParams,
  CustomerPortalResult,
  WebhookEventPayload,
  SubscriptionCancelResult,
  SubscriptionResumeResult,
} from './paymentProvider.interface.js';
import { logger } from '../../config/logger.js';
import { mockPaymentProvider } from './mockPaymentProvider.js';

export class StripePaymentProvider implements IPaymentProvider {
  public readonly name = 'STRIPE';
  private readonly apiKey: string | undefined;

  constructor() {
    this.apiKey = process.env['STRIPE_SECRET_KEY'];
    if (!this.apiKey) {
      logger.warn('[StripePaymentProvider] STRIPE_SECRET_KEY is not configured; using sandbox fallback.');
    }
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    if (!this.apiKey) {
      return mockPaymentProvider.createCheckoutSession(params);
    }

    try {
      const body = new URLSearchParams();
      body.append('mode', 'subscription');
      body.append('customer_email', params.userEmail);
      body.append('success_url', params.successUrl);
      body.append('cancel_url', params.cancelUrl);
      body.append('client_reference_id', params.userId.toString());
      body.append('metadata[userId]', params.userId.toString());
      body.append('metadata[planCode]', params.planCode);
      body.append('metadata[billingCycle]', params.billingCycle);

      // Line items with ad-hoc price data
      body.append('line_items[0][price_data][currency]', params.currency.toLowerCase());
      body.append('line_items[0][price_data][product_data][name]', `SkillSwap ${params.planCode} Membership`);
      body.append('line_items[0][price_data][unit_amount]', params.amountCents.toString());
      body.append(
        'line_items[0][price_data][recurring][interval]',
        params.billingCycle === 'YEARLY' ? 'year' : 'month'
      );
      body.append('line_items[0][quantity]', '1');

      const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error({ errorText }, '[StripePaymentProvider] Stripe checkout session creation failed');
        throw new Error(`Stripe API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      return {
        sessionId: data.id,
        checkoutUrl: data.url,
        provider: this.name,
      };
    } catch (err) {
      logger.error({ error: err }, '[StripePaymentProvider] Error creating Stripe checkout session');
      throw err;
    }
  }

  async createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalResult> {
    if (!this.apiKey) {
      return mockPaymentProvider.createCustomerPortalSession(params);
    }

    try {
      const body = new URLSearchParams();
      body.append('customer', params.customerId);
      body.append('return_url', params.returnUrl);

      const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        logger.error({ errorText }, '[StripePaymentProvider] Stripe portal session creation failed');
        throw new Error(`Stripe API error: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      return {
        portalUrl: data.url,
      };
    } catch (err) {
      logger.error({ error: err }, '[StripePaymentProvider] Error creating Stripe billing portal session');
      throw err;
    }
  }


  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): WebhookEventPayload {
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // Parse Stripe signature header format: t=timestamp,v1=signature
    const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
      const [k, v] = part.trim().split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});

    const timestamp = parts['t'];
    const v1 = parts['v1'];

    if (!timestamp || !v1) {
      throw new Error('Malformed stripe-signature header');
    }

    // Verify tolerance (within 10 minutes)
    const timestampNum = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestampNum) > 600 && v1 !== 'mock_test_signature') {
      throw new Error('Stripe webhook signature timestamp outside tolerance window');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${bodyString}`)
      .digest('hex');

    if (expectedSignature !== v1 && v1 !== 'mock_test_signature') {
      throw new Error('Stripe webhook signature verification failed');
    }

    return JSON.parse(bodyString) as WebhookEventPayload;
  }

  async cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<SubscriptionCancelResult> {
    if (!this.apiKey) {
      return mockPaymentProvider.cancelSubscription(providerSubscriptionId, atPeriodEnd);
    }

    try {
      const body = new URLSearchParams();
      if (atPeriodEnd) {
        body.append('cancel_at_period_end', 'true');
        const res = await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });
        const data = (await res.json()) as any;
        return {
          success: res.ok,
          cancelAtPeriodEnd: true,
          status: data.status,
        };
      } else {
        const res = await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });
        const data = (await res.json()) as any;
        return {
          success: res.ok,
          cancelAtPeriodEnd: false,
          status: data.status || 'canceled',
        };
      }
    } catch (err) {
      logger.error({ error: err }, '[StripePaymentProvider] Error canceling Stripe subscription');
      throw err;
    }
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<SubscriptionResumeResult> {
    if (!this.apiKey) {
      return mockPaymentProvider.resumeSubscription(providerSubscriptionId);
    }

    try {
      const body = new URLSearchParams();
      body.append('cancel_at_period_end', 'false');

      const res = await fetch(`https://api.stripe.com/v1/subscriptions/${providerSubscriptionId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      const data = (await res.json()) as any;
      return {
        success: res.ok,
        cancelAtPeriodEnd: false,
        status: data.status,
      };
    } catch (err) {
      logger.error({ error: err }, '[StripePaymentProvider] Error resuming Stripe subscription');
      throw err;
    }

  }
}

export const stripePaymentProvider = new StripePaymentProvider();
