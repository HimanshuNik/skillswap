import { db } from '../prisma/db.js';

export interface GamificationPrivacyRecord {
  id: number;
  userId: number;
  showLevel: boolean;
  showBadges: boolean;
  showStats: boolean;
  showActivityHeatmap: boolean;
  showLearningGoals: boolean;
  createdAt: string;
  updatedAt: string;
}

export class GamificationPrivacyRepository {
  async getOrCreatePrivacy(userId: number): Promise<GamificationPrivacyRecord> {
    const existing = await db.orm.public.GamificationPrivacy.where({ userId }).first();
    if (existing) {
      return existing as unknown as GamificationPrivacyRecord;
    }

    try {
      const created = await db.orm.public.GamificationPrivacy.create({
        userId,
        showLevel: true,
        showBadges: true,
        showStats: true,
        showActivityHeatmap: false,
        showLearningGoals: false,
      });
      return created as unknown as GamificationPrivacyRecord;
    } catch {
      const retry = await db.orm.public.GamificationPrivacy.where({ userId }).first();
      return retry as unknown as GamificationPrivacyRecord;
    }
  }

  async updatePrivacy(
    userId: number,
    data: Partial<{
      showLevel: boolean;
      showBadges: boolean;
      showStats: boolean;
      showActivityHeatmap: boolean;
      showLearningGoals: boolean;
    }>
  ): Promise<GamificationPrivacyRecord> {
    const privacy = await this.getOrCreatePrivacy(userId);
    const updated = await db.orm.public.GamificationPrivacy.where({ id: privacy.id }).update(data);
    return updated as unknown as GamificationPrivacyRecord;
  }
}

export const gamificationPrivacyRepository = new GamificationPrivacyRepository();

