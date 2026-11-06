import { db } from '../prisma/db.js';
import { userRepository } from '../repositories/user.repository.js';
import { userSkillRepository } from '../repositories/userSkill.repository.js';
import {
  swapRequestRepository,
  type SwapRequestRecord,
  type SwapRequestWithDetails,
} from '../repositories/swapRequest.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { notificationService } from './notification.service.js';
import type { CreateSwapRequestInput } from '../validators/swapRequest.validator.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { entitlementService } from './billing/entitlement.service.js';


export class SwapRequestService {
  async createSwapRequest(
    senderId: number,
    input: CreateSwapRequestInput
  ): Promise<SwapRequestRecord> {
    // 1. Verify User A exists
    const sender = await userRepository.findById(senderId);
    if (!sender) {
      throw new NotFoundError('Sender not found');
    }

    // 2. Check plan quota for active swap requests
    const quotaCheck = await entitlementService.canCreateSwapRequest(senderId);
    if (!quotaCheck.allowed) {
      throw new ForbiddenError(quotaCheck.reason || 'You have reached your limit of active swap requests.');
    }

    // 2. Prevent self-requests

    if (senderId === input.receiverId) {
      throw new BadRequestError('You cannot send a skill swap request to yourself');
    }

    // 3. Verify User B exists and is onboarded
    const receiver = await userRepository.findById(input.receiverId);
    if (!receiver) {
      throw new NotFoundError('Recipient user not found');
    }
    if (!receiver.isOnboarded) {
      throw new BadRequestError('Recipient has not completed onboarding yet');
    }

    // 4. Verify User A actually teaches offered skill
    const senderTeaches = await userSkillRepository.findTeachingSkill(
      senderId,
      input.senderSkillId
    );
    if (!senderTeaches) {
      throw new BadRequestError('You must have the offered skill in your teaching skills');
    }

    // 5. Verify User B wants to learn offered skill
    const receiverLearns = await userSkillRepository.findLearningSkill(
      input.receiverId,
      input.senderSkillId
    );
    if (!receiverLearns) {
      throw new BadRequestError('The recipient does not have the offered skill in their learning goals');
    }

    // 6. Verify User B teaches requested skill
    const receiverTeaches = await userSkillRepository.findTeachingSkill(
      input.receiverId,
      input.receiverSkillId
    );
    if (!receiverTeaches) {
      throw new BadRequestError('The recipient does not have the requested skill in their teaching skills');
    }

    // 7. Verify User A wants to learn requested skill
    const senderLearns = await userSkillRepository.findLearningSkill(
      senderId,
      input.receiverSkillId
    );
    if (!senderLearns) {
      throw new BadRequestError('You must have the requested skill in your learning goals');
    }

    // 8. Prevent duplicate active swap agreements between the same users (in either direction)
    const existingActive = await swapRequestRepository.findActiveBetweenUsers(
      senderId,
      input.receiverId
    );
    if (existingActive) {
      throw new ConflictError('An active swap request or agreement already exists with this user');
    }

    // 9. Save the request in PostgreSQL with status PENDING

    const created = await swapRequestRepository.create({
      senderId,
      receiverId: input.receiverId,
      senderSkillId: input.senderSkillId,
      receiverSkillId: input.receiverSkillId,
      message: input.message,
    });

    logger.info(
      `SwapRequest created [id=${created.id}] from user ${senderId} to user ${input.receiverId}`
    );

    try {
      await notificationService.createNotification({
        userId: input.receiverId,
        type: 'SWAP_REQUEST',
        title: 'New Swap Request',
        message: `${sender.name} sent you a skill swap request!`,
        linkUrl: '/requests',
        relatedEntityType: 'SWAP_REQUEST',
        relatedEntityId: created.id,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch swap request notification: ${err.message}`);
    }

    return created;
  }

  async getIncomingRequests(userId: number): Promise<SwapRequestWithDetails[]> {
    return swapRequestRepository.findIncoming(userId);
  }

  async getOutgoingRequests(userId: number): Promise<SwapRequestWithDetails[]> {
    return swapRequestRepository.findOutgoing(userId);
  }

  async getPendingCount(userId: number): Promise<number> {
    return swapRequestRepository.countPendingIncoming(userId);
  }

  async getActiveWithUser(
    userId: number,
    targetUserId: number
  ): Promise<SwapRequestRecord | null> {
    return swapRequestRepository.findActiveBetweenUsers(userId, targetUserId);
  }

  async acceptSwapRequest(
    userId: number,
    requestId: number
  ): Promise<{ swapRequest: SwapRequestRecord; conversationId: number }> {
    const request = await swapRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError('Swap request not found');
    }

    // Only receiver can accept
    if (request.receiverId !== userId) {
      throw new ForbiddenError('Only the recipient can accept this swap request');
    }

    // Check status transitions
    if (request.status === 'ACCEPTED') {
      throw new ConflictError('This swap request has already been accepted');
    }
    if (request.status === 'REJECTED') {
      throw new BadRequestError('Cannot accept a rejected swap request');
    }
    if (request.status === 'CANCELLED') {
      throw new BadRequestError('Cannot accept a cancelled swap request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot accept a request with status ${request.status}`);
    }

    let conversationId: number = 0;

    // Concurrency-safe atomic transaction
    await db.transaction(async (tx) => {
      // 1. Advance request status
      await tx.orm.public.SwapRequest.where({ id: requestId }).update({
        status: 'ACCEPTED',
      });

      // 2. Create or find linked conversation and add both participants
      const conversation = await conversationRepository.createWithParticipants(
        requestId,
        [request.senderId, request.receiverId],
        tx
      );
      conversationId = conversation.id;
    });

    logger.info(
      `SwapRequest [id=${requestId}] accepted by user ${userId}. Conversation [id=${conversationId}] created.`
    );

    try {
      const receiver = await userRepository.findById(userId);
      const receiverName = receiver?.name || 'Your partner';
      await notificationService.createNotification({
        userId: request.senderId,
        type: 'SWAP_ACCEPTED',
        title: 'Swap Request Accepted',
        message: `${receiverName} accepted your skill swap request!`,
        linkUrl: '/requests',
        relatedEntityType: 'SWAP_REQUEST',
        relatedEntityId: requestId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch swap accepted notification: ${err.message}`);
    }

    const updated = await swapRequestRepository.findById(requestId);
    return {
      swapRequest: updated!,
      conversationId,
    };
  }

  async rejectSwapRequest(userId: number, requestId: number): Promise<SwapRequestRecord> {
    const request = await swapRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError('Swap request not found');
    }

    // Only receiver can reject
    if (request.receiverId !== userId) {
      throw new ForbiddenError('Only the recipient can reject this swap request');
    }

    // Check status transitions
    if (request.status === 'REJECTED') {
      throw new ConflictError('This swap request is already rejected');
    }
    if (request.status === 'ACCEPTED') {
      throw new BadRequestError('Cannot reject an already accepted swap request');
    }
    if (request.status === 'CANCELLED') {
      throw new BadRequestError('Cannot reject a cancelled swap request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot reject a request with status ${request.status}`);
    }

    const updated = await swapRequestRepository.updateStatus(requestId, 'REJECTED');

    logger.info(`SwapRequest [id=${requestId}] rejected by user ${userId}`);

    try {
      const receiver = await userRepository.findById(userId);
      const receiverName = receiver?.name || 'Your peer';
      await notificationService.createNotification({
        userId: request.senderId,
        type: 'SWAP_REJECTED',
        title: 'Swap Request Declined',
        message: `${receiverName} declined your skill swap request.`,
        linkUrl: '/requests',
        relatedEntityType: 'SWAP_REQUEST',
        relatedEntityId: requestId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch swap rejected notification: ${err.message}`);
    }

    return updated;
  }

  async cancelSwapRequest(userId: number, requestId: number): Promise<SwapRequestRecord> {
    const request = await swapRequestRepository.findById(requestId);
    if (!request) {
      throw new NotFoundError('Swap request not found');
    }

    // Only sender can cancel
    if (request.senderId !== userId) {
      throw new ForbiddenError('Only the sender can cancel this swap request');
    }

    // Check status transitions
    if (request.status === 'CANCELLED') {
      throw new ConflictError('This swap request is already cancelled');
    }
    if (request.status === 'ACCEPTED') {
      throw new BadRequestError('Cannot cancel an already accepted swap request');
    }
    if (request.status === 'REJECTED') {
      throw new BadRequestError('Cannot cancel a rejected swap request');
    }
    if (request.status !== 'PENDING') {
      throw new BadRequestError(`Cannot cancel a request with status ${request.status}`);
    }

    const updated = await swapRequestRepository.updateStatus(requestId, 'CANCELLED');

    logger.info(`SwapRequest [id=${requestId}] cancelled by user ${userId}`);

    try {
      const sender = await userRepository.findById(userId);
      const senderName = sender?.name || 'Your peer';
      await notificationService.createNotification({
        userId: request.receiverId,
        type: 'SWAP_CANCELLED',
        title: 'Swap Request Cancelled',
        message: `${senderName} cancelled their skill swap request.`,
        linkUrl: '/requests',
        relatedEntityType: 'SWAP_REQUEST',
        relatedEntityId: requestId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch swap cancelled notification: ${err.message}`);
    }

    return updated;
  }
}

export const swapRequestService = new SwapRequestService();

