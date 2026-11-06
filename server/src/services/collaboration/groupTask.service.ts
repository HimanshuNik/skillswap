import {
  groupTaskRepository,
  type GroupTaskRecord,
  type GroupTaskWithUsers,
} from '../../repositories/collaboration/groupTask.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { notificationService } from '../notification.service.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../utils/errors.js';

export class GroupTaskService {
  async createTask(
    groupId: number,
    creatorId: number,
    data: {
      title: string;
      description?: string | null;
      assigneeId?: number | null;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string | null;
    }
  ): Promise<GroupTaskRecord> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, creatorId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active group member to create tasks');
    }

    if (data.assigneeId) {
      const assigneeMember = await studyGroupMemberRepository.findMember(groupId, data.assigneeId);
      if (!assigneeMember || assigneeMember.status !== 'ACTIVE') {
        throw new BadRequestError('Assignee must be an active member of this study group');
      }
    }

    const task = await groupTaskRepository.create({
      groupId,
      creatorId,
      assigneeId: data.assigneeId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
    });

    // Notify assignee if not the creator
    if (data.assigneeId && data.assigneeId !== creatorId) {
      await notificationService.createNotification({
        userId: data.assigneeId,
        type: 'GROUP_TASK_ASSIGNED',
        title: 'New Group Task Assigned',
        message: `You were assigned task "${data.title}" in ${group.name}.`,
        linkUrl: `/community/groups/${groupId}?tab=tasks`,
        relatedEntityType: 'GROUP_TASK',
        relatedEntityId: task.id,
      });
    }

    return task;
  }

  async listTasks(
    groupId: number,
    userId?: number,
    options?: { status?: string; assigneeId?: number }
  ): Promise<GroupTaskWithUsers[]> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    if (group.visibility === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenError('Authentication required');
      }
      const membership = await studyGroupMemberRepository.findMember(groupId, userId);
      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenError('You are not authorized to view tasks in this private group');
      }
    }

    const tasks = await groupTaskRepository.findByGroup(groupId, options);
    const results: GroupTaskWithUsers[] = [];
    for (const t of tasks) {
      results.push(await groupTaskRepository.enrichWithUsers(t));
    }
    return results;
  }

  async updateTask(
    groupId: number,
    taskId: number,
    userId: number,
    data: {
      title?: string;
      description?: string | null;
      assigneeId?: number | null;
      priority?: string;
      status?: string;
      dueDate?: string | null;
    }
  ): Promise<GroupTaskRecord> {
    const task = await groupTaskRepository.findById(taskId);
    if (!task || task.groupId !== groupId) {
      throw new NotFoundError('Group task not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active group member to update tasks');
    }

    const isOwnerOrMod = membership.role === 'OWNER' || membership.role === 'MODERATOR';
    const isCreator = task.creatorId === userId;
    const isAssignee = task.assigneeId === userId;

    if (!isOwnerOrMod && !isCreator && !isAssignee) {
      throw new ForbiddenError('You are not authorized to modify this task');
    }

    if (data.assigneeId !== undefined && data.assigneeId !== null) {
      const assigneeMember = await studyGroupMemberRepository.findMember(groupId, data.assigneeId);
      if (!assigneeMember || assigneeMember.status !== 'ACTIVE') {
        throw new BadRequestError('Assignee must be an active group member');
      }
    }

    let completedAt = task.completedAt;
    if (data.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      completedAt = new Date().toISOString();
    } else if (data.status && data.status !== 'COMPLETED') {
      completedAt = null;
    }

    const updated = await groupTaskRepository.update(taskId, {
      ...data,
      completedAt,
    });

    if (!updated) {
      throw new NotFoundError('Failed to update task');
    }

    return updated;
  }

  async deleteTask(groupId: number, taskId: number, userId: number): Promise<boolean> {
    const task = await groupTaskRepository.findById(taskId);
    if (!task || task.groupId !== groupId) {
      throw new NotFoundError('Group task not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    const isOwnerOrMod =
      membership &&
      membership.status === 'ACTIVE' &&
      (membership.role === 'OWNER' || membership.role === 'MODERATOR');

    if (task.creatorId !== userId && !isOwnerOrMod) {
      throw new ForbiddenError('Only the task creator or group moderators can delete this task');
    }

    return groupTaskRepository.delete(taskId);
  }
}

export const groupTaskService = new GroupTaskService();

