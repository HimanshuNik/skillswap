import { Router } from 'express';
import { learningAnalyticsController } from '../controllers/learningAnalytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const learningAnalyticsRouter = Router();

// Learning analytics overview with range filter (7d, 30d, 90d, all)
learningAnalyticsRouter.get('/overview', authenticate, (req, res, next) => {
  learningAnalyticsController.getOverview(req, res, next).catch(next);
});

// Activity calendar heatmap
learningAnalyticsRouter.get('/activity', authenticate, (req, res, next) => {
  learningAnalyticsController.getActivityHeatmap(req, res, next).catch(next);
});

// Skill progress breakdown
learningAnalyticsRouter.get('/skills', authenticate, (req, res, next) => {
  learningAnalyticsController.getSkillProgress(req, res, next).catch(next);
});

