import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupTaskRecord {
  id: number;
  groupId: number;
  creatorId: number;
  assigneeId: number | null;
  title: string;
  description: string | null;
  status: string; // TODO, IN_PROGRESS, COMPLETED
  priority: string; // LOW, MEDIUM, HIGH, URGENT
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupTaskWithUsers extends GroupTaskRecord {
  creator: AuthorSummary;
  assignee: AuthorSummary | null;
}

export class GroupTaskRepository {
  async create(data: {
    groupId: number;
    creatorId: number;
    assigneeId?: number | null;
    title: string;
    description?: string | null;
    status?: string;
    priority?: string;
    dueDate?: string | null;
  }): Promise<GroupTaskRecord> {
    const task = await db.orm.public.GroupTask.create({
      groupId: data.groupId,
      creatorId: data.creatorId,
      assigneeId: data.assigneeId ?? null,
      title: data.title,
      description: data.description ?? null,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      dueDate: data.dueDate ?? null,
      completedAt: null,
    });

    return task as unknown as GroupTaskRecord;
  }

  async findById(id: number): Promise<GroupTaskRecord | null> {
    const task = await db.orm.public.GroupTask.where({ id }).first();
    return (task as unknown as GroupTaskRecord) || null;
  }

  async findByGroup(
    groupId: number,
    options?: { status?: string; assigneeId?: number }
  ): Promise<GroupTaskRecord[]> {
    let list = (await db.orm.public.GroupTask.where({
      groupId,
    }).all()) as unknown as GroupTaskRecord[];

    if (options?.status) {
      list = list.filter((t) => t.status === options.status);
    }

    if (options?.assigneeId !== undefined) {
      list = list.filter((t) => t.assigneeId === options.assigneeId);
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      assigneeId: number | null;
      status: string;
      priority: string;
      dueDate: string | null;
      completedAt: string | null;
    }>
  ): Promise<GroupTaskRecord | null> {
    const updated = await db.orm.public.GroupTask.where({ id }).update(data);
    return (updated as unknown as GroupTaskRecord) || null;
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupTask.where({ id }).delete();
    return true;
  }

  async enrichWithUsers(task: GroupTaskRecord): Promise<GroupTaskWithUsers> {
    const creator = await userRepository.findById(task.creatorId);
    const assignee = task.assigneeId ? await userRepository.findById(task.assigneeId) : null;

    return {
      ...task,
      creator: {
        id: creator?.id || task.creatorId,
        name: creator?.name || 'Creator',
        username: creator?.username || 'creator',
        avatarUrl: creator?.avatarUrl || null,
      },
      assignee: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            username: assignee.username,
            avatarUrl: assignee.avatarUrl,
          }
        : null,
    };
  }
}

export const groupTaskRepository = new GroupTaskRepository();

