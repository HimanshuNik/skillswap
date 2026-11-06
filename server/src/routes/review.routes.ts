import { Router } from 'express';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const reviewRouter = Router();

// Submit a new review for a completed session (authenticated learner only)
reviewRouter.post('/', authenticate, (req, res, next) =>
  reviewController.createReview(req, res, next)
);

// Get reviews for a specific user (public)
reviewRouter.get('/user/:userId', (req, res, next) =>
  reviewController.getUserReviews(req, res, next)
);

// Get reputation for a specific user (public)
reviewRouter.get('/user/:userId/reputation', (req, res, next) =>
  reviewController.getUserReputation(req, res, next)
);

// Get reviews for a specific session (participants only)
reviewRouter.get('/session/:sessionId', authenticate, (req, res, next) =>
  reviewController.getSessionReviews(req, res, next)
);

