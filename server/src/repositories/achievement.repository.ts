import { db } from '../prisma/db.js';
import { logger } from '../config/logger.js';

export interface AchievementRecord {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  badgeIcon: string;
  xpReward: number;
  criteriaType: string;
  criteriaThreshold: number;
  createdAt: string;
}

export interface UserAchievementRecord {
  id: number;
  userId: number;
  achievementCode: string;
  achievementId: number;
  unlockedAt: string;
  isFeatured: boolean;
}

export interface UserAchievementWithDetails extends AchievementRecord {
  unlocked: boolean;
  unlockedAt: string | null;
  isFeatured: boolean;
}

export class AchievementRepository {
  async getAllAchievements(): Promise<AchievementRecord[]> {
    const list = await db.orm.public.Achievement.all();
    return list as unknown as AchievementRecord[];
  }

  async getAchievementByCode(code: string): Promise<AchievementRecord | null> {
    const ach = await db.orm.public.Achievement.where({ code }).first();
    return ach as unknown as AchievementRecord | null;
  }

  async getUserAchievements(userId: number): Promise<UserAchievementRecord[]> {
    const records = await db.orm.public.UserAchievement.where({ userId }).all();
    return records as unknown as UserAchievementRecord[];
  }

  async getAchievementsWithUserStatus(userId: number): Promise<UserAchievementWithDetails[]> {
    const all = await this.getAllAchievements();
    const userAchs = await this.getUserAchievements(userId);
    const unlockedMap = new Map<string, UserAchievementRecord>();
    for (const ua of userAchs) {
      unlockedMap.set(ua.achievementCode, ua);
    }

    return all.map((ach) => {
      const unlocked = unlockedMap.get(ach.code);
      return {
        ...ach,
        unlocked: !!unlocked,
        unlockedAt: unlocked ? unlocked.unlockedAt : null,
        isFeatured: unlocked ? unlocked.isFeatured : false,
      };
    });
  }

  async awardAchievement(
    userId: number,
    code: string
  ): Promise<{
    awarded: boolean;
    alreadyUnlocked: boolean;
    achievement: AchievementRecord | null;
    userAchievement: UserAchievementRecord | null;
  }> {
    const ach = await this.getAchievementByCode(code);
    if (!ach) {
      logger.error({ code }, 'Cannot award achievement: code not found');
      return { awarded: false, alreadyUnlocked: false, achievement: null, userAchievement: null };
    }

    const existing = await db.orm.public.UserAchievement.where({
      userId,
      achievementCode: code,
    }).first();

    if (existing) {
      return {
        awarded: false,
        alreadyUnlocked: true,
        achievement: ach,
        userAchievement: existing as unknown as UserAchievementRecord,
      };
    }

    try {
      const created = await db.orm.public.UserAchievement.create({
        userId,
        achievementCode: code,
        achievementId: ach.id,
        isFeatured: false,
      });

      return {
        awarded: true,
        alreadyUnlocked: false,
        achievement: ach,
        userAchievement: created as unknown as UserAchievementRecord,
      };
    } catch (err: any) {
      logger.warn({ err, userId, code }, 'UserAchievement creation conflict/race');
      const fallback = await db.orm.public.UserAchievement.where({
        userId,
        achievementCode: code,
      }).first();
      return {
        awarded: false,
        alreadyUnlocked: true,
        achievement: ach,
        userAchievement: fallback as unknown as UserAchievementRecord,
      };
    }
  }

  async toggleFeatured(userId: number, achievementCode: string, isFeatured: boolean): Promise<boolean> {
    const record = await db.orm.public.UserAchievement.where({
      userId,
      achievementCode,
    }).first();

    if (!record) return false;

    await db.orm.public.UserAchievement.where({ id: record.id }).update({
      isFeatured,
    });
    return true;
  }
}

export const achievementRepository = new AchievementRepository();

