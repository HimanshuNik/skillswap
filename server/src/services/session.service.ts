import crypto from 'node:crypto';
import { db } from '../prisma/db.js';
import { userRepository } from '../repositories/user.repository.js';
import { swapRequestRepository } from '../repositories/swapRequest.repository.js';
import {
  sessionRepository,
  type SessionRecord,
  type SessionWithDetails,
} from '../repositories/session.repository.js';
import type {
  CreateSessionInput,
  RescheduleSessionInput,
  RespondRescheduleInput,
  CancelSessionInput,
  ConfirmCompletionInput,
  SessionQueryInput,
} from '../validators/session.validator.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { getIO } from '../socket/index.js';
import { notificationService } from './notification.service.js';
import { gamificationService } from './gamification/gamification.service.js';

export interface MeetingAccessInfo {
  meetingUrl: string | null;
  meetingRoomId: string | null;
  provider: string;
  joinAllowed: boolean;
  minutesUntilOpen: number;
  status: string;
  session?: SessionWithDetails;
}

export class SessionService {
  private emitSocketEvent(room: string, event: string, data: any) {
    try {
      const io = getIO();
      io.to(room).emit(event, data);
    } catch (err: any) {
      // In standalone tests or when socket is not initialized, ignore gracefully
      logger.debug(`[SessionService] Socket emit failed or inactive: ${err.message}`);
    }
  }

  /**
   * Schedules a new reciprocal teaching session under an accepted SwapRequest.
   */
  async createSession(
    userId: number,
    input: CreateSessionInput
  ): Promise<SessionWithDetails> {
    // 1. Verify swap request exists and is accepted/active
    const swap = await swapRequestRepository.findById(input.swapRequestId);
    if (!swap) {
      throw new NotFoundError('Swap request not found');
    }
    if (swap.status !== 'ACCEPTED' && swap.status !== 'IN_PROGRESS') {
      throw new BadRequestError('Sessions can only be scheduled for accepted swap requests');
    }

    // 2. Verify requesting user is a participant
    if (userId !== swap.senderId && userId !== swap.receiverId) {
      throw new ForbiddenError('You are not a participant in this swap request');
    }

    // 3. Verify legitimate teaching direction & skills
    const isDirection1 =
      input.teacherId === swap.senderId &&
      input.learnerId === swap.receiverId &&
      input.skillId === swap.senderSkillId;

    const isDirection2 =
      input.teacherId === swap.receiverId &&
      input.learnerId === swap.senderId &&
      input.skillId === swap.receiverSkillId;

    if (!isDirection1 && !isDirection2) {
      throw new BadRequestError(
        'Invalid teaching direction or skill for this swap. Teacher must match the registered skill offer and learner must match the counterparty.'
      );
    }

    // 4. Validate scheduledStart is in the future
    const startTime = new Date(input.scheduledStart).getTime();
    if (isNaN(startTime)) {
      throw new BadRequestError('Invalid start date format');
    }
    if (startTime <= Date.now()) {
      throw new BadRequestError('Session start time must be in the future');
    }

    // 5. Calculate scheduledEnd
    const durationMinutes = input.duration || 60;
    const endTime = startTime + durationMinutes * 60 * 1000;
    const scheduledStartIso = new Date(startTime).toISOString();
    const scheduledEndIso = new Date(endTime).toISOString();

    // 6. Conflict check for both teacher and learner
    const teacherConflicts = await sessionRepository.findConflictingSessions(
      input.teacherId,
      scheduledStartIso,
      scheduledEndIso
    );
    if (teacherConflicts.length > 0) {
      throw new ConflictError(
        'The teacher already has a conflicting session scheduled during this time window'
      );
    }

    const learnerConflicts = await sessionRepository.findConflictingSessions(
      input.learnerId,
      scheduledStartIso,
      scheduledEndIso
    );
    if (learnerConflicts.length > 0) {
      throw new ConflictError(
        'The learner already has a conflicting session scheduled during this time window'
      );
    }

    // 7. Generate Jitsi Meet room and URL
    const meetingRoomId = `skillswap-${crypto.randomUUID()}`;
    const meetingUrl = `https://meet.jit.si/${meetingRoomId}`;

    // 8. Create session record
    const session = await sessionRepository.create({
      swapRequestId: input.swapRequestId,
      teacherId: input.teacherId,
      learnerId: input.learnerId,
      skillId: input.skillId,
      scheduledStart: scheduledStartIso,
      scheduledEnd: scheduledEndIso,
      duration: durationMinutes,
      timezone: input.timezone || 'UTC',
      status: 'SCHEDULED',
      meetingProvider: 'Jitsi',
      meetingRoomId,
      meetingUrl,
      notes: input.notes || null,
    });

    // 9. If swap was ACCEPTED, transition to IN_PROGRESS
    if (swap.status === 'ACCEPTED') {
      await swapRequestRepository.update(swap.id, { status: 'IN_PROGRESS' });
    }

    // 10. Populate details
    const populated = await sessionRepository.populateDetails([session]);
    const detailedSession = populated[0];

    // 11. Emit Socket.IO real-time notification
    this.emitSocketEvent(`user:${input.teacherId}`, 'session:scheduled', detailedSession);
    this.emitSocketEvent(`user:${input.learnerId}`, 'session:scheduled', detailedSession);

    const partnerId = userId === input.teacherId ? input.learnerId : input.teacherId;
    try {
      await notificationService.createNotification({
        userId: partnerId,
        type: 'SESSION_SCHEDULED',
        title: 'New Session Scheduled',
        message: `A new learning session for ${detailedSession.skill.name} has been scheduled!`,
        linkUrl: '/sessions',
        relatedEntityType: 'SESSION',
        relatedEntityId: session.id,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch session scheduled notification: ${err.message}`);
    }

    return detailedSession;
  }

  /**
   * Retrieves all sessions for a user with optional filtering.
   */
  async getUserSessions(
    userId: number,
    query: SessionQueryInput
  ): Promise<SessionWithDetails[]> {
    return sessionRepository.findByUser(userId, query);
  }

  /**
   * Retrieves a single session by ID with authorization verification.
   */
  async getSessionById(
    userId: number,
    sessionId: number
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to view this session');
    }

    const populated = await sessionRepository.populateDetails([session]);
    return populated[0];
  }

  /**
   * Proposes a reschedule for a session.
   */
  async proposeReschedule(
    userId: number,
    sessionId: number,
    input: RescheduleSessionInput
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to reschedule this session');
    }

    if (['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(session.status)) {
      throw new BadRequestError(
        `Cannot reschedule a session that is already ${session.status.toLowerCase()}`
      );
    }

    const proposedTime = new Date(input.proposedStart).getTime();
    if (isNaN(proposedTime)) {
      throw new BadRequestError('Invalid proposed start date format');
    }
    if (proposedTime <= Date.now()) {
      throw new BadRequestError('Proposed session time must be in the future');
    }

    const duration = input.duration || session.duration || 60;
    const proposedEndIso = new Date(proposedTime + duration * 60 * 1000).toISOString();
    const proposedStartIso = new Date(proposedTime).toISOString();

    // Conflict check for both teacher and learner at the proposed time
    const teacherConflicts = await sessionRepository.findConflictingSessions(
      session.teacherId,
      proposedStartIso,
      proposedEndIso,
      sessionId
    );
    if (teacherConflicts.length > 0) {
      throw new ConflictError('Proposed time conflicts with the teacher’s existing schedule');
    }

    const learnerConflicts = await sessionRepository.findConflictingSessions(
      session.learnerId,
      proposedStartIso,
      proposedEndIso,
      sessionId
    );
    if (learnerConflicts.length > 0) {
      throw new ConflictError('Proposed time conflicts with the learner’s existing schedule');
    }

    const updated = await sessionRepository.update(sessionId, {
      status: 'RESCHEDULE_PROPOSED',
      rescheduledBy: userId,
      proposedStart: proposedStartIso,
      proposedEnd: proposedEndIso,
      proposedAt: new Date().toISOString(),
      rescheduleReason: input.reason || null,
      duration,
    });

    const populated = await sessionRepository.populateDetails([updated]);
    const detailed = populated[0];

    const counterpartyId = session.teacherId === userId ? session.learnerId : session.teacherId;
    this.emitSocketEvent(`user:${counterpartyId}`, 'session:reschedule_proposed', detailed);

    try {
      await notificationService.createNotification({
        userId: counterpartyId,
        type: 'SESSION_RESCHEDULE_PROPOSED',
        title: 'Session Reschedule Proposed',
        message: `Your partner proposed a new time for your ${detailed.skill.name} session.`,
        linkUrl: '/sessions',
        relatedEntityType: 'SESSION',
        relatedEntityId: sessionId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch reschedule proposed notification: ${err.message}`);
    }

    return detailed;
  }

  /**
   * Accepts or rejects a proposed reschedule.
   */
  async respondToReschedule(
    userId: number,
    sessionId: number,
    input: RespondRescheduleInput
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not a participant in this session');
    }

    if (session.status !== 'RESCHEDULE_PROPOSED') {
      throw new BadRequestError('Session does not have an active reschedule proposal');
    }

    if (session.rescheduledBy === userId) {
      throw new ForbiddenError('You cannot respond to your own reschedule proposal');
    }

    let updated: SessionRecord;

    if (input.action === 'ACCEPT') {
      if (!session.proposedStart || !session.proposedEnd) {
        throw new BadRequestError('Invalid proposed session times');
      }

      // Re-verify conflicts at acceptance time
      const teacherConflicts = await sessionRepository.findConflictingSessions(
        session.teacherId,
        session.proposedStart,
        session.proposedEnd,
        sessionId
      );
      if (teacherConflicts.length > 0) {
        throw new ConflictError('The proposed time now conflicts with another scheduled session');
      }

      const learnerConflicts = await sessionRepository.findConflictingSessions(
        session.learnerId,
        session.proposedStart,
        session.proposedEnd,
        sessionId
      );
      if (learnerConflicts.length > 0) {
        throw new ConflictError('The proposed time now conflicts with another scheduled session');
      }

      updated = await sessionRepository.update(sessionId, {
        scheduledStart: session.proposedStart,
        scheduledEnd: session.proposedEnd,
        scheduledAt: session.proposedStart,
        status: 'SCHEDULED',
        rescheduledBy: null,
        proposedStart: null,
        proposedEnd: null,
        proposedAt: null,
        rescheduleReason: null,
      });

      this.emitSocketEvent(`user:${session.rescheduledBy}`, 'session:reschedule_accepted', {
        sessionId,
        scheduledStart: updated.scheduledStart,
      });

      try {
        await notificationService.createNotification({
          userId: session.rescheduledBy!,
          type: 'SESSION_RESCHEDULE_ACCEPTED',
          title: 'Reschedule Accepted',
          message: 'Your reschedule proposal was accepted!',
          linkUrl: '/sessions',
          relatedEntityType: 'SESSION',
          relatedEntityId: sessionId,
        });
      } catch (err: any) {
        logger.warn(`Failed to dispatch reschedule accepted notification: ${err.message}`);
      }
    } else {
      // REJECT: Reverts back to SCHEDULED with previous times intact
      updated = await sessionRepository.update(sessionId, {
        status: 'SCHEDULED',
        rescheduledBy: null,
        proposedStart: null,
        proposedEnd: null,
        proposedAt: null,
        rescheduleReason: null,
      });

      this.emitSocketEvent(`user:${session.rescheduledBy}`, 'session:reschedule_rejected', {
        sessionId,
      });

      try {
        await notificationService.createNotification({
          userId: session.rescheduledBy!,
          type: 'SESSION_RESCHEDULE_REJECTED',
          title: 'Reschedule Declined',
          message: 'Your reschedule proposal was declined. The session retains its original time.',
          linkUrl: '/sessions',
          relatedEntityType: 'SESSION',
          relatedEntityId: sessionId,
        });
      } catch (err: any) {
        logger.warn(`Failed to dispatch reschedule rejected notification: ${err.message}`);
      }
    }

    const populated = await sessionRepository.populateDetails([updated]);
    return populated[0];
  }

  /**
   * Cancels a session with mandatory reason.
   */
  async cancelSession(
    userId: number,
    sessionId: number,
    input: CancelSessionInput
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to cancel this session');
    }

    if (['COMPLETED', 'CANCELLED', 'DISPUTED'].includes(session.status)) {
      throw new BadRequestError(
        `Cannot cancel a session that is already ${session.status.toLowerCase()}`
      );
    }

    const updated = await sessionRepository.update(sessionId, {
      status: 'CANCELLED',
      cancelledBy: userId,
      cancellationReason: input.reason,
    });

    const populated = await sessionRepository.populateDetails([updated]);
    const detailed = populated[0];

    const counterpartyId = session.teacherId === userId ? session.learnerId : session.teacherId;
    this.emitSocketEvent(`user:${counterpartyId}`, 'session:cancelled', detailed);

    try {
      await notificationService.createNotification({
        userId: counterpartyId,
        type: 'SESSION_CANCELLED',
        title: 'Session Cancelled',
        message: `Your ${detailed.skill.name} session was cancelled: "${input.reason}"`,
        linkUrl: '/sessions',
        relatedEntityType: 'SESSION',
        relatedEntityId: sessionId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch session cancelled notification: ${err.message}`);
    }

    return detailed;
  }

  /**
   * Returns meeting access details and validates join window.
   */
  async getMeetingInfo(
    userId: number,
    sessionId: number
  ): Promise<MeetingAccessInfo> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to access this meeting');
    }

    const now = Date.now();
    const start = new Date(session.scheduledStart || session.scheduledAt!).getTime();
    const duration = session.duration || 60;
    const end = session.scheduledEnd ? new Date(session.scheduledEnd).getTime() : start + duration * 60 * 1000;

    const windowOpen = start - 15 * 60 * 1000; // 15 min early
    const windowClose = end + 60 * 60 * 1000; // 60 min after end

    const isNonJoinableStatus = ['CANCELLED', 'DISPUTED'].includes(session.status);
    const joinAllowed = now >= windowOpen && now <= windowClose && !isNonJoinableStatus;
    const minutesUntilOpen = now < windowOpen ? Math.ceil((windowOpen - now) / 60000) : 0;

    const populated = await sessionRepository.populateDetails([session]);

    return {
      meetingUrl: session.meetingUrl,
      meetingRoomId: session.meetingRoomId,
      provider: session.meetingProvider || 'Jitsi',
      joinAllowed,
      minutesUntilOpen,
      status: session.status,
      session: populated[0],
    };
  }

  /**
   * Starts a meeting or enters the video room, validating access window.
   */
  async startSession(
    userId: number,
    sessionId: number
  ): Promise<MeetingAccessInfo> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to join this meeting');
    }

    if (['CANCELLED', 'DISPUTED'].includes(session.status)) {
      throw new BadRequestError(`Cannot join a ${session.status.toLowerCase()} session`);
    }

    const now = Date.now();
    const start = new Date(session.scheduledStart || session.scheduledAt!).getTime();
    const duration = session.duration || 60;
    const end = session.scheduledEnd ? new Date(session.scheduledEnd).getTime() : start + duration * 60 * 1000;

    const windowOpen = start - 15 * 60 * 1000;
    const windowClose = end + 60 * 60 * 1000;

    if (now < windowOpen) {
      const minutesUntilOpen = Math.ceil((windowOpen - now) / 60000);
      throw new ForbiddenError(
        `Session room is not open yet. You can join 15 minutes before the scheduled time (in approximately ${minutesUntilOpen} minute(s)).`
      );
    }

    if (now > windowClose) {
      throw new BadRequestError('Session join window has expired');
    }

    let updated = session;
    if (session.status === 'SCHEDULED') {
      updated = await sessionRepository.update(sessionId, { status: 'IN_PROGRESS' });
    }

    const populated = await sessionRepository.populateDetails([updated]);

    return {
      meetingUrl: updated.meetingUrl,
      meetingRoomId: updated.meetingRoomId,
      provider: updated.meetingProvider || 'Jitsi',
      joinAllowed: true,
      minutesUntilOpen: 0,
      status: updated.status,
      session: populated[0],
    };
  }

  /**
   * Marks session as completed by one participant, awaiting counterparty confirmation.
   */
  async completeSession(
    userId: number,
    sessionId: number
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not authorized to complete this session');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestError('Session is already completed');
    }
    if (session.status === 'COMPLETION_PENDING') {
      throw new BadRequestError('Session is already awaiting counterparty completion confirmation');
    }
    if (['CANCELLED', 'DISPUTED'].includes(session.status)) {
      throw new BadRequestError(`Cannot complete a ${session.status.toLowerCase()} session`);
    }

    // Verify session has started or reached start window
    const now = Date.now();
    const start = new Date(session.scheduledStart || session.scheduledAt!).getTime();
    if (now < start - 15 * 60 * 1000) {
      throw new BadRequestError('Cannot mark complete before the session has started');
    }

    const updated = await sessionRepository.update(sessionId, {
      status: 'COMPLETION_PENDING',
      completedBy: userId,
      completedAt: new Date().toISOString(),
    });

    const populated = await sessionRepository.populateDetails([updated]);
    const detailed = populated[0];

    const counterpartyId = session.teacherId === userId ? session.learnerId : session.teacherId;
    this.emitSocketEvent(`user:${counterpartyId}`, 'session:completion_pending', detailed);

    try {
      await notificationService.createNotification({
        userId: counterpartyId,
        type: 'SESSION_COMPLETION_PENDING',
        title: 'Session Completion Confirmation Needed',
        message: `Your partner marked the ${detailed.skill.name} session as complete. Please confirm!`,
        linkUrl: '/sessions',
        relatedEntityType: 'SESSION',
        relatedEntityId: sessionId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch completion pending notification: ${err.message}`);
    }

    return detailed;
  }

  /**
   * Confirms or disputes session completion.
   */
  async confirmCompletion(
    userId: number,
    sessionId: number,
    input: ConfirmCompletionInput
  ): Promise<SessionWithDetails> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== userId && session.learnerId !== userId) {
      throw new ForbiddenError('You are not a participant in this session');
    }

    if (session.status !== 'COMPLETION_PENDING') {
      throw new BadRequestError('Session is not pending completion confirmation');
    }

    if (session.completedBy === userId) {
      throw new ForbiddenError('You cannot confirm your own completion request');
    }

    let updated: SessionRecord;

    if (input.action === 'CONFIRM') {
      updated = await sessionRepository.update(sessionId, {
        status: 'COMPLETED',
        completionConfirmedAt: new Date().toISOString(),
      });

      // Increment completed sessions counter for both users
      await userRepository.incrementCompletedSessions(session.teacherId);
      await userRepository.incrementCompletedSessions(session.learnerId);

      // Phase 19 Gamification: award XP, streak, goals progress, and achievements
      try {
        await gamificationService.onSessionCompleted({
          sessionId,
          teacherId: session.teacherId,
          learnerId: session.learnerId,
          durationMinutes: session.duration || 60,
          skillId: session.skillId,
        });
      } catch (err: any) {
        logger.warn(`Failed to process gamification session completion: ${err.message}`);
      }

      // Check reciprocal completion of the parent SwapRequest
      const reciprocal = await sessionRepository.checkReciprocalCompletion(session.swapRequestId);
      if (reciprocal.isFullyCompleted) {
        await swapRequestRepository.update(session.swapRequestId, {
          status: 'COMPLETED',
        });
        logger.info(
          `[SessionService] SwapRequest #${session.swapRequestId} fully completed reciprocally!`
        );

        try {
          await gamificationService.onFirstSwapCompleted({
            swapRequestId: session.swapRequestId,
            userAId: session.teacherId,
            userBId: session.learnerId,
          });
        } catch (err: any) {
          logger.warn(`Failed to process gamification swap completion: ${err.message}`);
        }

        this.emitSocketEvent(`user:${session.teacherId}`, 'swap:completed', {
          swapRequestId: session.swapRequestId,
        });
        this.emitSocketEvent(`user:${session.learnerId}`, 'swap:completed', {
          swapRequestId: session.swapRequestId,
        });
      }

      this.emitSocketEvent(`user:${session.completedBy}`, 'session:completed', {
        sessionId,
      });

      try {
        await notificationService.createNotification({
          userId: session.completedBy!,
          type: 'SESSION_COMPLETED',
          title: 'Session Completion Confirmed',
          message: 'Your session has been confirmed as completed! You can now receive reviews.',
          linkUrl: '/sessions',
          relatedEntityType: 'SESSION',
          relatedEntityId: sessionId,
        });
      } catch (err: any) {
        logger.warn(`Failed to dispatch session completed notification: ${err.message}`);
      }
    } else {
      // DISPUTE
      updated = await sessionRepository.update(sessionId, {
        status: 'DISPUTED',
        disputedBy: userId,
        disputeReason: input.disputeReason,
      });

      this.emitSocketEvent(`user:${session.completedBy}`, 'session:disputed', {
        sessionId,
        reason: input.disputeReason,
      });

      try {
        await notificationService.createNotification({
          userId: session.completedBy!,
          type: 'SESSION_DISPUTED',
          title: 'Session Completion Disputed',
          message: `Your partner disputed the session completion: "${input.disputeReason}"`,
          linkUrl: '/sessions',
          relatedEntityType: 'SESSION',
          relatedEntityId: sessionId,
        });
      } catch (err: any) {
        logger.warn(`Failed to dispatch session disputed notification: ${err.message}`);
      }
    }

    const populated = await sessionRepository.populateDetails([updated]);
    return populated[0];
  }
}

export const sessionService = new SessionService();
