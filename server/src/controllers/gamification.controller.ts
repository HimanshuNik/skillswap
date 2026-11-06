import type { Request, Response, NextFunction } from 'express';
import { xpRepository, calculateLevelFromXP } from '../repositories/xp.repository.js';
import { achievementRepository } from '../repositories/achievement.repository.js';
import { streakRepository } from '../repositories/streak.repository.js';
import { gamificationPrivacyRepository } from '../repositories/gamificationPrivacy.repository.js';
import { learningAnalyticsService } from '../services/gamification/learningAnalytics.service.js';
import {
  privacyUpdateSchema,
  streakToggleSchema,
  featureBadgeSchema,
} from '../validators/gamification.validator.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors.js';

export class GamificationController {
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const userXP = await xpRepository.getOrCreateUserXP(userId);
      const levelInfo = calculateLevelFromXP(userXP.totalXp);
      const streak = await streakRepository.getOrCreateStreak(userId);
      const privacy = await gamificationPrivacyRepository.getOrCreatePrivacy(userId);
      const userAchievements = await achievementRepository.getUserAchievements(userId);
      const allAchievements = await achievementRepository.getAllAchievements();

      res.json({
        success: true,
        data: {
          levelInfo: {
            currentLevel: levelInfo.level,
            title: levelInfo.title,
            totalXp: userXP.totalXp,
            currentLevelXp: levelInfo.currentLevelXp,
            nextLevelXp: levelInfo.nextLevelXp,
            xpInCurrentLevel: levelInfo.xpInCurrentLevel,
            xpRequiredForNextLevel: levelInfo.xpRequiredForNextLevel,
            progressPercent: levelInfo.progressPercent,
          },
          streak: {
            currentStreak: streak.currentStreak,
            longestStreak: streak.longestStreak,
            lastActiveDate: streak.lastActiveDate,
            isEnabled: streak.isEnabled,
          },
          achievements: {
            unlockedCount: userAchievements.length,
            totalCount: allAchievements.length,
          },
          privacy: {
            showLevel: privacy.showLevel,
            showBadges: privacy.showBadges,
            showStats: privacy.showStats,
            showActivityHeatmap: privacy.showActivityHeatmap,
            showLearningGoals: privacy.showLearningGoals,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const achievements = await achievementRepository.getAchievementsWithUserStatus(userId);
      res.json({
        success: true,
        data: { achievements },
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleFeatureBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;
      const code = String(req.params['code'] || '');

      const parsed = featureBadgeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid request body', parsed.error.issues);
      }

      const updated = await achievementRepository.toggleFeatured(userId, code, parsed.data.isFeatured);
      if (!updated) {
        throw new NotFoundError('Unlocked achievement badge not found');
      }

      res.json({
        success: true,
        message: 'Badge featured status updated',
      });
    } catch (err) {
      next(err);
    }
  }

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const limit = Math.min(50, Math.max(1, Number(req.query['limit']) || 20));
      const offset = Math.max(0, Number(req.query['offset']) || 0);

      const history = await xpRepository.getTransactions(userId, limit, offset);
      res.json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePrivacy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const parsed = privacyUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid privacy options', parsed.error.issues);
      }

      const updated = await gamificationPrivacyRepository.updatePrivacy(userId, parsed.data);
      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: { privacy: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  async toggleStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const userId = req.user.id;

      const parsed = streakToggleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid streak settings', parsed.error.issues);
      }

      const streak = await streakRepository.setStreakEnabled(userId, parsed.data.isEnabled);
      res.json({
        success: true,
        message: `Streak tracking ${streak.isEnabled ? 'enabled' : 'disabled'}`,
        data: { streak },
      });
    } catch (err) {
      next(err);
    }
  }

  async getPublicProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = String(req.params['username'] || '');
      const profile = await learningAnalyticsService.getPublicProfileGamification(username);
      if (!profile) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const gamificationController = new GamificationController();
