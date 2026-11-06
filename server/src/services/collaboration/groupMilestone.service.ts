import {
  groupMilestoneRepository,
  type GroupMilestoneRecord,
  type GroupMilestoneWithCreator,
} from '../../repositories/collaboration/groupMilestone.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors.js';

export class GroupMilestoneService {
  async createMilestone(
    groupId: number,
    creatorId: number,
    data: {
      title: string;
      description?: string | null;
      targetDate?: string | null;
    }
  ): Promise<GroupMilestoneRecord> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, creatorId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can create milestones');
    }

    return groupMilestoneRepository.create({
      groupId,
      creatorId,
      title: data.title,
      description: data.description,
      targetDate: data.targetDate,
      status: 'TODO',
    });
  }

  async listMilestones(groupId: number, userId?: number): Promise<GroupMilestoneWithCreator[]> {
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
        throw new ForbiddenError('You are not authorized to view milestones in this private group');
      }
    }

    const list = await groupMilestoneRepository.findByGroup(groupId);
    const results: GroupMilestoneWithCreator[] = [];
    for (const m of list) {
      results.push(await groupMilestoneRepository.enrichWithCreator(m));
    }
    return results;
  }

  async updateMilestone(
    groupId: number,
    milestoneId: number,
    userId: number,
    data: {
      title?: string;
      description?: string | null;
      targetDate?: string | null;
      status?: string;
      isVerified?: boolean;
    }
  ): Promise<GroupMilestoneRecord> {
    const milestone = await groupMilestoneRepository.findById(milestoneId);
    if (!milestone || milestone.groupId !== groupId) {
      throw new NotFoundError('Group milestone not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can modify milestones');
    }

    let completedAt = milestone.completedAt;
    if (data.status === 'ACHIEVED' && milestone.status !== 'ACHIEVED') {
      completedAt = new Date().toISOString();
    } else if (data.status && data.status !== 'ACHIEVED') {
      completedAt = null;
    }

    const updated = await groupMilestoneRepository.update(milestoneId, {
      ...data,
      completedAt,
    });

    if (!updated) {
      throw new NotFoundError('Failed to update milestone');
    }

    return updated;
  }

  async deleteMilestone(groupId: number, milestoneId: number, userId: number): Promise<boolean> {
    const milestone = await groupMilestoneRepository.findById(milestoneId);
    if (!milestone || milestone.groupId !== groupId) {
      throw new NotFoundError('Milestone not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can delete milestones');
    }

    return groupMilestoneRepository.delete(milestoneId);
  }
}

export const groupMilestoneService = new GroupMilestoneService();

