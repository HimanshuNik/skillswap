import { Router } from 'express';
import { swapRequestController } from '../controllers/swapRequest.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const swapRequestRouter = Router();

// All swap request operations require authentication
swapRequestRouter.use(authenticate);

// Create a new swap request
swapRequestRouter.post('/', (req, res, next) =>
  swapRequestController.createSwapRequest(req, res, next)
);

// Get incoming swap requests for the authenticated user
swapRequestRouter.get('/incoming', (req, res, next) =>
  swapRequestController.getIncomingRequests(req, res, next)
);

// Get outgoing swap requests sent by the authenticated user
swapRequestRouter.get('/outgoing', (req, res, next) =>
  swapRequestController.getOutgoingRequests(req, res, next)
);

// Get count of pending incoming requests (useful for badge counter)
swapRequestRouter.get('/pending-count', (req, res, next) =>
  swapRequestController.getPendingCount(req, res, next)
);

// Get active request between authenticated user and a specific target user
swapRequestRouter.get('/with-user/:targetUserId', (req, res, next) =>
  swapRequestController.getActiveWithUser(req, res, next)
);

// Accept a swap request (receiver only)
swapRequestRouter.patch('/:id/accept', (req, res, next) =>
  swapRequestController.acceptSwapRequest(req, res, next)
);

// Reject a swap request (receiver only)
swapRequestRouter.patch('/:id/reject', (req, res, next) =>
  swapRequestController.rejectSwapRequest(req, res, next)
);

// Cancel a swap request (sender only)
swapRequestRouter.patch('/:id/cancel', (req, res, next) =>
  swapRequestController.cancelSwapRequest(req, res, next)
);

