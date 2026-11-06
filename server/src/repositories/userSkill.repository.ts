import { db } from '../prisma/db.js';
import { skillRepository, type SkillRecord } from './skill.repository.js';

export interface UserTeachingSkillWithSkill {
  id: number;
  userId: number;
  skillId: number;
  proficiencyLevel: string;
  skill: SkillRecord;
}

export interface UserLearningSkillWithSkill {
  id: number;
  userId: number;
  skillId: number;
  targetLevel: string;
  skill: SkillRecord;
}

export class UserSkillRepository {
  // ---- Teaching Skills ----

  async findTeachingSkillsByUser(
    userId: number,
    client: any = db
  ): Promise<UserTeachingSkillWithSkill[]> {
    const records = await client.orm.public.UserTeachingSkill.where({ userId }).all();
    if (!records || records.length === 0) return [];

    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map<number, SkillRecord>(allSkills.map((s) => [s.id, s]));

    return (records as any[]).map((r) => ({
      id: r.id,
      userId: r.userId,
      skillId: r.skillId,
      proficiencyLevel: r.proficiencyLevel,
      skill: skillMap.get(r.skillId) || {
        id: r.skillId,
        name: 'Unknown',
        category: 'General',
        createdAt: '',
      },
    }));
  }

  async findTeachingSkill(
    userId: number,
    skillId: number,
    client: any = db
  ): Promise<any | null> {
    const record = await client.orm.public.UserTeachingSkill
      .where({ userId, skillId })
      .first();
    return record || null;
  }

  async addTeachingSkill(
    userId: number,
    skillId: number,
    proficiencyLevel: string,
    client: any = db
  ): Promise<any> {
    return client.orm.public.UserTeachingSkill.create({
      userId,
      skillId,
      proficiencyLevel,
    });
  }

  async removeTeachingSkill(
    userId: number,
    skillId: number,
    client: any = db
  ): Promise<boolean> {
    const existing = await this.findTeachingSkill(userId, skillId, client);
    if (!existing) return false;

    await client.orm.public.UserTeachingSkill.where({ id: existing.id }).delete();
    return true;
  }

  async clearTeachingSkills(userId: number, client: any = db): Promise<void> {
    const existing = await client.orm.public.UserTeachingSkill.where({ userId }).all();
    for (const r of existing as any[]) {
      await client.orm.public.UserTeachingSkill.where({ id: r.id }).delete();
    }
  }

  // ---- Learning Skills ----

  async findLearningSkillsByUser(
    userId: number,
    client: any = db
  ): Promise<UserLearningSkillWithSkill[]> {
    const records = await client.orm.public.UserLearningSkill.where({ userId }).all();
    if (!records || records.length === 0) return [];

    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map<number, SkillRecord>(allSkills.map((s) => [s.id, s]));

    return (records as any[]).map((r) => ({
      id: r.id,
      userId: r.userId,
      skillId: r.skillId,
      targetLevel: r.targetLevel,
      skill: skillMap.get(r.skillId) || {
        id: r.skillId,
        name: 'Unknown',
        category: 'General',
        createdAt: '',
      },
    }));
  }

  async findLearningSkill(
    userId: number,
    skillId: number,
    client: any = db
  ): Promise<any | null> {
    const record = await client.orm.public.UserLearningSkill
      .where({ userId, skillId })
      .first();
    return record || null;
  }

  async addLearningSkill(
    userId: number,
    skillId: number,
    targetLevel: string,
    client: any = db
  ): Promise<any> {
    return client.orm.public.UserLearningSkill.create({
      userId,
      skillId,
      targetLevel,
    });
  }

  async removeLearningSkill(
    userId: number,
    skillId: number,
    client: any = db
  ): Promise<boolean> {
    const existing = await this.findLearningSkill(userId, skillId, client);
    if (!existing) return false;

    await client.orm.public.UserLearningSkill.where({ id: existing.id }).delete();
    return true;
  }

  async clearLearningSkills(userId: number, client: any = db): Promise<void> {
    const existing = await client.orm.public.UserLearningSkill.where({ userId }).all();
    for (const r of existing as any[]) {
      await client.orm.public.UserLearningSkill.where({ id: r.id }).delete();
    }
  }
}

export const userSkillRepository = new UserSkillRepository();
