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

export class MockPaymentProvider implements IPaymentProvider {
  public readonly name = 'MOCK';

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const sessionId = `cs_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const url = `${params.successUrl}?session_id=${sessionId}&provider=mock`;
    return {
      sessionId,
      checkoutUrl: url,
      provider: this.name,
    };
  }

  async createCustomerPortalSession(params: CustomerPortalParams): Promise<CustomerPortalResult> {
    return {
      portalUrl: `${params.returnUrl}?portal_session=cps_mock_${Date.now()}`,
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signature: string, secret: string): WebhookEventPayload {
    if (!signature) {
      throw new Error('Missing webhook signature header');
    }

    const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // If signature uses Stripe-style format: t=123456,v1=hash
    if (signature.includes('v1=')) {
      const parts = signature.split(',').reduce<Record<string, string>>((acc, part) => {
        const [k, v] = part.trim().split('=');
        if (k && v) acc[k] = v;
        return acc;
      }, {});

      const timestamp = parts['t'];
      const v1 = parts['v1'];

      if (!timestamp || !v1) {
        throw new Error('Malformed webhook signature');
      }

      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}.${bodyString}`)
        .digest('hex');

      if (expected !== v1 && v1 !== 'mock_test_signature') {
        throw new Error('Invalid webhook signature verification');
      }
    } else {
      // Direct HMAC signature
      const expected = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
      if (signature !== expected && signature !== 'mock_test_signature') {
        throw new Error('Invalid webhook signature verification');
      }
    }

    return JSON.parse(bodyString) as WebhookEventPayload;
  }

  async cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<SubscriptionCancelResult> {
    return {
      success: true,
      cancelAtPeriodEnd: atPeriodEnd,
      status: atPeriodEnd ? 'ACTIVE' : 'CANCELED',
    };
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<SubscriptionResumeResult> {
    return {
      success: true,
      cancelAtPeriodEnd: false,
      status: 'ACTIVE',
    };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();

