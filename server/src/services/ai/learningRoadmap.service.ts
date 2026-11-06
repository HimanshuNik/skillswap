import { roadmapRepository, type LearningRoadmapRecord, type RoadmapMilestoneRecord } from '../../repositories/roadmap.repository.js';
import { skillAliasRepository } from '../../repositories/skillAlias.repository.js';
import { aiUsageRepository } from '../../repositories/aiUsage.repository.js';
import { getAIProvider } from './aiProvider.factory.js';
import { db } from '../../prisma/db.js';
import { ForbiddenError, NotFoundError, BadRequestError } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';
import { gamificationService } from '../gamification/gamification.service.js';

export interface CreateRoadmapDTO {
  skillName: string;
  currentProficiency: 'Beginner' | 'Intermediate' | 'Advanced';
  targetProficiency: 'Intermediate' | 'Advanced' | 'Expert';
  learningObjective: string;
  preferredPace?: 'INTENSIVE' | 'MODERATE' | 'CASUAL';
}

export class LearningRoadmapService {
  async createRoadmap(userId: number, dto: CreateRoadmapDTO): Promise<LearningRoadmapRecord> {
    const cleanSkill = dto.skillName?.trim();
    if (!cleanSkill) {
      throw new BadRequestError('skillName is required');
    }

    const canonicalSkill = await skillAliasRepository.resolveCanonicalSkill(cleanSkill);
    const skillName = canonicalSkill ? canonicalSkill.name : cleanSkill;
    const skillId = canonicalSkill ? canonicalSkill.id : null;

    const provider = getAIProvider();
    const { roadmap: plan, usage } = await provider.generateLearningRoadmap(
      skillName,
      dto.currentProficiency,
      dto.targetProficiency,
      dto.learningObjective,
      dto.preferredPace || 'MODERATE'
    );

    // Save roadmap in DB
    const roadmap = await roadmapRepository.createRoadmap({
      userId,
      skillId,
      skillName,
      currentProficiency: dto.currentProficiency,
      targetProficiency: dto.targetProficiency,
      learningObjective: dto.learningObjective,
      preferredPace: dto.preferredPace || 'MODERATE',
      estimatedWeeks: plan.estimatedWeeks || 8,
    });

    // Save generated milestones in DB
    const milestones = await roadmapRepository.createMilestones(roadmap.id, plan.milestones);

    // Record usage
    await aiUsageRepository.recordUsage({
      userId,
      feature: 'ROADMAP_GEN',
      provider: usage.provider,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      durationMs: usage.durationMs,
      success: true,
    }).catch(() => {});

    return {
      ...roadmap,
      milestones,
    };
  }

  async getRoadmap(userId: number, roadmapId: number): Promise<LearningRoadmapRecord & { suggestedPartners: any[] }> {
    const roadmap = await roadmapRepository.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError('Learning roadmap not found');
    }

    if (roadmap.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view this roadmap');
    }

    // Find relevant community members who teach this skill
    let suggestedPartners: any[] = [];
    const matchingSkills = await db.orm.public.Skill.where({ name: roadmap.skillName }).all();
    const skillIds = new Set<number>();
    if (roadmap.skillId) skillIds.add(roadmap.skillId);
    for (const sk of matchingSkills as any[]) {
      skillIds.add(sk.id);
    }

    if (skillIds.size > 0) {
      const allTeachers = await db.orm.public.UserTeachingSkill.all();
      const userIds = Array.from(
        new Set(
          (allTeachers as any[])
            .filter((t) => skillIds.has(t.skillId) && t.userId !== userId)
            .map((t) => t.userId)
        )
      );

      if (userIds.length > 0) {
        const allUsers = await db.orm.public.User.all();
        suggestedPartners = (allUsers as any[])
          .filter((u) => userIds.includes(u.id) && u.isOnboarded && u.isActive !== false)
          .sort((a, b) => b.id - a.id)
          .map((u) => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl,
            averageRating: u.averageRating,
            totalReviews: u.totalReviews,
          }))
          .slice(0, 10);
      }
    }

    return {
      ...roadmap,
      suggestedPartners,
    };
  }

  async getUserRoadmaps(userId: number, status?: string): Promise<LearningRoadmapRecord[]> {
    return roadmapRepository.getUserRoadmaps(userId, status);
  }

  async updateMilestone(
    userId: number,
    roadmapId: number,
    milestoneId: number,
    isCompleted: boolean
  ): Promise<RoadmapMilestoneRecord> {
    const roadmap = await roadmapRepository.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError('Roadmap not found');
    }
    if (roadmap.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this roadmap');
    }

    const milestone = await roadmapRepository.updateMilestone(milestoneId, { isCompleted });
    if (!milestone) {
      throw new NotFoundError('Milestone not found');
    }

    if (isCompleted) {
      try {
        const refreshed = await roadmapRepository.getRoadmapById(roadmapId);
        await gamificationService.onMilestoneCompleted({
          userId,
          roadmapId,
          milestoneId,
          isRoadmapFinished: refreshed?.progressPercent === 100,
        });
      } catch (err: any) {
        logger.warn(`Failed to process gamification milestone completion: ${err.message}`);
      }
    }

    return milestone;
  }

  async deleteRoadmap(userId: number, roadmapId: number): Promise<void> {
    const roadmap = await roadmapRepository.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError('Roadmap not found');
    }
    if (roadmap.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this roadmap');
    }

    await roadmapRepository.deleteRoadmap(roadmapId);
  }

  async archiveRoadmap(userId: number, roadmapId: number): Promise<void> {
    const roadmap = await roadmapRepository.getRoadmapById(roadmapId);
    if (!roadmap) {
      throw new NotFoundError('Roadmap not found');
    }
    if (roadmap.userId !== userId) {
      throw new ForbiddenError('You do not have permission to archive this roadmap');
    }

    await roadmapRepository.updateRoadmapStatus(roadmapId, 'ARCHIVED');
  }
}

export const learningRoadmapService = new LearningRoadmapService();

