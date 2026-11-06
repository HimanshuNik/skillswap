import type { Request, Response, NextFunction } from 'express';
import { learningGoalRepository } from '../repositories/learningGoal.repository.js';
import { gamificationService } from '../services/gamification/gamification.service.js';
import { createGoalSchema, updateGoalSchema } from '../validators/gamification.validator.js';
import { UnauthorizedError, ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';

export class LearningGoalController {
  async getGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;
      const status = req.query['status'] as string | undefined;

      const goals = await learningGoalRepository.findByUserId(userId, status);
      res.json({
        success: true,
        data: { goals },
      });
    } catch (err) {
      next(err);
    }
  }

  async createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const parsed = createGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid goal data', parsed.error.issues);
      }

      const goal = await learningGoalRepository.createGoal(userId, parsed.data);
      res.status(201).json({
        success: true,
        message: 'Learning goal created successfully',
        data: { goal },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;
      const goalId = Number(req.params['id']);

      const parsed = updateGoalSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid goal updates', parsed.error.issues);
      }

      const existing = await learningGoalRepository.findById(goalId);
      if (!existing) {
        throw new NotFoundError('Learning goal not found');
      }
      if (existing.userId !== userId) {
        throw new ForbiddenError('You do not have permission to update this goal');
      }

      const updated = await learningGoalRepository.updateGoal(goalId, userId, parsed.data);

      // If status just transitioned to COMPLETED
      if (existing.status !== 'COMPLETED' && updated?.status === 'COMPLETED') {
        await gamificationService.onGoalCompleted({ userId, goalId });
      }

      res.json({
        success: true,
        message: 'Learning goal updated successfully',
        data: { goal: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;
      const goalId = Number(req.params['id']);

      const existing = await learningGoalRepository.findById(goalId);
      if (!existing) {
        throw new NotFoundError('Learning goal not found');
      }
      if (existing.userId !== userId) {
        throw new ForbiddenError('You do not have permission to delete this goal');
      }

      await learningGoalRepository.deleteGoal(goalId, userId);
      res.json({
        success: true,
        message: 'Learning goal removed',
      });
    } catch (err) {
      next(err);
    }
  }
}

export const learningGoalController = new LearningGoalController();

