import {
  groupMessageRepository,
  type GroupMessageWithSender,
} from '../../repositories/collaboration/groupMessage.repository.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { getIO } from '../../socket/index.js';
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../utils/errors.js';

export class GroupChatService {
  async sendMessage(
    groupId: number,
    senderId: number,
    content: string,
    isAnnouncement: boolean = false
  ): Promise<GroupMessageWithSender> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new BadRequestError('Message cannot be empty');
    }

    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, senderId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active member of this group to send messages');
    }

    const message = await groupMessageRepository.create({
      groupId,
      senderId,
      content: trimmed,
      isAnnouncement,
    });

    const [enriched] = await groupMessageRepository.enrichWithSenders([message]);

    // Broadcast in real-time to group room
    try {
      const io = getIO();
      io.to(`group:${groupId}`).emit('group:message:new', {
        groupId,
        message: enriched,
      });
    } catch {
      // Socket may be inactive in test/CLI environments
    }

    return enriched!;
  }

  async getMessages(
    groupId: number,
    userId: number,
    options?: { limit?: number; beforeId?: number }
  ): Promise<GroupMessageWithSender[]> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenError('You must be an active member of this group to read chat messages');
    }

    const list = await groupMessageRepository.findByGroup(groupId, options);
    return groupMessageRepository.enrichWithSenders(list);
  }
}

export const groupChatService = new GroupChatService();

