import type { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { discoveryService } from '../services/discovery.service.js';
import { authService } from '../services/auth.service.js';
import { notificationPreferenceRepository } from '../repositories/notificationPreference.repository.js';
import {
  updateProfileSchema,
  addTeachingSkillSchema,
  addLearningSkillSchema,
  updateAvailabilitySchema,
  updateNotificationPreferencesSchema,
} from '../validators/user.validator.js';
import { deleteAccountSchema } from '../validators/auth.validator.js';
import { ValidationError, UnauthorizedError } from '../utils/errors.js';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from '../middleware/auth.middleware.js';

export class UserController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const profile = await userService.getFullProfile(req.user.id);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid profile update data', issues);
      }

      const updated = await userService.updateProfile(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  async getDiscoverUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 12;
      const excludeUserId = req.user?.id;

      const result = await discoveryService.getDiscoverUsers({
        search,
        category,
        page,
        limit,
        excludeUserId,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const raw = req.params.username;
      const username = Array.isArray(raw) ? raw[0] : raw;
      const profile = await userService.getPublicProfile(username);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }

  async addTeachingSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = addTeachingSkillSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid teaching skill data', issues);
      }

      const created = await userService.addTeachingSkill(req.user.id, parsed.data);
      res.status(201).json({
        success: true,
        message: 'Teaching skill added successfully',
        data: { teachingSkill: created },
      });
    } catch (err) {
      next(err);
    }
  }

  async removeTeachingSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const rawSkillId = Array.isArray(req.params.skillId) ? req.params.skillId[0] : req.params.skillId;
      const skillId = parseInt(rawSkillId, 10);
      if (isNaN(skillId) || skillId <= 0) {
        throw new ValidationError('Invalid skill ID');
      }

      await userService.removeTeachingSkill(req.user.id, skillId);
      res.status(200).json({
        success: true,
        message: 'Teaching skill removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async addLearningSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = addLearningSkillSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid learning skill data', issues);
      }

      const created = await userService.addLearningSkill(req.user.id, parsed.data);
      res.status(201).json({
        success: true,
        message: 'Learning skill added successfully',
        data: { learningSkill: created },
      });
    } catch (err) {
      next(err);
    }
  }

  async removeLearningSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const rawSkillId = Array.isArray(req.params.skillId) ? req.params.skillId[0] : req.params.skillId;
      const skillId = parseInt(rawSkillId, 10);
      if (isNaN(skillId) || skillId <= 0) {
        throw new ValidationError('Invalid skill ID');
      }

      await userService.removeLearningSkill(req.user.id, skillId);
      res.status(200).json({
        success: true,
        message: 'Learning skill removed successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  async updateAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = updateAvailabilitySchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid availability data', issues);
      }

      const schedule = await userService.updateAvailability(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: 'Availability schedule updated successfully',
        data: { availability: schedule },
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = deleteAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Password is required to confirm account deletion');
      }

      await authService.deleteAccount(req.user.id, parsed.data);

      res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
      res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

      res.status(200).json({
        success: true,
        message: 'Account successfully deactivated',
      });
    } catch (err) {
      next(err);
    }
  }

  async getNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const preferences = await notificationPreferenceRepository.getOrDefault(req.user.id);
      res.status(200).json({
        success: true,
        data: { preferences },
      });
    } catch (err) {
      next(err);
    }
  }

  async updateNotificationPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const parsed = updateNotificationPreferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        throw new ValidationError('Invalid notification preference data', issues);
      }

      const preferences = await notificationPreferenceRepository.upsert(req.user.id, parsed.data);
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully',
        data: { preferences },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
