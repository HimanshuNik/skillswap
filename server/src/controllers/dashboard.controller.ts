import type { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export class DashboardController {
  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const data = await dashboardService.getAggregatedDashboard(req.user.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const data = await dashboardService.getSummary(req.user.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 3;
      const data = await dashboardService.getRecommendations(req.user.id, limit);
      res.status(200).json({
        success: true,
        data: { recommendations: data },
      });
    } catch (err) {
      next(err);
    }
  }

  async getActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const data = await dashboardService.getActivity(req.user.id, limit);
      res.status(200).json({
        success: true,
        data: { activities: data },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();

