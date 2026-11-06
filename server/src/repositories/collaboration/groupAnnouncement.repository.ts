import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupAnnouncementRecord {
  id: number;
  groupId: number;
  authorId: number;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupAnnouncementWithAuthor extends GroupAnnouncementRecord {
  author: AuthorSummary;
}

export class GroupAnnouncementRepository {
  async create(data: {
    groupId: number;
    authorId: number;
    title: string;
    content: string;
    isPinned?: boolean;
  }): Promise<GroupAnnouncementRecord> {
    const ann = await db.orm.public.GroupAnnouncement.create({
      groupId: data.groupId,
      authorId: data.authorId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned || false,
    });

    return ann as unknown as GroupAnnouncementRecord;
  }

  async findById(id: number): Promise<GroupAnnouncementRecord | null> {
    const ann = await db.orm.public.GroupAnnouncement.where({ id }).first();
    return (ann as unknown as GroupAnnouncementRecord) || null;
  }

  async findByGroup(groupId: number): Promise<GroupAnnouncementRecord[]> {
    const list = (await db.orm.public.GroupAnnouncement.where({
      groupId,
    }).all()) as unknown as GroupAnnouncementRecord[];

    return list.sort((a, b) => {
      // Pinned first, then newest
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      content: string;
      isPinned: boolean;
    }>
  ): Promise<GroupAnnouncementRecord | null> {
    const updated = await db.orm.public.GroupAnnouncement.where({ id }).update(data);
    return (updated as unknown as GroupAnnouncementRecord) || null;
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupAnnouncement.where({ id }).delete();
    return true;
  }

  async enrichWithAuthor(ann: GroupAnnouncementRecord): Promise<GroupAnnouncementWithAuthor> {
    const author = await userRepository.findById(ann.authorId);
    return {
      ...ann,
      author: {
        id: author?.id || ann.authorId,
        name: author?.name || 'Moderator',
        username: author?.username || 'moderator',
        avatarUrl: author?.avatarUrl || null,
      },
    };
  }
}

export const groupAnnouncementRepository = new GroupAnnouncementRepository();

