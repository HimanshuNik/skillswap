import { Router } from 'express';
import { matchController } from '../controllers/match.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const matchRouter = Router();

// GET /api/matches - Two-way skill matches for authenticated user
matchRouter.get('/', authenticate, (req, res, next) =>
  matchController.getMatches(req, res, next)
);

