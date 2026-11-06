import crypto from 'node:crypto';
import {
  groupSessionRepository,
  type GroupSessionRecord,
  type GroupSessionWithDetails,
} from '../../repositories/collaboration/groupSession.repository.js';
import { groupParticipantRepository } from '../../repositories/collaboration/groupParticipant.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { notificationService } from '../notification.service.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../utils/errors.js';

export class GroupSessionService {
  async scheduleSession(
    groupId: number,
    hostId: number,
    data: {
      title: string;
      description?: string | null;
      topic?: string | null;
      startTime: string;
      endTime: string;
      timezone?: string;
      maxParticipants?: number;
    }
  ): Promise<GroupSessionRecord> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    // Host must be an active member
    const membership = await studyGroupMemberRepository.findMember(groupId, hostId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active member of this group to schedule sessions');
    }

    // Role check: Only OWNER or MODERATOR can schedule sessions
    if (membership.role !== 'OWNER' && membership.role !== 'MODERATOR') {
      throw new ForbiddenError('Only group owners and moderators can schedule group sessions');
    }

    // Time validation
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestError('Invalid session start or end timestamp');
    }

    if (end.getTime() <= start.getTime()) {
      throw new BadRequestError('Session end time must be after start time');
    }

    if (start.getTime() < now.getTime() - 60 * 1000) {
      throw new BadRequestError('Cannot schedule a session starting in the past');
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    if (durationMinutes < 15) {
      throw new BadRequestError('Session duration must be at least 15 minutes');
    }
    if (durationMinutes > 480) {
      throw new BadRequestError('Session duration cannot exceed 8 hours');
    }

    // Generate unique Jitsi meeting room identifier
    const meetingRoomId = `skillswap-group-${crypto.randomUUID()}`;
    const meetingUrl = `https://meet.jit.si/${meetingRoomId}`;

    const session = await groupSessionRepository.create({
      groupId,
      hostId,
      title: data.title,
      description: data.description,
      topic: data.topic,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      timezone: data.timezone || 'UTC',
      maxParticipants: data.maxParticipants || 20,
      status: 'SCHEDULED',
      meetingRoomId,
      meetingUrl,
    });

    // Automatically register host as an approved participant
    await groupParticipantRepository.register({
      sessionId: session.id,
      userId: hostId,
      status: 'REGISTERED',
    });

    // Notify all active group members asynchronously
    this.notifyGroupMembersNewSession(groupId, session, hostId).catch(() => {});

    return session;
  }

  async getSessionById(
    groupId: number,
    sessionId: number,
    userId?: number
  ): Promise<GroupSessionWithDetails & { isHost: boolean; canJoinMeeting: boolean }> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const session = await groupSessionRepository.findById(sessionId);
    if (!session || session.groupId !== groupId) {
      throw new NotFoundError('Group session not found');
    }

    // Access control for private groups
    if (group.visibility === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenError('Authentication required to view private group sessions');
      }
      const membership = await studyGroupMemberRepository.findMember(groupId, userId);
      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenError('You are not authorized to view this private group session');
      }
    }

    const enriched = await groupSessionRepository.enrichWithHost(session);
    const participantCount = await groupParticipantRepository.countBySession(sessionId, 'REGISTERED');

    let userRegistered = false;
    if (userId) {
      const p = await groupParticipantRepository.findParticipant(sessionId, userId);
      userRegistered = !!p && p.status === 'REGISTERED';
    }

    // Calculate whether meeting can be joined:
    // Window: within 15 minutes prior to start until end
    const now = Date.now();
    const startMs = new Date(session.startTime).getTime();
    const endMs = new Date(session.endTime).getTime();
    const canJoinMeeting =
      (userRegistered || userId === session.hostId) &&
      session.status !== 'CANCELED' &&
      now >= startMs - 15 * 60 * 1000 &&
      now <= endMs + 30 * 60 * 1000;

    return {
      ...enriched,
      participantCount,
      userRegistered,
      isHost: userId === session.hostId,
      canJoinMeeting,
    };
  }

  async listGroupSessions(
    groupId: number,
    userId?: number,
    options?: { status?: string }
  ): Promise<GroupSessionWithDetails[]> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    if (group.visibility === 'PRIVATE') {
      if (!userId) {
        throw new ForbiddenError('Authentication required to view private group sessions');
      }
      const membership = await studyGroupMemberRepository.findMember(groupId, userId);
      if (!membership || membership.status !== 'ACTIVE') {
        throw new ForbiddenError('You are not authorized to view this private group');
      }
    }

    const sessions = await groupSessionRepository.findByGroup(groupId, options);
    const results: GroupSessionWithDetails[] = [];

    for (const s of sessions) {
      const enriched = await groupSessionRepository.enrichWithHost(s);
      const count = await groupParticipantRepository.countBySession(s.id, 'REGISTERED');
      let registered = false;
      if (userId) {
        const p = await groupParticipantRepository.findParticipant(s.id, userId);
        registered = !!p && p.status === 'REGISTERED';
      }
      results.push({
        ...enriched,
        participantCount: count,
        userRegistered: registered,
      });
    }

    return results;
  }

  async updateSession(
    groupId: number,
    sessionId: number,
    userId: number,
    data: {
      title?: string;
      description?: string | null;
      topic?: string | null;
      startTime?: string;
      endTime?: string;
      status?: string;
      cancellationReason?: string | null;
    }
  ): Promise<GroupSessionRecord> {
    const session = await groupSessionRepository.findById(sessionId);
    if (!session || session.groupId !== groupId) {
      throw new NotFoundError('Group session not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    const isOwnerOrMod =
      membership &&
      membership.status === 'ACTIVE' &&
      (membership.role === 'OWNER' || membership.role === 'MODERATOR');

    if (session.hostId !== userId && !isOwnerOrMod) {
      throw new ForbiddenError('Only the host or group moderators can update this session');
    }

    const updated = await groupSessionRepository.update(sessionId, data);
    if (!updated) {
      throw new NotFoundError('Failed to update group session');
    }

    return updated;
  }

  async cancelSession(
    groupId: number,
    sessionId: number,
    userId: number,
    reason?: string
  ): Promise<GroupSessionRecord> {
    return this.updateSession(groupId, sessionId, userId, {
      status: 'CANCELED',
      cancellationReason: reason || 'Session canceled by host',
    });
  }

  private async notifyGroupMembersNewSession(
    groupId: number,
    session: GroupSessionRecord,
    hostId: number
  ) {
    const members = await studyGroupMemberRepository.findByGroup(groupId, 'ACTIVE');
    for (const m of members) {
      if (m.userId === hostId) continue;
      await notificationService.createNotification({
        userId: m.userId,
        type: 'GROUP_SESSION_SCHEDULED',
        title: 'New Group Session Scheduled',
        message: `A new session "${session.title}" was scheduled in your study group.`,
        linkUrl: `/community/groups/${groupId}?tab=sessions`,
        relatedEntityType: 'GROUP_SESSION',
        relatedEntityId: session.id,
      });
    }
  }
}

export const groupSessionService = new GroupSessionService();
