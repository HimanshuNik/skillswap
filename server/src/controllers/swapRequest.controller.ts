import type { Request, Response, NextFunction } from 'express';
import { swapRequestService } from '../services/swapRequest.service.js';
import { createSwapRequestSchema } from '../validators/swapRequest.validator.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';

export class SwapRequestController {
  async createSwapRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = createSwapRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid swap request data', issues);
      }

      const result = await swapRequestService.createSwapRequest(req.user.id, parsed.data);

      res.status(201).json({
        success: true,
        message: 'Swap request sent successfully',
        data: { swapRequest: result },
      });
    } catch (err) {
      next(err);
    }
  }

  async getIncomingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const requests = await swapRequestService.getIncomingRequests(req.user.id);

      res.status(200).json({
        success: true,
        data: { requests },
      });
    } catch (err) {
      next(err);
    }
  }

  async getOutgoingRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const requests = await swapRequestService.getOutgoingRequests(req.user.id);

      res.status(200).json({
        success: true,
        data: { requests },
      });
    } catch (err) {
      next(err);
    }
  }

  async getPendingCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const pendingCount = await swapRequestService.getPendingCount(req.user.id);

      res.status(200).json({
        success: true,
        data: { pendingCount },
      });
    } catch (err) {
      next(err);
    }
  }

  async getActiveWithUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const raw = req.params.targetUserId;
      const targetUserIdStr = Array.isArray(raw) ? raw[0] : raw;
      const targetUserId = parseInt(targetUserIdStr, 10);
      if (isNaN(targetUserId) || targetUserId <= 0) {
        throw new ValidationError('Invalid target user ID');
      }

      const activeRequest = await swapRequestService.getActiveWithUser(
        req.user.id,
        targetUserId
      );

      res.status(200).json({
        success: true,
        data: { activeRequest },
      });
    } catch (err) {
      next(err);
    }
  }

  async acceptSwapRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const raw = req.params.id;
      const idStr = Array.isArray(raw) ? raw[0] : raw;
      const requestId = parseInt(idStr, 10);
      if (isNaN(requestId) || requestId <= 0) {
        throw new ValidationError('Invalid swap request ID');
      }

      const result = await swapRequestService.acceptSwapRequest(req.user.id, requestId);

      res.status(200).json({
        success: true,
        message: 'Swap request accepted successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async rejectSwapRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const raw = req.params.id;
      const idStr = Array.isArray(raw) ? raw[0] : raw;
      const requestId = parseInt(idStr, 10);
      if (isNaN(requestId) || requestId <= 0) {
        throw new ValidationError('Invalid swap request ID');
      }

      const result = await swapRequestService.rejectSwapRequest(req.user.id, requestId);

      res.status(200).json({
        success: true,
        message: 'Swap request rejected',
        data: { swapRequest: result },
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelSwapRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const raw = req.params.id;
      const idStr = Array.isArray(raw) ? raw[0] : raw;
      const requestId = parseInt(idStr, 10);
      if (isNaN(requestId) || requestId <= 0) {
        throw new ValidationError('Invalid swap request ID');
      }

      const result = await swapRequestService.cancelSwapRequest(req.user.id, requestId);

      res.status(200).json({
        success: true,
        message: 'Swap request cancelled',
        data: { swapRequest: result },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const swapRequestController = new SwapRequestController();

