import type { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';
import { HttpStatusCode } from '../utils/errors.js';

export class HealthController {
  async checkHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await healthService.getHealthStatus();

      const statusCode =
        health.status === 'healthy'
          ? HttpStatusCode.OK
          : HttpStatusCode.SERVICE_UNAVAILABLE;

      res.status(statusCode).json({
        success: health.status === 'healthy',
        message: health.message,
        data: health,
      });
    } catch (error) {
      next(error);
    }
  }

  checkLiveness(_req: Request, res: Response): void {
    const liveness = healthService.getLiveness();
    res.status(HttpStatusCode.OK).json({
      success: true,
      data: liveness,
    });
  }

  async checkReadiness(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const readiness = await healthService.getReadiness();
      const statusCode =
        readiness.status === 'ready'
          ? HttpStatusCode.OK
          : HttpStatusCode.SERVICE_UNAVAILABLE;

      res.status(statusCode).json({
        success: readiness.status === 'ready',
        data: readiness,
      });
    } catch (error) {
      next(error);
    }
  }

  getRoot(_req: Request, res: Response): void {
    res.send('SkillSwap API is running');
  }
}

export const healthController = new HealthController();
