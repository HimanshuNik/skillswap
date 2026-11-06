import type { Request, Response, NextFunction } from 'express';
import { learningAnalyticsService } from '../services/gamification/learningAnalytics.service.js';
import {
  analyticsOverviewQuerySchema,
  activityHeatmapQuerySchema,
} from '../validators/gamification.validator.js';
import { UnauthorizedError } from '../utils/errors.js';

export class LearningAnalyticsController {
  async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const parsed = analyticsOverviewQuerySchema.safeParse(req.query);
      const rangeParam = parsed.success ? parsed.data.range : '30d';

      let rangeDays = 30;
      if (rangeParam === '7d') rangeDays = 7;
      else if (rangeParam === '90d') rangeDays = 90;
      else if (rangeParam === 'all') rangeDays = 0;

      const overview = await learningAnalyticsService.getOverview(userId, rangeDays);
      res.json({
        success: true,
        data: overview,
      });
    } catch (err) {
      next(err);
    }
  }

  async getActivityHeatmap(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const parsed = activityHeatmapQuerySchema.safeParse(req.query);
      const year = parsed.success && parsed.data.year ? parsed.data.year : new Date().getFullYear();
      const timezone = parsed.success && parsed.data.timezone ? parsed.data.timezone : 'UTC';

      const heatmap = await learningAnalyticsService.getActivityHeatmap(userId, year, timezone);
      res.json({
        success: true,
        data: heatmap,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSkillProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const skills = await learningAnalyticsService.getSkillProgress(userId);
      res.json({
        success: true,
        data: { skills },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const learningAnalyticsController = new LearningAnalyticsController();

