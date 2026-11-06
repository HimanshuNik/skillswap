import { db } from '../prisma/db.js';

export interface SkillAliasRecord {
  id: number;
  alias: string;
  canonicalSkillId: number;
  similarityScore: number;
  relationshipType: string;
  isApproved: boolean;
  createdAt: string;
  canonicalSkill?: {
    id: number;
    name: string;
    category: string;
  };
}

export class SkillAliasRepository {
  async findByAlias(alias: string, client: any = db): Promise<SkillAliasRecord | null> {
    const record = await client.orm.public.SkillAlias.where({ alias }).first();
    if (!record) return null;

    const canonical = await client.orm.public.Skill.where({ id: record.canonicalSkillId }).first();
    return {
      ...(record as unknown as SkillAliasRecord),
      canonicalSkill: canonical ? {
        id: canonical.id,
        name: canonical.name,
        category: canonical.category,
      } : undefined,
    };
  }

  async findAliasesForSkill(skillId: number, client: any = db): Promise<SkillAliasRecord[]> {
    const records = await client.orm.public.SkillAlias.where({ canonicalSkillId: skillId }).all();
    return records as unknown as SkillAliasRecord[];
  }

  async createAlias(
    data: {
      alias: string;
      canonicalSkillId: number;
      similarityScore?: number;
      relationshipType?: string;
      isApproved?: boolean;
    },
    client: any = db
  ): Promise<SkillAliasRecord> {
    const record = await client.orm.public.SkillAlias.create({
      alias: data.alias,
      canonicalSkillId: data.canonicalSkillId,
      similarityScore: data.similarityScore ?? 1.0,
      relationshipType: data.relationshipType ?? 'ALIAS',
      isApproved: data.isApproved ?? true,
    });
    return record as unknown as SkillAliasRecord;
  }

  async resolveCanonicalSkill(skillName: string, client: any = db): Promise<{ id: number; name: string; category: string } | null> {
    const cleanName = skillName.trim();

    // 1. Check exact canonical skill catalog
    const exact = await client.orm.public.Skill.where({ name: cleanName }).first();
    if (exact && !exact.isDisabled) {
      // If this exact name was registered as an alias pointing to a distinct canonical skill (e.g. "React.js" -> "React")
      const aliasRecord = await this.findByAlias(cleanName, client);
      if (aliasRecord && aliasRecord.isApproved && aliasRecord.relationshipType === 'ALIAS' && aliasRecord.canonicalSkill && aliasRecord.canonicalSkill.id !== exact.id) {
        return aliasRecord.canonicalSkill;
      }
      return { id: exact.id, name: exact.name, category: exact.category };
    }

    // 2. Check approved aliases
    const aliasRecord = await this.findByAlias(cleanName, client);
    if (aliasRecord && aliasRecord.isApproved && aliasRecord.relationshipType === 'ALIAS' && aliasRecord.canonicalSkill) {
      return aliasRecord.canonicalSkill;
    }

    // 3. Case-insensitive lookup across canonical skills
    const allSkills = await client.orm.public.Skill.all();
    const lower = cleanName.toLowerCase();
    const matched = allSkills.find((s: any) => s.name.toLowerCase() === lower && !s.isDisabled);
    if (matched) {
      return { id: matched.id, name: matched.name, category: matched.category };
    }

    // 4. Case-insensitive lookup across aliases
    const allAliases = await client.orm.public.SkillAlias.all();
    const matchedAlias = allAliases.find((a: any) => a.alias.toLowerCase() === lower && a.isApproved && a.relationshipType === 'ALIAS');
    if (matchedAlias) {
      const canonical = await client.orm.public.Skill.where({ id: matchedAlias.canonicalSkillId }).first();
      if (canonical && !canonical.isDisabled) {
        return { id: canonical.id, name: canonical.name, category: canonical.category };
      }
    }

    return null;
  }
}

export const skillAliasRepository = new SkillAliasRepository();

