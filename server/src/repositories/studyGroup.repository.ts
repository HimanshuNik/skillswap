import { db } from '../prisma/db.js';
import type { AuthorSummary, SkillSummary } from './communityPost.repository.js';

export interface StudyGroupRecord {
  id: number;
  name: string;
  slug: string;
  description: string;
  skillId: number | null;
  visibility: string; // PUBLIC, PRIVATE
  membershipRules: string | null;
  creatorId: number;
  memberCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudyGroupWithDetails extends StudyGroupRecord {
  creator: AuthorSummary;
  skill: SkillSummary | null;
  membership?: {
    isMember: boolean;
    role: 'OWNER' | 'MODERATOR' | 'MEMBER' | null;
    status: 'ACTIVE' | 'PENDING' | 'REJECTED' | null;
  };
}

export class StudyGroupRepository {
  async create(data: {
    name: string;
    slug: string;
    description: string;
    creatorId: number;
    skillId?: number | null;
    visibility?: string;
    membershipRules?: string | null;
  }): Promise<StudyGroupRecord> {
    const group = await db.orm.public.StudyGroup.create({
      name: data.name,
      slug: data.slug,
      description: data.description,
      creatorId: data.creatorId,
      skillId: data.skillId || null,
      visibility: data.visibility || 'PUBLIC',
      membershipRules: data.membershipRules || null,
      memberCount: 1, // creator is first member
      isArchived: false,
    });

    return group as unknown as StudyGroupRecord;
  }

  async findById(id: number): Promise<StudyGroupRecord | null> {
    const group = await db.orm.public.StudyGroup.where({ id }).first();
    return group as unknown as StudyGroupRecord | null;
  }

  async findBySlug(slug: string): Promise<StudyGroupRecord | null> {
    const group = await db.orm.public.StudyGroup.where({ slug }).first();
    return group as unknown as StudyGroupRecord | null;
  }

  async findMany(filters: {
    skillId?: number;
    visibility?: string;
    search?: string;
    isArchived?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ groups: StudyGroupRecord[]; total: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(50, filters.limit || 20));

    let allGroups = (await db.orm.public.StudyGroup.all()) as unknown as StudyGroupRecord[];

    // Default: unarchived
    if (filters.isArchived !== undefined) {
      allGroups = allGroups.filter((g) => g.isArchived === filters.isArchived);
    } else {
      allGroups = allGroups.filter((g) => !g.isArchived);
    }

    // Visibility filter
    if (filters.visibility && filters.visibility !== 'ALL') {
      allGroups = allGroups.filter((g) => g.visibility === filters.visibility);
    }

    // Skill filter
    if (filters.skillId !== undefined) {
      allGroups = allGroups.filter((g) => g.skillId === filters.skillId);
    }

    // Search filter
    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.toLowerCase().trim();
      allGroups = allGroups.filter(
        (g) => g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      );
    }

    const total = allGroups.length;

    // Sort by memberCount descending, then recent
    allGroups.sort((a, b) => {
      if (b.memberCount !== a.memberCount) {
        return b.memberCount - a.memberCount;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const startIndex = (page - 1) * limit;
    const paginatedGroups = allGroups.slice(startIndex, startIndex + limit);

    return { groups: paginatedGroups, total };
  }

  async update(id: number, data: Partial<StudyGroupRecord>): Promise<StudyGroupRecord | null> {
    const updated = await db.orm.public.StudyGroup.where({ id }).update({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.skillId !== undefined && { skillId: data.skillId }),
      ...(data.visibility !== undefined && { visibility: data.visibility }),
      ...(data.membershipRules !== undefined && { membershipRules: data.membershipRules }),
      ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      ...(data.memberCount !== undefined && { memberCount: data.memberCount }),
    });

    return (updated as unknown as StudyGroupRecord) || null;
  }

  async incrementMemberCount(id: number, delta: number): Promise<void> {
    const group = await this.findById(id);
    if (!group) return;
    const newCount = Math.max(0, group.memberCount + delta);
    await db.orm.public.StudyGroup.where({ id }).update({ memberCount: newCount });
  }

  async delete(id: number): Promise<void> {
    await db.orm.public.StudyGroup.where({ id }).delete();
  }

  async populateDetails(
    groups: StudyGroupRecord[],
    currentUserId?: number
  ): Promise<StudyGroupWithDetails[]> {
    if (groups.length === 0) return [];

    const creatorIds = [...new Set(groups.map((g) => g.creatorId))];
    const skillIds = [...new Set(groups.map((g) => g.skillId).filter((id): id is number => id !== null))];
    const groupIds = groups.map((g) => g.id);

    const [allUsers, allSkills, userMemberships] = await Promise.all([
      db.orm.public.User.all(),
      skillIds.length > 0 ? db.orm.public.Skill.all() : Promise.resolve([]),
      currentUserId
        ? db.orm.public.StudyGroupMember.where({ userId: currentUserId }).all()
        : Promise.resolve([]),
    ]);

    const userMap = new Map(
      (allUsers as any[]).map((u) => [
        u.id,
        { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl || null },
      ])
    );

    const skillMap = new Map(
      (allSkills as any[]).map((s) => [
        s.id,
        { id: s.id, name: s.name, category: s.category },
      ])
    );

    const membershipMap = new Map(
      (userMemberships as any[]).map((m) => [
        m.groupId,
        {
          isMember: m.status === 'ACTIVE',
          role: m.role as 'OWNER' | 'MODERATOR' | 'MEMBER',
          status: m.status as 'ACTIVE' | 'PENDING' | 'REJECTED',
        },
      ])
    );

    return groups.map((group) => {
      const creator = userMap.get(group.creatorId) || {
        id: group.creatorId,
        name: 'Group Creator',
        username: `user_${group.creatorId}`,
        avatarUrl: null,
      };

      const skill = group.skillId ? skillMap.get(group.skillId) || null : null;
      const membership = currentUserId ? membershipMap.get(group.id) || {
        isMember: false,
        role: null,
        status: null,
      } : undefined;

      return {
        ...group,
        creator,
        skill,
        membership,
      };
    });
  }
}

export const studyGroupRepository = new StudyGroupRepository();
