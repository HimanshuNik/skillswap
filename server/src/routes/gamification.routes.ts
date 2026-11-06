import { Router } from 'express';
import { gamificationController } from '../controllers/gamification.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const gamificationRouter = Router();

// Current user gamification overview & levels
gamificationRouter.get('/me', authenticate, (req, res, next) => {
  gamificationController.getMe(req, res, next).catch(next);
});

// Achievement badges catalog & user status
gamificationRouter.get('/achievements', authenticate, (req, res, next) => {
  gamificationController.getAchievements(req, res, next).catch(next);
});

// Toggle badge featured status on profile
gamificationRouter.patch('/achievements/:code/feature', authenticate, (req, res, next) => {
  gamificationController.toggleFeatureBadge(req, res, next).catch(next);
});

// XP transaction ledger
gamificationRouter.get('/history', authenticate, (req, res, next) => {
  gamificationController.getHistory(req, res, next).catch(next);
});

// Update gamification privacy settings
gamificationRouter.patch('/privacy', authenticate, (req, res, next) => {
  gamificationController.updatePrivacy(req, res, next).catch(next);
});

// Toggle streak tracking
gamificationRouter.post('/streak/toggle', authenticate, (req, res, next) => {
  gamificationController.toggleStreak(req, res, next).catch(next);
});

// Public gamification profile
gamificationRouter.get('/users/:username', (req, res, next) => {
  gamificationController.getPublicProfile(req, res, next).catch(next);
});

