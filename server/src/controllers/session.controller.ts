import type { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service.js';
import {
  createSessionSchema,
  rescheduleSessionSchema,
  respondRescheduleSchema,
  cancelSessionSchema,
  confirmCompletionSchema,
  sessionQuerySchema,
} from '../validators/session.validator.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';

export class SessionController {
  async createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid session data', issues);
      }

      const session = await sessionService.createSession(req.user.id, parsed.data);

      res.status(201).json({
        success: true,
        message: 'Session scheduled successfully',
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async getUserSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const parsed = sessionQuerySchema.safeParse(req.query);
      const query = parsed.success ? parsed.data : { filter: 'all' as const };

      const sessions = await sessionService.getUserSessions(req.user.id, query);

      res.status(200).json({
        success: true,
        data: { sessions },
      });
    } catch (err) {
      next(err);
    }
  }

  async getSessionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const session = await sessionService.getSessionById(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async proposeReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const parsed = rescheduleSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid reschedule proposal', issues);
      }

      const session = await sessionService.proposeReschedule(
        req.user.id,
        sessionId,
        parsed.data
      );

      res.status(200).json({
        success: true,
        message: 'Reschedule proposed successfully',
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async respondReschedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const parsed = respondRescheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid response action', issues);
      }

      const session = await sessionService.respondToReschedule(
        req.user.id,
        sessionId,
        parsed.data
      );

      res.status(200).json({
        success: true,
        message: `Reschedule ${parsed.data.action.toLowerCase()}ed successfully`,
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async cancelSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const parsed = cancelSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid cancellation data', issues);
      }

      const session = await sessionService.cancelSession(
        req.user.id,
        sessionId,
        parsed.data
      );

      res.status(200).json({
        success: true,
        message: 'Session cancelled',
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async getMeetingInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const meetingInfo = await sessionService.getMeetingInfo(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        data: meetingInfo,
      });
    } catch (err) {
      next(err);
    }
  }

  async startSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const meetingInfo = await sessionService.startSession(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        message: 'Joined session meeting',
        data: meetingInfo,
      });
    } catch (err) {
      next(err);
    }
  }

  async completeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const session = await sessionService.completeSession(req.user.id, sessionId);

      res.status(200).json({
        success: true,
        message: 'Session marked as complete. Waiting for peer confirmation.',
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }

  async confirmCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const sessionId = parseInt(req.params.id as string, 10);
      if (isNaN(sessionId)) {
        res.status(400).json({ success: false, message: 'Invalid session ID' });
        return;
      }

      const parsed = confirmCompletionSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid completion confirmation', issues);
      }

      const session = await sessionService.confirmCompletion(
        req.user.id,
        sessionId,
        parsed.data
      );

      res.status(200).json({
        success: true,
        message:
          parsed.data.action === 'CONFIRM'
            ? 'Session completion confirmed'
            : 'Session completion disputed',
        data: { session },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const sessionController = new SessionController();

