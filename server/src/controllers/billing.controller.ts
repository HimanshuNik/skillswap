import type { Request, Response } from 'express';
import { billingService } from '../services/billing/billing.service.js';
import { createCheckoutSchema } from '../validators/billing.validator.js';
import { getPaymentProvider } from '../services/billing/paymentProvider.factory.js';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/errors.js';

export const billingController = {
  async getPlans(_req: Request, res: Response): Promise<void> {
    const plans = await billingService.getPlans();
    res.status(200).json({
      success: true,
      data: { plans },
    });
  },

  async getSubscription(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const data = await billingService.getUserSubscription(userId);
    res.status(200).json({
      success: true,
      data,
    });
  },

  async createCheckout(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const parsed = createCheckoutSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid checkout parameters');
    }

    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const successUrl = parsed.data.successUrl || `${clientUrl}/settings/billing?status=success`;
    const cancelUrl = parsed.data.cancelUrl || `${clientUrl}/pricing?status=cancelled`;

    const result = await billingService.createCheckoutSession({
      userId,
      planCode: parsed.data.planCode,
      billingCycle: parsed.data.billingCycle,
      successUrl,
      cancelUrl,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  },

  async handleWebhook(req: Request, res: Response): Promise<void> {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    const signature =
      (req.headers['stripe-signature'] as string) ||
      (req.headers['x-webhook-signature'] as string) ||
      '';

    const result = await billingService.handleWebhook(rawBody, signature);
    res.status(200).json({
      success: true,
      data: result,
    });
  },

  async cancelSubscription(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const result = await billingService.cancelSubscription(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  },

  async reactivateSubscription(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const result = await billingService.reactivateSubscription(userId);
    res.status(200).json({
      success: true,
      data: result,
    });
  },

  async getInvoices(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const page = parseInt(req.query['page'] as string, 10) || 1;
    const limit = parseInt(req.query['limit'] as string, 10) || 20;

    const result = await billingService.getUserInvoices(userId, page, limit);
    res.status(200).json({
      success: true,
      data: result.invoices,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  },

  async createCustomerPortal(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const sub = await billingService.getUserSubscription(userId);

    const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
    const returnUrl = `${clientUrl}/settings/billing`;

    const provider = getPaymentProvider(sub.subscription?.provider);
    const result = await provider.createCustomerPortalSession({
      customerId: sub.subscription?.providerCustomerId || `cus_mock_${userId}`,
      returnUrl,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  },
};

