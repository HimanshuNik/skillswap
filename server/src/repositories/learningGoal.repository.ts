import { db } from '../prisma/db.js';

export interface LearningGoalRecord {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  skillId: number | null;
  skillName: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: string; // IN_PROGRESS, COMPLETED, ARCHIVED
  deadline: string | null;
  completedAt: string | null;
  isAutomated: boolean;
  createdAt: string;
  updatedAt: string;
}

export class LearningGoalRepository {
  async createGoal(
    userId: number,
    data: {
      title: string;
      description?: string | null;
      skillId?: number | null;
      skillName?: string | null;
      goalType?: string;
      targetValue?: number;
      unit?: string;
      deadline?: string | null;
      isAutomated?: boolean;
    }
  ): Promise<LearningGoalRecord> {
    const created = await db.orm.public.LearningGoal.create({
      userId,
      title: data.title,
      description: data.description || null,
      skillId: data.skillId || null,
      skillName: data.skillName || null,
      goalType: data.goalType || 'SESSIONS_COUNT',
      targetValue: data.targetValue ?? 1,
      currentValue: 0,
      unit: data.unit || 'sessions',
      status: 'IN_PROGRESS',
      deadline: data.deadline || null,
      isAutomated: data.isAutomated ?? true,
    });

    return created as unknown as LearningGoalRecord;
  }

  async findById(id: number): Promise<LearningGoalRecord | null> {
    const goal = await db.orm.public.LearningGoal.where({ id }).first();
    return goal as unknown as LearningGoalRecord | null;
  }

  async findByUserId(userId: number, status?: string): Promise<LearningGoalRecord[]> {
    let records = (await db.orm.public.LearningGoal.where({ userId }).all()) as unknown as LearningGoalRecord[];
    if (status) {
      records = records.filter((r) => r.status === status);
    }
    return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateGoal(
    id: number,
    userId: number,
    data: Partial<{
      title: string;
      description: string | null;
      targetValue: number;
      currentValue: number;
      unit: string;
      status: string;
      deadline: string | null;
    }>
  ): Promise<LearningGoalRecord | null> {
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    const updates: any = { ...data };
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
    } else if (data.status && data.status !== 'COMPLETED') {
      updates.completedAt = null;
    }

    // Auto-complete if currentValue reaches targetValue
    if (
      updates.currentValue !== undefined &&
      updates.targetValue !== undefined &&
      updates.currentValue >= updates.targetValue &&
      existing.status === 'IN_PROGRESS'
    ) {
      updates.status = 'COMPLETED';
      updates.completedAt = new Date().toISOString();
    } else if (
      updates.currentValue !== undefined &&
      updates.currentValue >= existing.targetValue &&
      existing.status === 'IN_PROGRESS'
    ) {
      updates.status = 'COMPLETED';
      updates.completedAt = new Date().toISOString();
    }

    const updated = await db.orm.public.LearningGoal.where({ id }).update(updates);
    return updated as unknown as LearningGoalRecord;
  }

  async incrementProgress(
    id: number,
    userId: number,
    incrementBy: number = 1
  ): Promise<{ goal: LearningGoalRecord | null; justCompleted: boolean }> {
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return { goal: null, justCompleted: false };
    }

    const newCurrent = existing.currentValue + incrementBy;
    const isNowCompleted = newCurrent >= existing.targetValue && existing.status === 'IN_PROGRESS';
    const status = isNowCompleted ? 'COMPLETED' : existing.status;
    const completedAt = isNowCompleted ? new Date().toISOString() : existing.completedAt;

    const updated = await db.orm.public.LearningGoal.where({ id }).update({
      currentValue: newCurrent,
      status,
      completedAt,
    });

    return {
      goal: updated as unknown as LearningGoalRecord,
      justCompleted: isNowCompleted,
    };
  }

  async deleteGoal(id: number, userId: number): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }

    await db.orm.public.LearningGoal.where({ id }).delete();
    return true;
  }

  async countCompletedGoals(userId: number): Promise<number> {
    const list = await db.orm.public.LearningGoal.where({ userId, status: 'COMPLETED' }).all();
    return list.length;
  }
}

export const learningGoalRepository = new LearningGoalRepository();
