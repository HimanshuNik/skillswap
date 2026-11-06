import { Router } from 'express';
import { billingController } from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const billingRouter = Router();

// Public endpoints
billingRouter.get('/plans', (req, res, next) => {
  billingController.getPlans(req, res).catch(next);
});

billingRouter.post('/webhook', (req, res, next) => {
  billingController.handleWebhook(req, res).catch(next);
});

// Authenticated user billing endpoints
billingRouter.get('/subscription', authenticate, (req, res, next) => {
  billingController.getSubscription(req, res).catch(next);
});

billingRouter.post('/checkout', authenticate, (req, res, next) => {
  billingController.createCheckout(req, res).catch(next);
});

billingRouter.post('/cancel', authenticate, (req, res, next) => {
  billingController.cancelSubscription(req, res).catch(next);
});

billingRouter.post('/reactivate', authenticate, (req, res, next) => {
  billingController.reactivateSubscription(req, res).catch(next);
});

billingRouter.get('/invoices', authenticate, (req, res, next) => {
  billingController.getInvoices(req, res).catch(next);
});

billingRouter.post('/portal', authenticate, (req, res, next) => {
  billingController.createCustomerPortal(req, res).catch(next);
});

