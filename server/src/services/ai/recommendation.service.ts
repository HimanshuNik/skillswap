import { db } from '../../prisma/db.js';
import { discoveryService } from '../discovery.service.js';
import { feedbackRepository } from '../../repositories/feedback.repository.js';
import { aiUsageRepository } from '../../repositories/aiUsage.repository.js';
import { getAIProvider } from './aiProvider.factory.js';
import type { MatchResult } from '../matching.service.js';

export interface AIRecommendationItem {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    username: string;
    location: string | null;
    bio: string | null;
    avatarUrl: string | null;
    averageRating: number;
    totalReviews: number;
    completedSessions: number;
    subscriptionTier?: string;
  };
  compatibilityScore: number;
  aiConfidenceScore: number; // 0 - 100
  isReciprocal: boolean;
  theyCanTeachYou: string[];
  youCanTeachThem: string[];
  matchingDays: string[];
  recommendationReason: string;
  explanation: string;
  feedback?: string | null;
}

export interface RecommendationOptions {
  page?: number;
  limit?: number;
  minScore?: number;
}

export class RecommendationService {
  async getRecommendations(
    userId: number,
    options: RecommendationOptions = {}
  ): Promise<{
    recommendations: AIRecommendationItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const start = Date.now();
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 10));
    const minScore = options.minScore || 40;

    // 1. Get base reciprocal matches
    const { matches } = await discoveryService.getMatches(userId, 100);

    // 2. Fetch user feedback map (to suppress not_interested / not_relevant)
    const feedbackMap = await feedbackRepository.getUserFeedbackMap(userId);

    // 3. Filter strictly for valid reciprocal matches and non-dismissed users
    const validMatches = matches.filter((m) => {
      if (!m.isReciprocal) return false;
      const feedback = feedbackMap.get(m.userId);
      if (feedback === 'NOT_INTERESTED' || feedback === 'NOT_RELEVANT') {
        return false;
      }
      return true;
    });

    // 4. Fetch subscription tiers of candidate users for priority matching
    const candidateIds = validMatches.map((m) => m.userId);
    const candidateUsers = await db.orm.public.User.all();
    const userTierMap = new Map<number, string>();
    for (const u of candidateUsers as any[]) {
      userTierMap.set(u.id, u.subscriptionTier || 'FREE');
    }

    // 5. Score and enhance with AI ranking heuristics
    const enhanced: AIRecommendationItem[] = validMatches.map((match) => {
      let aiScore = match.compatibilityScore;
      const reasons: string[] = [];

      // Feedback boost
      const feedback = feedbackMap.get(match.userId);
      if (feedback === 'HELPFUL') {
        aiScore += 10;
        reasons.push('Previously bookmarked as helpful');
      }

      // Strong reciprocal skill overlap
      if (match.theyCanTeachYou.length >= 2 || match.youCanTeachThem.length >= 2) {
        aiScore += 8;
        reasons.push('Multi-skill reciprocal exchange');
      }

      // Availability overlap
      if (match.matchingDays.length >= 3) {
        aiScore += 7;
        reasons.push(`High calendar synergy (${match.matchingDays.length} shared days)`);
      } else if (match.matchingDays.length > 0) {
        reasons.push(`Shared availability on ${match.matchingDays.slice(0, 2).join(', ')}`);
      }

      // Reputation / Experience
      if (match.user.totalReviews >= 3 && match.user.averageRating >= 4.5) {
        aiScore += 5;
        reasons.push('Top-rated verified community mentor');
      } else if (match.user.completedSessions === 0) {
        // Cold-start boost: give enthusiastic new members fair visibility
        aiScore += 4;
        reasons.push('New active member ready to swap');
      }

      // Priority matching tier boost
      const tier = userTierMap.get(match.userId) || 'FREE';
      if (tier === 'PREMIUM') {
        aiScore += 5;
      } else if (tier === 'PRO') {
        aiScore += 3;
      }

      const finalScore = Math.min(100, Math.max(1, Math.round(aiScore)));
      const reasonSummary = reasons.length > 0
        ? reasons.join(' • ')
        : `Strong reciprocal exchange for ${match.theyCanTeachYou[0]} and ${match.youCanTeachThem[0]}`;

      return {
        id: match.id,
        userId: match.userId,
        user: {
          ...match.user,
          subscriptionTier: tier,
        },
        compatibilityScore: match.compatibilityScore,
        aiConfidenceScore: finalScore,
        isReciprocal: true,
        theyCanTeachYou: match.theyCanTeachYou,
        youCanTeachThem: match.youCanTeachThem,
        matchingDays: match.matchingDays,
        recommendationReason: reasonSummary,
        explanation: match.explanation,
        feedback: feedback || null,
      };
    });

    // 6. Sort by AI Confidence Score descending, breaking ties with newest active members
    enhanced.sort((a, b) => (b.aiConfidenceScore - a.aiConfidenceScore) || (b.userId - a.userId));

    // Filter by minScore
    const filtered = enhanced.filter((item) => item.aiConfidenceScore >= minScore);

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    // Record AI usage
    const provider = getAIProvider();
    await aiUsageRepository.recordUsage({
      userId,
      feature: 'RECOMMENDATION',
      provider: provider.name,
      promptTokens: 40,
      completionTokens: 80,
      durationMs: Date.now() - start,
      success: true,
    }).catch(() => {});

    return {
      recommendations: paginated,
      total,
      page,
      totalPages,
    };
  }

  async submitFeedback(userId: number, recommendedUserId: number, feedbackType: string, reason?: string) {
    return feedbackRepository.recordFeedback({
      userId,
      recommendedUserId,
      feedbackType,
      reason,
    });
  }
}

export const recommendationService = new RecommendationService();

