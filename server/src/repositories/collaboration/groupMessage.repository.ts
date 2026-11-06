import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupMessageRecord {
  id: number;
  groupId: number;
  senderId: number;
  content: string;
  isAnnouncement: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMessageWithSender extends GroupMessageRecord {
  sender: AuthorSummary;
}

export class GroupMessageRepository {
  async create(data: {
    groupId: number;
    senderId: number;
    content: string;
    isAnnouncement?: boolean;
  }): Promise<GroupMessageRecord> {
    const msg = await db.orm.public.GroupMessage.create({
      groupId: data.groupId,
      senderId: data.senderId,
      content: data.content,
      isAnnouncement: data.isAnnouncement || false,
      isDeleted: false,
    });

    return msg as unknown as GroupMessageRecord;
  }

  async findById(id: number): Promise<GroupMessageRecord | null> {
    const msg = await db.orm.public.GroupMessage.where({ id }).first();
    return (msg as unknown as GroupMessageRecord) || null;
  }

  async findByGroup(
    groupId: number,
    options?: { limit?: number; beforeId?: number }
  ): Promise<GroupMessageRecord[]> {
    const limit = options?.limit || 50;
    let list = (await db.orm.public.GroupMessage.where({
      groupId,
    }).all()) as unknown as GroupMessageRecord[];

    if (options?.beforeId) {
      list = list.filter((m) => m.id < options.beforeId!);
    }

    // Sort ascending by createdAt
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (list.length > limit) {
      list = list.slice(list.length - limit);
    }

    return list;
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupMessage.where({ id }).update({
      isDeleted: true,
      content: '[Message deleted]',
    });
    return true;
  }

  async enrichWithSenders(list: GroupMessageRecord[]): Promise<GroupMessageWithSender[]> {
    const results: GroupMessageWithSender[] = [];
    for (const msg of list) {
      const sender = await userRepository.findById(msg.senderId);
      results.push({
        ...msg,
        sender: {
          id: sender?.id || msg.senderId,
          name: sender?.name || 'Member',
          username: sender?.username || 'member',
          avatarUrl: sender?.avatarUrl || null,
        },
      });
    }
    return results;
  }
}

export const groupMessageRepository = new GroupMessageRepository();

