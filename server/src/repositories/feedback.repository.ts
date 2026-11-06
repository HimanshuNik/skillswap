import { db } from '../prisma/db.js';

export interface RecommendationFeedbackRecord {
  id: number;
  userId: number;
  recommendedUserId: number;
  feedbackType: 'HELPFUL' | 'NOT_RELEVANT' | 'ALREADY_CONNECTED' | 'NOT_INTERESTED';
  reason: string | null;
  createdAt: string;
}

export class FeedbackRepository {
  async recordFeedback(
    data: {
      userId: number;
      recommendedUserId: number;
      feedbackType: string;
      reason?: string | null;
    },
    client: any = db
  ): Promise<RecommendationFeedbackRecord> {
    const existing = await client.orm.public.RecommendationFeedback
      .where({ userId: data.userId, recommendedUserId: data.recommendedUserId })
      .first();

    if (existing) {
      await client.orm.public.RecommendationFeedback
        .where({ id: existing.id })
        .update({
          feedbackType: data.feedbackType,
          reason: data.reason ?? null,
        });
      const updated = await client.orm.public.RecommendationFeedback.where({ id: existing.id }).first();
      return updated as unknown as RecommendationFeedbackRecord;
    }

    const created = await client.orm.public.RecommendationFeedback.create({
      userId: data.userId,
      recommendedUserId: data.recommendedUserId,
      feedbackType: data.feedbackType,
      reason: data.reason ?? null,
    });
    return created as unknown as RecommendationFeedbackRecord;
  }

  async getUserFeedbackMap(userId: number, client: any = db): Promise<Map<number, string>> {
    const list = await client.orm.public.RecommendationFeedback.where({ userId }).all();
    const map = new Map<number, string>();
    for (const item of list as any[]) {
      map.set(item.recommendedUserId, item.feedbackType);
    }
    return map;
  }

  async getFeedbackCounts(client: any = db): Promise<{ helpful: number; notRelevant: number; alreadyConnected: number; notInterested: number }> {
    const all = await client.orm.public.RecommendationFeedback.all();
    const counts = { helpful: 0, notRelevant: 0, alreadyConnected: 0, notInterested: 0 };
    for (const f of all as any[]) {
      if (f.feedbackType === 'HELPFUL') counts.helpful++;
      else if (f.feedbackType === 'NOT_RELEVANT') counts.notRelevant++;
      else if (f.feedbackType === 'ALREADY_CONNECTED') counts.alreadyConnected++;
      else if (f.feedbackType === 'NOT_INTERESTED') counts.notInterested++;
    }
    return counts;
  }
}

export const feedbackRepository = new FeedbackRepository();

