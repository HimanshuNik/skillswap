import {
  conversationRepository,
  type ConversationSummary,
  type ConversationRecord,
} from '../repositories/conversation.repository.js';
import {
  messageRepository,
  type MessageRecord,
} from '../repositories/message.repository.js';
import { swapRequestRepository } from '../repositories/swapRequest.repository.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../utils/errors.js';
import { logger } from '../config/logger.js';

export interface SendMessageResult extends MessageRecord {
  clientMessageId?: string;
}

export class MessageService {
  // Idempotency cache for deduplicating retried messages within a 15-second window
  private static readonly idempotencyCache = new Map<
    string,
    { result: SendMessageResult; timestamp: number }
  >();

  /**
   * Retrieves all conversations for the user with peer info and unread counts.
   */
  async getUserConversations(userId: number): Promise<ConversationSummary[]> {
    return conversationRepository.findUserConversations(userId);
  }

  /**
   * Retrieves paginated messages for a conversation, validating participant access.
   */
  async getConversationMessages(
    userId: number,
    conversationId: number,
    options: { limit?: number; beforeId?: number } = {}
  ): Promise<{ conversation: ConversationRecord; messages: MessageRecord[] }> {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = await conversationRepository.isParticipant(
      conversationId,
      userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not authorized to access this conversation');
    }

    const messages = await messageRepository.findByConversation(
      conversationId,
      options
    );

    return {
      conversation,
      messages,
    };
  }

  /**
   * Sends a message in a conversation after enforcing participant authorization,
   * length validation, and swap agreement status.
   */
  async sendMessage(
    userId: number,
    conversationId: number,
    content: string,
    clientMessageId?: string
  ): Promise<SendMessageResult> {
    const trimmed = (content || '').trim();
    if (!trimmed || trimmed.length === 0) {
      throw new BadRequestError('Message content cannot be empty');
    }
    if (trimmed.length > 2000) {
      throw new BadRequestError('Message content cannot exceed 2000 characters');
    }

    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = await conversationRepository.isParticipant(
      conversationId,
      userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not authorized to post in this conversation');
    }

    if (conversation.status === 'READ_ONLY') {
      throw new ForbiddenError('This conversation is archived and read-only');
    }

    // Check linked swap request if any
    if (conversation.swapRequestId) {
      const swapRequest = await swapRequestRepository.findById(
        conversation.swapRequestId
      );
      if (swapRequest) {
        if (swapRequest.status === 'REJECTED' || swapRequest.status === 'CANCELLED') {
          throw new ForbiddenError(
            `Cannot send messages because this swap request is ${swapRequest.status.toLowerCase()}`
          );
        }
      }
    }

    // Check idempotency cache for duplicate submissions within 15 seconds
    const idempotencyKey = clientMessageId ? `${userId}_${conversationId}_${clientMessageId}` : null;
    if (idempotencyKey) {
      const cached = MessageService.idempotencyCache.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < 15000) {
        logger.debug(`[MessageService] Duplicate message suppressed via idempotency key: ${clientMessageId}`);
        return cached.result;
      }
    }

    const created = await messageRepository.create({
      conversationId,
      senderId: userId,
      content: trimmed,
    });

    // Touch conversation updated status
    await conversationRepository.updateStatus(conversationId, conversation.status);

    logger.debug(`[MessageService] Message created: id=${created.id} in conv=${conversationId} by user=${userId}`);

    const result: SendMessageResult = {
      ...created,
      clientMessageId,
    };

    if (idempotencyKey) {
      MessageService.idempotencyCache.set(idempotencyKey, {
        result,
        timestamp: Date.now(),
      });

      // Periodic cleanup of expired cache entries
      if (MessageService.idempotencyCache.size > 500) {
        const threshold = Date.now() - 30000;
        for (const [key, val] of MessageService.idempotencyCache.entries()) {
          if (val.timestamp < threshold) {
            MessageService.idempotencyCache.delete(key);
          }
        }
      }
    }

    return result;
  }

  /**
   * Updates last read timestamp and marks peer messages as read.
   */
  async markConversationAsRead(
    userId: number,
    conversationId: number
  ): Promise<{ conversationId: number; lastReadAt: string; readCount: number }> {
    const conversation = await conversationRepository.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    const isParticipant = await conversationRepository.isParticipant(
      conversationId,
      userId
    );
    if (!isParticipant) {
      throw new ForbiddenError('You are not authorized to access this conversation');
    }

    const now = new Date().toISOString();
    await conversationRepository.updateLastRead(conversationId, userId, now);
    const readCount = await messageRepository.markMessagesAsRead(conversationId, userId);

    return {
      conversationId,
      lastReadAt: now,
      readCount,
    };
  }

  /**
   * Gets total unread message count across all conversations for a user.
   */
  async getTotalUnreadCount(userId: number): Promise<number> {
    return conversationRepository.countTotalUnreadForUser(userId);
  }
}

export const messageService = new MessageService();

