import type { Request, Response, NextFunction } from 'express';
import { discoveryService } from '../services/discovery.service.js';
import { UnauthorizedError } from '../utils/errors.js';

export class MatchController {
  async getMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const result = await discoveryService.getMatches(req.user.id, limit);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const matchController = new MatchController();

