import type { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service.js';
import {
  createReviewSchema,
  reviewQuerySchema,
} from '../validators/review.validator.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';

export class ReviewController {
  async createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = createReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid review data', issues);
      }

      const review = await reviewService.createReview(req.user.id, parsed.data);

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: { review },
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId as string, 10);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const parsed = reviewQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { limit: 10, page: 1, sort: 'newest' as const };

      const result = await reviewService.getUserReviews(userId, query);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSessionReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.sessionId as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const reviews = await reviewService.getSessionReviews(sessionId, req.user.id);

      res.status(200).json({
        success: true,
        data: { reviews },
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserReputation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params.userId as string, 10);
      if (isNaN(userId)) {
        res.status(400).json({ success: false, message: 'Invalid user ID' });
        return;
      }

      const reputation = await reviewService.getUserReputation(userId);

      res.status(200).json({
        success: true,
        data: { reputation },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reviewController = new ReviewController();

