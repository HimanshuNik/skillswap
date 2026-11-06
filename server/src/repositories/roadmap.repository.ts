import { db } from '../prisma/db.js';
import type { RoadmapMilestoneItem } from '../services/ai/aiProvider.interface.js';

export interface LearningRoadmapRecord {
  id: number;
  userId: number;
  skillId: number | null;
  skillName: string;
  currentProficiency: string;
  targetProficiency: string;
  learningObjective: string;
  preferredPace: string;
  estimatedWeeks: number;
  status: string;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  milestones?: RoadmapMilestoneRecord[];
}

export interface RoadmapMilestoneRecord {
  id: number;
  roadmapId: number;
  orderIndex: number;
  title: string;
  description: string | null;
  topics: string[];
  practiceProjects: string[];
  suggestedSessionGoals: string[];
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class RoadmapRepository {
  async createRoadmap(
    data: {
      userId: number;
      skillId?: number | null;
      skillName: string;
      currentProficiency: string;
      targetProficiency: string;
      learningObjective: string;
      preferredPace?: string;
      estimatedWeeks?: number;
    },
    client: any = db
  ): Promise<LearningRoadmapRecord> {
    const record = await client.orm.public.LearningRoadmap.create({
      userId: data.userId,
      skillId: data.skillId ?? null,
      skillName: data.skillName,
      currentProficiency: data.currentProficiency,
      targetProficiency: data.targetProficiency,
      learningObjective: data.learningObjective,
      preferredPace: data.preferredPace ?? 'MODERATE',
      estimatedWeeks: data.estimatedWeeks ?? 8,
      status: 'ACTIVE',
      progressPercent: 0,
    });
    return record as unknown as LearningRoadmapRecord;
  }

  async createMilestones(
    roadmapId: number,
    milestones: RoadmapMilestoneItem[],
    client: any = db
  ): Promise<RoadmapMilestoneRecord[]> {
    const created: RoadmapMilestoneRecord[] = [];
    for (const m of milestones) {
      const record = await client.orm.public.RoadmapMilestone.create({
        roadmapId,
        orderIndex: m.orderIndex,
        title: m.title,
        description: m.description || null,
        topics: JSON.stringify(m.topics || []),
        practiceProjects: JSON.stringify(m.practiceProjects || []),
        suggestedSessionGoals: JSON.stringify(m.suggestedSessionGoals || []),
        isCompleted: false,
      });

      created.push({
        ...record,
        topics: m.topics,
        practiceProjects: m.practiceProjects,
        suggestedSessionGoals: m.suggestedSessionGoals,
      });
    }
    return created;
  }

  async getRoadmapById(id: number, client: any = db): Promise<LearningRoadmapRecord | null> {
    const roadmap = await client.orm.public.LearningRoadmap.where({ id }).first();
    if (!roadmap) return null;

    const rawMilestones = await client.orm.public.RoadmapMilestone.where({ roadmapId: id }).all();
    const milestones: RoadmapMilestoneRecord[] = (rawMilestones as any[])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((m) => ({
        id: m.id,
        roadmapId: m.roadmapId,
        orderIndex: m.orderIndex,
        title: m.title,
        description: m.description,
        topics: typeof m.topics === 'string' ? JSON.parse(m.topics) : m.topics || [],
        practiceProjects: typeof m.practiceProjects === 'string' ? JSON.parse(m.practiceProjects) : m.practiceProjects || [],
        suggestedSessionGoals: typeof m.suggestedSessionGoals === 'string' ? JSON.parse(m.suggestedSessionGoals) : m.suggestedSessionGoals || [],
        isCompleted: m.isCompleted,
        completedAt: m.completedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      }));

    return {
      ...(roadmap as unknown as LearningRoadmapRecord),
      milestones,
    };
  }

  async getUserRoadmaps(userId: number, status?: string, client: any = db): Promise<LearningRoadmapRecord[]> {
    let roadmaps = await client.orm.public.LearningRoadmap.where({ userId }).all();
    if (status && status !== 'ALL') {
      roadmaps = roadmaps.filter((r: any) => r.status === status);
    }
    roadmaps.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const result: LearningRoadmapRecord[] = [];
    for (const r of roadmaps) {
      const full = await this.getRoadmapById(r.id, client);
      if (full) result.push(full);
    }
    return result;
  }

  async updateMilestone(
    milestoneId: number,
    data: { isCompleted: boolean },
    client: any = db
  ): Promise<RoadmapMilestoneRecord | null> {
    const existing = await client.orm.public.RoadmapMilestone.where({ id: milestoneId }).first();
    if (!existing) return null;

    const completedAt = data.isCompleted ? new Date().toISOString() : null;
    await client.orm.public.RoadmapMilestone.where({ id: milestoneId }).update({
      isCompleted: data.isCompleted,
      completedAt,
    });

    // Recalculate roadmap progress percent
    await this.recalculateProgress(existing.roadmapId, client);

    const updated = await client.orm.public.RoadmapMilestone.where({ id: milestoneId }).first();
    return {
      ...updated,
      topics: typeof updated.topics === 'string' ? JSON.parse(updated.topics) : updated.topics,
      practiceProjects: typeof updated.practiceProjects === 'string' ? JSON.parse(updated.practiceProjects) : updated.practiceProjects,
      suggestedSessionGoals: typeof updated.suggestedSessionGoals === 'string' ? JSON.parse(updated.suggestedSessionGoals) : updated.suggestedSessionGoals,
    };
  }

  async recalculateProgress(roadmapId: number, client: any = db): Promise<number> {
    const milestones = await client.orm.public.RoadmapMilestone.where({ roadmapId }).all();
    if (milestones.length === 0) return 0;

    const completed = milestones.filter((m: any) => m.isCompleted).length;
    const progressPercent = Math.round((completed / milestones.length) * 100);

    const status = progressPercent === 100 ? 'COMPLETED' : 'ACTIVE';
    await client.orm.public.LearningRoadmap.where({ id: roadmapId }).update({
      progressPercent,
      status,
    });

    return progressPercent;
  }

  async deleteRoadmap(id: number, client: any = db): Promise<void> {
    // Cascade delete milestones then roadmap
    const milestones = await client.orm.public.RoadmapMilestone.where({ roadmapId: id }).all();
    for (const m of milestones) {
      await client.orm.public.RoadmapMilestone.where({ id: m.id }).delete();
    }
    await client.orm.public.LearningRoadmap.where({ id: id }).delete();
  }

  async updateRoadmapStatus(id: number, status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED', client: any = db): Promise<void> {
    await client.orm.public.LearningRoadmap.where({ id }).update({ status });
  }
}

export const roadmapRepository = new RoadmapRepository();

