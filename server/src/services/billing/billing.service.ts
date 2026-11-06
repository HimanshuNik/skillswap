import { planRepository, type SubscriptionPlanRecord } from './plan.repository.js';
import { subscriptionRepository, type UserSubscriptionDetails } from './subscription.repository.js';
import { paymentTransactionRepository } from './paymentTransaction.repository.js';
import { billingInvoiceRepository, type BillingInvoiceRecord } from './billingInvoice.repository.js';
import { billingWebhookRepository } from './billingWebhook.repository.js';
import { entitlementService, type UserEntitlementSummary } from './entitlement.service.js';
import { getPaymentProvider } from './paymentProvider.factory.js';
import { userRepository } from '../../repositories/user.repository.js';
import { emailService } from '../email.service.js';
import { notificationService } from '../notification.service.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';
import { db } from '../../prisma/db.js';

export interface CheckoutResult {
  sessionId: string;
  checkoutUrl: string;
  provider: string;
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

export class BillingService {
  async getPlans(): Promise<SubscriptionPlanRecord[]> {
    return planRepository.findAllActive();
  }

  async getUserSubscription(userId: number): Promise<{
    subscription: UserSubscriptionDetails | null;
    entitlements: UserEntitlementSummary;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const subscription = await subscriptionRepository.findByUserId(userId);
    const entitlements = await entitlementService.getUserEntitlementSummary(userId);

    return {
      subscription,
      entitlements,
    };
  }

  async createCheckoutSession(params: {
    userId: number;
    planCode: string;
    billingCycle: 'MONTHLY' | 'YEARLY';
    successUrl: string;
    cancelUrl: string;
  }): Promise<CheckoutResult> {
    const user = await userRepository.findById(params.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const planCode = params.planCode.toUpperCase();
    if (planCode === 'FREE') {
      throw new BadRequestError('The Free plan does not require a checkout session');
    }

    const plan = await planRepository.findByCode(planCode);
    if (!plan || !plan.isActive) {
      throw new BadRequestError(`Plan ${params.planCode} is not available`);
    }

    if (params.billingCycle !== 'MONTHLY' && params.billingCycle !== 'YEARLY') {
      throw new BadRequestError('Invalid billing cycle. Must be MONTHLY or YEARLY.');
    }

    // Check if user is already actively subscribed to this exact plan & cycle
    const currentSub = await subscriptionRepository.findByUserId(params.userId);
    if (
      currentSub &&
      currentSub.status === 'ACTIVE' &&
      currentSub.planCode === planCode &&
      currentSub.billingCycle === params.billingCycle &&
      !currentSub.cancelAtPeriodEnd
    ) {
      throw new BadRequestError(`You already have an active ${plan.name} subscription`);
    }

    const amountCents =
      params.billingCycle === 'YEARLY' ? plan.yearlyPriceCents : plan.monthlyPriceCents;

    const provider = getPaymentProvider();
    const result = await provider.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      planCode: plan.code,
      billingCycle: params.billingCycle,
      amountCents,
      currency: plan.currency,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    return result;
  }

  async handleWebhook(
    rawBody: string | Buffer,
    signature: string,
    secret?: string
  ): Promise<{ received: boolean; processed: boolean; eventType?: string; duplicate?: boolean }> {
    const provider = getPaymentProvider();
    const webhookSecret = secret || process.env['STRIPE_WEBHOOK_SECRET'] || 'mock_webhook_secret';

    let event: any;
    try {
      event = provider.verifyWebhookSignature(rawBody, signature, webhookSecret);
    } catch (err: any) {
      logger.warn({ error: err.message }, '[BillingService] Webhook signature verification failed');
      throw new BadRequestError(`Webhook verification failed: ${err.message}`);
    }


    const eventId = event.id || `evt_${Date.now()}`;
    const eventType = event.type;
    const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    // 1. Idempotency Check
    const { isDuplicate } = await billingWebhookRepository.recordEvent({
      eventId,
      eventType,
      provider: provider.name,
      payload: bodyStr,
    });

    if (isDuplicate) {
      const wasProcessed = await billingWebhookRepository.isEventProcessed(eventId);
      logger.info(`[BillingService] Duplicate webhook event received: ${eventId} (already processed: ${wasProcessed})`);
      return { received: true, processed: wasProcessed, duplicate: true, eventType };
    }


    try {
      // 2. Dispatch event type
      switch (eventType) {
        case 'checkout.session.completed': {
          const session = event.data.object;
          const userId = parseInt(session.metadata?.userId || session.client_reference_id, 10);
          const planCode = (session.metadata?.planCode || 'PRO').toUpperCase();
          const billingCycle = (session.metadata?.billingCycle || 'MONTHLY').toUpperCase();
          const providerCustomerId = session.customer || session.customer_id || null;
          const providerSubscriptionId = session.subscription || session.id || null;
          const amountTotal = session.amount_total || (planCode === 'PREMIUM' ? 2900 : 1500);

          if (userId && !isNaN(userId)) {
            const plan = await planRepository.findByCode(planCode);
            if (plan) {
              const now = new Date();
              const periodEnd = new Date(now);
              if (billingCycle === 'YEARLY') {
                periodEnd.setFullYear(now.getFullYear() + 1);
              } else {
                periodEnd.setMonth(now.getMonth() + 1);
              }

              const sub = await subscriptionRepository.upsertSubscription({
                userId,
                planId: plan.id,
                planCode: plan.code,
                status: 'ACTIVE',
                billingCycle,
                provider: provider.name,
                providerCustomerId,
                providerSubscriptionId,
                currentPeriodStart: now.toISOString(),
                currentPeriodEnd: periodEnd.toISOString(),
                cancelAtPeriodEnd: false,
              });

              // Record Payment Transaction
              await paymentTransactionRepository.create({
                userId,
                subscriptionId: sub.id,
                providerPaymentId: session.payment_intent || session.id,
                providerInvoiceId: session.invoice || null,
                amountCents: amountTotal,
                currency: plan.currency,
                status: 'SUCCEEDED',
                paymentMethod: 'card',
              });

              // Generate Invoice record
              const invoiceNum = `INV-${Date.now().toString().slice(-6)}-${userId}`;
              await billingInvoiceRepository.create({
                userId,
                subscriptionId: sub.id,
                providerInvoiceId: session.invoice || null,
                invoiceNumber: invoiceNum,
                amountPaidCents: amountTotal,
                currency: plan.currency,
                status: 'PAID',
                periodStart: now.toISOString(),
                periodEnd: periodEnd.toISOString(),
                paidAt: now.toISOString(),
              });

              // Transactional Email
              const user = await userRepository.findById(userId);
              if (user) {
                await emailService.enqueue({
                  to: user.email,
                  toName: user.name,
                  userId: user.id,
                  template: 'SUBSCRIPTION_ACTIVATED',
                  subject: `Welcome to ${plan.name}! 🚀`,
                  payload: {
                    name: user.name,
                    planName: plan.name,
                    billingCycle: billingCycle === 'YEARLY' ? 'Annual' : 'Monthly',
                    amountFormatted: `$${(amountTotal / 100).toFixed(2)}`,
                  },
                });

                // In-App Notification
                await notificationService.createNotification({
                  userId,
                  type: 'SYSTEM',
                  title: 'Subscription Activated! 🎉',
                  message: `Your account is now upgraded to ${plan.name}. Enjoy expanded swap capacity!`,
                  link: '/settings/billing',
                });

              }
            }
          }
          break;
        }

        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const invoiceObj = event.data.object;
          const providerSubId = invoiceObj.subscription;
          const providerCustId = invoiceObj.customer;
          const amountPaid = invoiceObj.amount_paid || 1500;

          let sub = providerSubId
            ? await subscriptionRepository.findByProviderSubscriptionId(providerSubId)
            : null;

          if (sub) {
            const now = new Date();
            const nextPeriod = new Date(now);
            if (sub.billingCycle === 'YEARLY') {
              nextPeriod.setFullYear(now.getFullYear() + 1);
            } else {
              nextPeriod.setMonth(now.getMonth() + 1);
            }

            await subscriptionRepository.updateStatus(sub.userId, 'ACTIVE', {
              currentPeriodEnd: nextPeriod.toISOString(),
              cancelAtPeriodEnd: false,
            });

            await paymentTransactionRepository.create({
              userId: sub.userId,
              subscriptionId: sub.id,
              providerPaymentId: invoiceObj.payment_intent || invoiceObj.id,
              providerInvoiceId: invoiceObj.id || null,
              amountCents: amountPaid,
              status: 'SUCCEEDED',
            });

            const invNum = `INV-${Date.now().toString().slice(-6)}-${sub.userId}`;
            await billingInvoiceRepository.create({
              userId: sub.userId,
              subscriptionId: sub.id,
              providerInvoiceId: invoiceObj.id || null,
              invoiceNumber: invNum,
              amountPaidCents: amountPaid,
              periodStart: now.toISOString(),
              periodEnd: nextPeriod.toISOString(),
              paidAt: now.toISOString(),
              hostedInvoiceUrl: invoiceObj.hosted_invoice_url || null,
              invoicePdfUrl: invoiceObj.invoice_pdf || null,
            });

            const user = await userRepository.findById(sub.userId);
            if (user) {
              await emailService.enqueue({
                to: user.email,
                toName: user.name,
                userId: user.id,
                template: 'SUBSCRIPTION_RENEWED',
                subject: `SkillSwap Subscription Renewed`,
                payload: {
                  name: user.name,
                  planName: sub.plan?.name || sub.planCode,
                  amountFormatted: `$${(amountPaid / 100).toFixed(2)}`,
                  nextRenewal: nextPeriod.toLocaleDateString(),
                },
              });
            }
          }
          break;
        }

        case 'invoice.payment_failed': {
          const failedInvoice = event.data.object;
          const providerSubId = failedInvoice.subscription;
          const amountDue = failedInvoice.amount_due || 0;

          if (providerSubId) {
            const sub = await subscriptionRepository.findByProviderSubscriptionId(providerSubId);
            if (sub) {
              await subscriptionRepository.updateStatus(sub.userId, 'PAST_DUE');

              await paymentTransactionRepository.create({
                userId: sub.userId,
                subscriptionId: sub.id,
                providerPaymentId: failedInvoice.payment_intent || failedInvoice.id,
                providerInvoiceId: failedInvoice.id,
                amountCents: amountDue,
                status: 'FAILED',
                errorMessage: 'Payment renewal attempt failed',
              });

              const user = await userRepository.findById(sub.userId);
              if (user) {
                await emailService.enqueue({
                  to: user.email,
                  toName: user.name,
                  userId: user.id,
                  template: 'PAYMENT_FAILED',
                  subject: 'Action Required: SkillSwap Payment Failed',
                  payload: {
                    name: user.name,
                    planName: sub.plan?.name || sub.planCode,
                  },
                });

                await notificationService.createNotification({
                  userId: sub.userId,
                  type: 'SYSTEM',
                  title: 'Billing Alert: Payment Failed',
                  message: 'Your recent renewal payment failed. Please update your payment method.',
                  link: '/settings/billing',
                });
              }
            }
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const delSub = event.data.object;
          const providerSubId = delSub.id;

          if (providerSubId) {
            const sub = await subscriptionRepository.findByProviderSubscriptionId(providerSubId);
            if (sub) {
              await subscriptionRepository.updateStatus(sub.userId, 'CANCELED', {
                cancelAtPeriodEnd: false,
                canceledAt: new Date().toISOString(),
                planCode: 'FREE',
              });

              const user = await userRepository.findById(sub.userId);
              if (user) {
                await emailService.enqueue({
                  to: user.email,
                  toName: user.name,
                  userId: user.id,
                  template: 'SUBSCRIPTION_CANCELED',
                  subject: 'SkillSwap Subscription Canceled',
                  payload: {
                    name: user.name,
                    planName: sub.plan?.name || sub.planCode,
                    periodEnd: new Date().toLocaleDateString(),
                  },
                });
              }
            }
          }
          break;
        }
      }

      await billingWebhookRepository.markProcessed(eventId);
      return { received: true, processed: true, eventType };
    } catch (err: any) {
      logger.error({ error: err.message }, `[BillingService] Webhook processing failed for event ${eventId}`);
      await billingWebhookRepository.markFailed(eventId, err.message);
      throw err;
    }
  }

  async cancelSubscription(userId: number): Promise<{ success: boolean; message: string }> {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (!sub || sub.status !== 'ACTIVE') {
      throw new BadRequestError('You do not have an active paid subscription to cancel');
    }

    const provider = getPaymentProvider(sub.provider);
    if (sub.providerSubscriptionId) {
      await provider.cancelSubscription(sub.providerSubscriptionId, true);
    }

    await subscriptionRepository.updateStatus(userId, 'ACTIVE', {
      cancelAtPeriodEnd: true,
      canceledAt: new Date().toISOString(),
    });

    const user = await userRepository.findById(userId);
    if (user) {
      await emailService.enqueue({
        to: user.email,
        toName: user.name,
        userId: user.id,
        template: 'SUBSCRIPTION_CANCELED',
        subject: 'Subscription Cancellation Scheduled',
        payload: {
          name: user.name,
          planName: sub.plan?.name || sub.planCode,
          periodEnd: sub.currentPeriodEnd
            ? new Date(sub.currentPeriodEnd).toLocaleDateString()
            : 'the end of your billing cycle',
        },
      });
    }

    return {
      success: true,
      message: 'Your subscription will remain active until the end of the current billing period.',
    };
  }

  async reactivateSubscription(userId: number): Promise<{ success: boolean; message: string }> {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (!sub || sub.status !== 'ACTIVE' || !sub.cancelAtPeriodEnd) {
      throw new BadRequestError('Subscription is not scheduled for cancellation');
    }

    const provider = getPaymentProvider(sub.provider);
    if (sub.providerSubscriptionId) {
      await provider.resumeSubscription(sub.providerSubscriptionId);
    }

    await subscriptionRepository.updateStatus(userId, 'ACTIVE', {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    return {
      success: true,
      message: 'Your subscription has been renewed and will continue uninterrupted.',
    };
  }

  async getUserInvoices(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ invoices: BillingInvoiceRecord[]; total: number; totalPages: number }> {
    return billingInvoiceRepository.findByUserId(userId, page, limit);
  }

  async getAdminOverview(): Promise<AdminBillingOverview> {
    const counts = await subscriptionRepository.getStatusCounts();
    const metrics = await paymentTransactionRepository.getRevenueMetrics();

    // Calculate MRR / ARR from active subscriptions
    const allSubs = (await db.orm.public.UserSubscription.where({ status: 'ACTIVE' }).all()) as any[];
    let mrrCents = 0;
    let proCount = 0;
    let premiumCount = 0;

    for (const s of allSubs) {
      if (s.planCode === 'PRO') {
        proCount++;
        mrrCents += s.billingCycle === 'YEARLY' ? 1200 : 1500;
      } else if (s.planCode === 'PREMIUM') {
        premiumCount++;
        mrrCents += s.billingCycle === 'YEARLY' ? 2400 : 2900;
      }
    }

    const totalUsers = (await db.orm.public.User.all()) as any[];

    const activeSubscribers = proCount + premiumCount;
    const conversionRate = totalUsers.length > 0 ? (activeSubscribers / totalUsers.length) * 100 : 0;

    return {
      mrrCents,
      arrCents: mrrCents * 12,
      totalRevenueCents: metrics.totalRevenueCents,
      activeSubscribers,
      totalUsers: totalUsers.length,
      conversionRate: Math.round(conversionRate * 10) / 10,
      failedPaymentRate: metrics.failedPaymentRate,
      tiers: {
        free: counts.free || Math.max(0, totalUsers.length - activeSubscribers),
        pro: proCount,
        premium: premiumCount,
      },
      subscriptionStatuses: counts,
    };
  }

  async getAdminSubscriptions(page = 1, limit = 20, status?: string, planCode?: string) {
    return subscriptionRepository.findAllWithFilters({ page, limit, status, planCode });
  }

  async getAdminTransactions(page = 1, limit = 20) {
    return paymentTransactionRepository.findAll(page, limit);
  }
}

export const billingService = new BillingService();
