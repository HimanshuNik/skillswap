import { db } from '../../prisma/db.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { groupSessionRepository } from '../../repositories/collaboration/groupSession.repository.js';
import { groupParticipantRepository } from '../../repositories/collaboration/groupParticipant.repository.js';
import { groupResourceRepository } from '../../repositories/collaboration/groupResource.repository.js';
import { groupTaskRepository } from '../../repositories/collaboration/groupTask.repository.js';
import { groupMilestoneRepository } from '../../repositories/collaboration/groupMilestone.repository.js';
import { groupMessageRepository } from '../../repositories/collaboration/groupMessage.repository.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors.js';

export interface GroupAnalyticsReport {
  groupId: number;
  groupName: string;
  totalMembers: number;
  scheduledSessions: number;
  completedSessions: number;
  totalSessions: number;
  verifiedAttendanceCount: number;
  sharedResourcesCount: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  totalMilestones: number;
  achievedMilestones: number;
  milestoneProgressRate: number;
  totalMessages: number;
}

export class GroupAnalyticsService {
  async getGroupAnalytics(groupId: number, userId?: number): Promise<GroupAnalyticsReport> {
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
        throw new ForbiddenError('You are not authorized to view analytics in this private group');
      }
    }

    // 1. Members
    const members = await studyGroupMemberRepository.findByGroup(groupId, 'ACTIVE');
    const totalMembers = members.length;

    // 2. Sessions & Verified Attendance
    const sessions = await groupSessionRepository.findByGroup(groupId);
    const scheduledSessions = sessions.filter(
      (s) => s.status === 'SCHEDULED' || s.status === 'LIVE'
    ).length;
    const completedSessions = sessions.filter((s) => s.status === 'COMPLETED').length;
    const totalSessions = sessions.length;

    let verifiedAttendanceCount = 0;
    for (const s of sessions) {
      const participants = await groupParticipantRepository.findBySession(s.id);
      verifiedAttendanceCount += participants.filter((p) => p.isVerifiedAttendance).length;
    }

    // 3. Resources
    const resources = await groupResourceRepository.findByGroup(groupId);
    const sharedResourcesCount = resources.length;

    // 4. Tasks
    const tasks = await groupTaskRepository.findByGroup(groupId);
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 5. Milestones
    const milestones = await groupMilestoneRepository.findByGroup(groupId);
    const totalMilestones = milestones.length;
    const achievedMilestones = milestones.filter((m) => m.status === 'ACHIEVED').length;
    const milestoneProgressRate =
      totalMilestones > 0 ? Math.round((achievedMilestones / totalMilestones) * 100) : 0;

    // 6. Messages
    const messages = await groupMessageRepository.findByGroup(groupId, { limit: 1000 });
    const totalMessages = messages.length;

    return {
      groupId,
      groupName: group.name,
      totalMembers,
      scheduledSessions,
      completedSessions,
      totalSessions,
      verifiedAttendanceCount,
      sharedResourcesCount,
      totalTasks,
      completedTasks,
      taskCompletionRate,
      totalMilestones,
      achievedMilestones,
      milestoneProgressRate,
      totalMessages,
    };
  }
}

export const groupAnalyticsService = new GroupAnalyticsService();

