import type { Request, Response } from 'express';
import { recommendationService } from '../services/ai/recommendation.service.js';
import { learningRoadmapService } from '../services/ai/learningRoadmap.service.js';
import { smartSchedulingService } from '../services/ai/smartScheduling.service.js';
import { aiAssistantService } from '../services/ai/aiAssistant.service.js';
import { skillSimilarityService } from '../services/ai/skillSimilarity.service.js';
import { aiUsageRepository } from '../repositories/aiUsage.repository.js';
import { feedbackRepository } from '../repositories/feedback.repository.js';
import {
  roadmapCreateSchema,
  milestoneUpdateSchema,
  recommendationFeedbackSchema,
  assistantChatSchema,
  smartScheduleQuerySchema,
  similarityAnalyzeSchema,
} from '../validators/ai.validator.js';
import { BadRequestError } from '../utils/errors.js';

export const aiController = {
  /**
   * GET /api/ai/recommendations
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 10;
    const minScore = req.query['minScore'] ? parseInt(req.query['minScore'] as string, 10) : 40;

    const result = await recommendationService.getRecommendations(userId, {
      page,
      limit,
      minScore,
    });

    res.status(200).json({
      success: true,
      data: result.recommendations,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  },

  /**
   * POST /api/ai/recommendations/feedback
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const parsed = recommendationFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid feedback payload');
    }

    const record = await recommendationService.submitFeedback(
      userId,
      parsed.data.recommendedUserId,
      parsed.data.feedbackType,
      parsed.data.reason
    );

    res.status(200).json({
      success: true,
      data: record,
    });
  },

  /**
   * POST /api/ai/roadmaps
   */
  async createRoadmap(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const parsed = roadmapCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid roadmap payload');
    }

    const roadmap = await learningRoadmapService.createRoadmap(userId, parsed.data);
    res.status(201).json({
      success: true,
      data: roadmap,
    });
  },

  /**
   * GET /api/ai/roadmaps
   */
  async getUserRoadmaps(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const status = req.query['status'] as string | undefined;

    const roadmaps = await learningRoadmapService.getUserRoadmaps(userId, status);
    res.status(200).json({
      success: true,
      data: roadmaps,
    });
  },

  /**
   * GET /api/ai/roadmaps/:id
   */
  async getRoadmapById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roadmapId = parseInt(req.params['id'] as string, 10);
    if (isNaN(roadmapId)) {
      throw new BadRequestError('Invalid roadmap id');
    }

    const roadmap = await learningRoadmapService.getRoadmap(userId, roadmapId);
    res.status(200).json({
      success: true,
      data: roadmap,
    });
  },

  /**
   * PATCH /api/ai/roadmaps/:id/milestones/:milestoneId
   */
  async updateMilestone(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roadmapId = parseInt(req.params['id'] as string, 10);
    const milestoneId = parseInt(req.params['milestoneId'] as string, 10);

    if (isNaN(roadmapId) || isNaN(milestoneId)) {
      throw new BadRequestError('Invalid roadmap or milestone id');
    }

    const parsed = milestoneUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid milestone update payload');
    }

    const milestone = await learningRoadmapService.updateMilestone(
      userId,
      roadmapId,
      milestoneId,
      parsed.data.isCompleted
    );

    res.status(200).json({
      success: true,
      data: milestone,
    });
  },

  /**
   * DELETE /api/ai/roadmaps/:id
   */
  async deleteRoadmap(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const roadmapId = parseInt(req.params['id'] as string, 10);
    if (isNaN(roadmapId)) {
      throw new BadRequestError('Invalid roadmap id');
    }

    await learningRoadmapService.deleteRoadmap(userId, roadmapId);
    res.status(200).json({
      success: true,
      message: 'Roadmap deleted successfully',
    });
  },

  /**
   * GET /api/ai/scheduling/suggestions
   */
  async getSmartSchedulingSuggestions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const parsed = smartScheduleQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid scheduling query');
    }

    const { suggestions } = await smartSchedulingService.getSuggestions(
      userId,
      parsed.data.partnerId,
      parsed.data.durationMinutes
    );

    res.status(200).json({
      success: true,
      data: { suggestions },
    });
  },

  /**
   * POST /api/ai/assistant/chat
   */
  async chatWithAssistant(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const parsed = assistantChatSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid assistant chat query');
    }

    const reply = await aiAssistantService.askQuestion(userId, parsed.data.question);
    res.status(200).json({
      success: true,
      data: reply,
    });
  },

  /**
   * POST /api/ai/similarity
   */
  async analyzeSimilarity(req: Request, res: Response): Promise<void> {
    const parsed = similarityAnalyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid similarity query');
    }

    const analysis = await skillSimilarityService.analyzeSimilarity(
      parsed.data.skillA,
      parsed.data.skillB
    );

    res.status(200).json({
      success: true,
      data: analysis,
    });
  },

  /**
   * GET /api/admin/ai/overview
   */
  async getAdminAIOverview(_req: Request, res: Response): Promise<void> {
    const [usageAnalytics, feedbackCounts] = await Promise.all([
      aiUsageRepository.getPlatformAIAnalytics(),
      feedbackRepository.getFeedbackCounts(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        ...usageAnalytics,
        feedback: feedbackCounts,
      },
    });
  },
};

