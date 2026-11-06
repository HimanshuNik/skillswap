import { db } from '../prisma/db.js';

export interface SkillRecord {
  id: number;
  name: string;
  category: string;
  description?: string | null;
  isDisabled?: boolean;
  createdAt: string;
}

export interface SkillWithStats extends SkillRecord {
  teachersCount: number;
  learnersCount: number;
  totalUsage: number;
}

export class SkillRepository {
  private cache: SkillRecord[] | null = null;
  private cacheExpiresAt: number = 0;
  private readonly ttlMs: number = 5 * 60 * 1000; // 5 minute TTL for static skills catalog

  /**
   * Clears the in-memory skills cache.
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiresAt = 0;
  }

  async findAll(category?: string, client: any = db): Promise<SkillRecord[]> {
    const now = Date.now();

    // Use cached catalog if requesting all skills without client transaction
    if (!category && client === db && this.cache && now < this.cacheExpiresAt) {
      return this.cache;
    }

    if (category) {
      const skills = await client.orm.public.Skill.where({ category }).all();
      return (skills as unknown as SkillRecord[])
        .filter((s) => !s.isDisabled)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const skills = await client.orm.public.Skill.all();
    const sorted = (skills as unknown as SkillRecord[])
      .filter((s) => !s.isDisabled)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (client === db) {
      this.cache = sorted;
      this.cacheExpiresAt = now + this.ttlMs;
    }

    return sorted;
  }

  async findAllAdmin(client: any = db): Promise<SkillRecord[]> {
    const skills = await client.orm.public.Skill.all();
    return (skills as unknown as SkillRecord[]).sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: number, client: any = db): Promise<SkillRecord | null> {
    if (this.cache && client === db && Date.now() < this.cacheExpiresAt) {
      const found = this.cache.find((s) => s.id === id);
      if (found) return found;
    }

    const skill = await client.orm.public.Skill.where({ id }).first();
    return skill as unknown as SkillRecord | null;
  }

  async findByName(name: string, client: any = db): Promise<SkillRecord | null> {
    const trimmed = name.trim();
    if (this.cache && client === db && Date.now() < this.cacheExpiresAt) {
      const found = this.cache.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
      if (found) return found;
    }

    const skill = await client.orm.public.Skill.where({ name: trimmed }).first();
    return skill as unknown as SkillRecord | null;
  }

  async findOrCreate(name: string, category = 'General', client: any = db): Promise<SkillRecord> {
    const trimmed = name.trim();
    const existing = await this.findByName(trimmed, client);
    if (existing) {
      return existing;
    }
    const created = await client.orm.public.Skill.create({
      name: trimmed,
      category,
      isDisabled: false,
      description: null,
    });

    this.clearCache();

    return created as unknown as SkillRecord;
  }

  async createSkill(data: {
    name: string;
    category: string;
    description?: string | null;
    isDisabled?: boolean;
  }, client: any = db): Promise<SkillRecord> {
    const created = await client.orm.public.Skill.create({
      name: data.name.trim(),
      category: data.category.trim(),
      description: data.description ?? null,
      isDisabled: data.isDisabled ?? false,
    });

    this.clearCache();
    return created as unknown as SkillRecord;
  }

  async updateSkill(
    id: number,
    data: {
      name?: string;
      category?: string;
      description?: string | null;
      isDisabled?: boolean;
    },
    client: any = db
  ): Promise<SkillRecord | null> {
    const payload: Record<string, any> = {};
    if (data.name !== undefined) payload.name = data.name.trim();
    if (data.category !== undefined) payload.category = data.category.trim();
    if (data.description !== undefined) payload.description = data.description;
    if (data.isDisabled !== undefined) payload.isDisabled = data.isDisabled;

    await client.orm.public.Skill.where({ id }).update(payload);
    this.clearCache();

    return this.findById(id, client);
  }

  async findCatalogWithStats(params?: {
    search?: string;
    category?: string;
    status?: string; // all, active, disabled
  }): Promise<SkillWithStats[]> {
    const allSkills = await this.findAllAdmin();
    const teachingSkills = (await db.orm.public.UserTeachingSkill.all()) as unknown as Array<{ skillId: number }>;
    const learningSkills = (await db.orm.public.UserLearningSkill.all()) as unknown as Array<{ skillId: number }>;

    const teachersCountMap = new Map<number, number>();
    for (const t of teachingSkills) {
      teachersCountMap.set(t.skillId, (teachersCountMap.get(t.skillId) || 0) + 1);
    }

    const learnersCountMap = new Map<number, number>();
    for (const l of learningSkills) {
      learnersCountMap.set(l.skillId, (learnersCountMap.get(l.skillId) || 0) + 1);
    }

    let result: SkillWithStats[] = allSkills.map((s) => {
      const teachersCount = teachersCountMap.get(s.id) || 0;
      const learnersCount = learnersCountMap.get(s.id) || 0;
      return {
        ...s,
        isDisabled: Boolean(s.isDisabled),
        teachersCount,
        learnersCount,
        totalUsage: teachersCount + learnersCount,
      };
    });

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
      );
    }

    if (params?.category && params.category !== 'all') {
      result = result.filter((s) => s.category === params.category);
    }

    if (params?.status && params.status !== 'all') {
      if (params.status === 'disabled') {
        result = result.filter((s) => s.isDisabled === true);
      } else if (params.status === 'active') {
        result = result.filter((s) => !s.isDisabled);
      }
    }

    return result.sort((a, b) => b.totalUsage - a.totalUsage || a.name.localeCompare(b.name));
  }
}

export const skillRepository = new SkillRepository();
