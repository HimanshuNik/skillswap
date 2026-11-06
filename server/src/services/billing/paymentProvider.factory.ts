import type { IPaymentProvider } from './paymentProvider.interface.js';
import { stripePaymentProvider } from './stripePaymentProvider.js';
import { mockPaymentProvider } from './mockPaymentProvider.js';

export function getPaymentProvider(providerName?: string): IPaymentProvider {
  const chosen = (providerName || process.env['BILLING_PROVIDER'] || 'MOCK').toUpperCase();
  if (chosen === 'STRIPE' && process.env['STRIPE_SECRET_KEY']) {
    return stripePaymentProvider;
  }
  return mockPaymentProvider;
}

