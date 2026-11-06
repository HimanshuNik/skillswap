import { groupParticipantRepository, type GroupParticipantWithUser } from '../../repositories/collaboration/groupParticipant.repository.js';
import { groupSessionRepository } from '../../repositories/collaboration/groupSession.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { notificationService } from '../notification.service.js';
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
} from '../../utils/errors.js';

export class GroupAttendanceService {
  async register(
    groupId: number,
    sessionId: number,
    userId: number
  ): Promise<{ status: string; message: string }> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    // Must be active member
    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active member of this group to register for sessions');
    }

    const session = await groupSessionRepository.findById(sessionId);
    if (!session || session.groupId !== groupId) {
      throw new NotFoundError('Group session not found');
    }

    if (session.status === 'CANCELED') {
      throw new BadRequestError('Cannot register for a canceled session');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestError('Cannot register for a completed session');
    }

    // Check existing registration
    const existing = await groupParticipantRepository.findParticipant(sessionId, userId);
    if (existing) {
      if (existing.status === 'REGISTERED') {
        throw new ConflictError('You are already registered for this session');
      }
      if (existing.status === 'WAITLIST') {
        throw new ConflictError('You are already on the waitlist for this session');
      }
      // Re-activate if was previously cancelled
      await groupParticipantRepository.update(existing.id, { status: 'REGISTERED' });
      return { status: 'REGISTERED', message: 'Registration reactivated successfully' };
    }

    // Capacity Check
    const registeredCount = await groupParticipantRepository.countBySession(sessionId, 'REGISTERED');
    if (registeredCount >= session.maxParticipants) {
      // Add to waitlist
      await groupParticipantRepository.register({
        sessionId,
        userId,
        status: 'WAITLIST',
      });
      return {
        status: 'WAITLIST',
        message: 'Session is at capacity. You have been added to the waitlist.',
      };
    }

    await groupParticipantRepository.register({
      sessionId,
      userId,
      status: 'REGISTERED',
    });

    // Notify user of confirmed registration
    await notificationService.createNotification({
      userId,
      type: 'GROUP_SESSION_REGISTERED',
      title: 'Session Registration Confirmed',
      message: `You are confirmed for "${session.title}".`,
      linkUrl: `/community/groups/${groupId}?tab=sessions`,
      relatedEntityType: 'GROUP_SESSION',
      relatedEntityId: session.id,
    });

    return { status: 'REGISTERED', message: 'Successfully registered for session' };
  }

  async unregister(
    groupId: number,
    sessionId: number,
    userId: number
  ): Promise<{ message: string }> {
    const session = await groupSessionRepository.findById(sessionId);
    if (!session || session.groupId !== groupId) {
      throw new NotFoundError('Group session not found');
    }

    if (session.hostId === userId) {
      throw new BadRequestError('The session host cannot unregister from their own session');
    }

    const participant = await groupParticipantRepository.findParticipant(sessionId, userId);
    if (!participant) {
      throw new NotFoundError('Registration record not found');
    }

    await groupParticipantRepository.delete(sessionId, userId);

    // If there was a waitlisted participant, promote them!
    const waitlisted = await groupParticipantRepository.findBySession(sessionId, 'WAITLIST');
    if (waitlisted.length > 0 && waitlisted[0]) {
      const nextInLine = waitlisted[0];
      await groupParticipantRepository.update(nextInLine.id, { status: 'REGISTERED' });

      await notificationService.createNotification({
        userId: nextInLine.userId,
        type: 'GROUP_SESSION_PROMOTED',
        title: 'Promoted from Waitlist',
        message: `A spot opened up! You are now confirmed for "${session.title}".`,
        linkUrl: `/community/groups/${groupId}?tab=sessions`,
        relatedEntityType: 'GROUP_SESSION',
        relatedEntityId: session.id,
      });
    }

    return { message: 'Successfully cancelled session registration' };
  }

  async listParticipants(
    groupId: number,
    sessionId: number,
    userId?: number
  ): Promise<GroupParticipantWithUser[]> {
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
        throw new ForbiddenError('You are not authorized to view participants in this group');
      }
    }

    const list = await groupParticipantRepository.findBySession(sessionId);
    return groupParticipantRepository.enrichWithUsers(list);
  }

  async updateAttendance(
    groupId: number,
    sessionId: number,
    participantUserId: number,
    actorId: number,
    data: {
      isVerifiedAttendance?: boolean;
      status?: string;
      notes?: string | null;
    }
  ) {
    const session = await groupSessionRepository.findById(sessionId);
    if (!session || session.groupId !== groupId) {
      throw new NotFoundError('Group session not found');
    }

    // Only host, group owner, or group moderator can verify attendance
    const membership = await studyGroupMemberRepository.findMember(groupId, actorId);
    const isOwnerOrMod =
      membership &&
      membership.status === 'ACTIVE' &&
      (membership.role === 'OWNER' || membership.role === 'MODERATOR');

    if (session.hostId !== actorId && !isOwnerOrMod) {
      throw new ForbiddenError('Only the host or group moderators can verify attendance');
    }

    const participant = await groupParticipantRepository.findParticipant(sessionId, participantUserId);
    if (!participant) {
      throw new NotFoundError('Participant not found for this session');
    }

    const updated = await groupParticipantRepository.update(participant.id, data);
    return updated;
  }
}

export const groupAttendanceService = new GroupAttendanceService();

