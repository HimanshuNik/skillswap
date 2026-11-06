import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupMilestoneRecord {
  id: number;
  groupId: number;
  creatorId: number;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string; // TODO, IN_PROGRESS, ACHIEVED
  isVerified: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMilestoneWithCreator extends GroupMilestoneRecord {
  creator: AuthorSummary;
}

export class GroupMilestoneRepository {
  async create(data: {
    groupId: number;
    creatorId: number;
    title: string;
    description?: string | null;
    targetDate?: string | null;
    status?: string;
  }): Promise<GroupMilestoneRecord> {
    const milestone = await db.orm.public.GroupMilestone.create({
      groupId: data.groupId,
      creatorId: data.creatorId,
      title: data.title,
      description: data.description ?? null,
      targetDate: data.targetDate ?? null,
      status: data.status || 'TODO',
      isVerified: false,
      completedAt: null,
    });

    return milestone as unknown as GroupMilestoneRecord;
  }

  async findById(id: number): Promise<GroupMilestoneRecord | null> {
    const m = await db.orm.public.GroupMilestone.where({ id }).first();
    return (m as unknown as GroupMilestoneRecord) || null;
  }

  async findByGroup(groupId: number): Promise<GroupMilestoneRecord[]> {
    const list = (await db.orm.public.GroupMilestone.where({
      groupId,
    }).all()) as unknown as GroupMilestoneRecord[];

    return list.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      targetDate: string | null;
      status: string;
      isVerified: boolean;
      completedAt: string | null;
    }>
  ): Promise<GroupMilestoneRecord | null> {
    const updated = await db.orm.public.GroupMilestone.where({ id }).update(data);
    return (updated as unknown as GroupMilestoneRecord) || null;
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupMilestone.where({ id }).delete();
    return true;
  }

  async enrichWithCreator(m: GroupMilestoneRecord): Promise<GroupMilestoneWithCreator> {
    const creator = await userRepository.findById(m.creatorId);
    return {
      ...m,
      creator: {
        id: creator?.id || m.creatorId,
        name: creator?.name || 'Creator',
        username: creator?.username || 'creator',
        avatarUrl: creator?.avatarUrl || null,
      },
    };
  }
}

export const groupMilestoneRepository = new GroupMilestoneRepository();

