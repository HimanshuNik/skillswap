import { Router } from 'express';
import { sessionController } from '../controllers/session.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const sessionRouter = Router();

// All session operations require authentication
sessionRouter.use(authenticate);

// List sessions for the authenticated user (supports filter=upcoming|past|all, role=teacher|learner, swapRequestId)
sessionRouter.get('/', (req, res, next) =>
  sessionController.getUserSessions(req, res, next)
);

// Schedule a new session
sessionRouter.post('/', (req, res, next) =>
  sessionController.createSession(req, res, next)
);

// Get single session details
sessionRouter.get('/:id', (req, res, next) =>
  sessionController.getSessionById(req, res, next)
);

// Propose a reschedule
sessionRouter.post('/:id/reschedule', (req, res, next) =>
  sessionController.proposeReschedule(req, res, next)
);

// Accept or reject reschedule proposal
sessionRouter.post('/:id/reschedule/respond', (req, res, next) =>
  sessionController.respondReschedule(req, res, next)
);

// Cancel a session
sessionRouter.post('/:id/cancel', (req, res, next) =>
  sessionController.cancelSession(req, res, next)
);

// Get video meeting information & join status
sessionRouter.get('/:id/meeting', (req, res, next) =>
  sessionController.getMeetingInfo(req, res, next)
);

// Start/join the video meeting
sessionRouter.post('/:id/start', (req, res, next) =>
  sessionController.startSession(req, res, next)
);

// Mark session as complete (awaits peer confirmation)
sessionRouter.post('/:id/complete', (req, res, next) =>
  sessionController.completeSession(req, res, next)
);

// Peer confirms or disputes session completion
sessionRouter.post('/:id/complete/confirm', (req, res, next) =>
  sessionController.confirmCompletion(req, res, next)
);

