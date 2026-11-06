import type { Request, Response, NextFunction } from 'express';
import { onboardingService } from '../services/onboarding.service.js';
import { onboardingSchema } from '../validators/onboarding.validator.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';

export class OnboardingController {
  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = onboardingSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid onboarding payload', issues);
      }

      const profile = await onboardingService.completeOnboarding(req.user.id, parsed.data);

      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully',
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const onboardingController = new OnboardingController();

