import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', (req, res, next) => dashboardController.getDashboard(req, res, next));
dashboardRouter.get('/summary', (req, res, next) => dashboardController.getSummary(req, res, next));
dashboardRouter.get('/recommendations', (req, res, next) =>
  dashboardController.getRecommendations(req, res, next)
);
dashboardRouter.get('/activity', (req, res, next) => dashboardController.getActivity(req, res, next));

