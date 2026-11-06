import { Router } from 'express';
import { onboardingController } from '../controllers/onboarding.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const onboardingRouter = Router();

// POST /api/onboarding - Complete user onboarding profile, skills, and schedule atomically
onboardingRouter.post('/', authenticate, (req, res, next) =>
  onboardingController.completeOnboarding(req, res, next)
);

