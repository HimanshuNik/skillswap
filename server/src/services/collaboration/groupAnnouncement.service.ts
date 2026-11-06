import {
  groupAnnouncementRepository,
  type GroupAnnouncementRecord,
  type GroupAnnouncementWithAuthor,
} from '../../repositories/collaboration/groupAnnouncement.repository.js';
import { groupChatService } from './groupChat.service.js';
import { studyGroupRepository } from '../../repositories/studyGroup.repository.js';
import { studyGroupMemberRepository } from '../../repositories/studyGroupMember.repository.js';
import { notificationService } from '../notification.service.js';
import {
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors.js';

export class GroupAnnouncementService {
  async createAnnouncement(
    groupId: number,
    authorId: number,
    data: {
      title: string;
      content: string;
      isPinned?: boolean;
    }
  ): Promise<GroupAnnouncementRecord> {
    const group = await studyGroupRepository.findById(groupId);
    if (!group) {
      throw new NotFoundError('Study group not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, authorId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can post announcements');
    }

    const ann = await groupAnnouncementRepository.create({
      groupId,
      authorId,
      title: data.title,
      content: data.content,
      isPinned: data.isPinned || false,
    });

    // Also mirror to group chat as announcement
    groupChatService
      .sendMessage(groupId, authorId, `📢 [Announcement] ${data.title}\n\n${data.content}`, true)
      .catch(() => {});

    // Notify all other active members
    this.notifyGroupMembers(groupId, ann, authorId, group.name).catch(() => {});

    return ann;
  }

  async listAnnouncements(
    groupId: number,
    userId?: number
  ): Promise<GroupAnnouncementWithAuthor[]> {
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
        throw new ForbiddenError('You are not authorized to view announcements in this private group');
      }
    }

    const list = await groupAnnouncementRepository.findByGroup(groupId);
    const results: GroupAnnouncementWithAuthor[] = [];
    for (const a of list) {
      results.push(await groupAnnouncementRepository.enrichWithAuthor(a));
    }
    return results;
  }

  async updateAnnouncement(
    groupId: number,
    announcementId: number,
    userId: number,
    data: {
      title?: string;
      content?: string;
      isPinned?: boolean;
    }
  ): Promise<GroupAnnouncementRecord> {
    const ann = await groupAnnouncementRepository.findById(announcementId);
    if (!ann || ann.groupId !== groupId) {
      throw new NotFoundError('Announcement not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can edit announcements');
    }

    const updated = await groupAnnouncementRepository.update(announcementId, data);
    if (!updated) {
      throw new NotFoundError('Failed to update announcement');
    }
    return updated;
  }

  async deleteAnnouncement(
    groupId: number,
    announcementId: number,
    userId: number
  ): Promise<boolean> {
    const ann = await groupAnnouncementRepository.findById(announcementId);
    if (!ann || ann.groupId !== groupId) {
      throw new NotFoundError('Announcement not found');
    }

    const membership = await studyGroupMemberRepository.findMember(groupId, userId);
    if (
      !membership ||
      membership.status !== 'ACTIVE' ||
      (membership.role !== 'OWNER' && membership.role !== 'MODERATOR')
    ) {
      throw new ForbiddenError('Only group owners and moderators can delete announcements');
    }

    return groupAnnouncementRepository.delete(announcementId);
  }

  private async notifyGroupMembers(
    groupId: number,
    announcement: GroupAnnouncementRecord,
    authorId: number,
    groupName: string
  ) {
    const members = await studyGroupMemberRepository.findByGroup(groupId, 'ACTIVE');
    for (const m of members) {
      if (m.userId === authorId) continue;
      await notificationService.createNotification({
        userId: m.userId,
        type: 'GROUP_ANNOUNCEMENT',
        title: `Announcement in ${groupName}`,
        message: announcement.title,
        linkUrl: `/community/groups/${groupId}?tab=announcements`,
        relatedEntityType: 'GROUP_ANNOUNCEMENT',
        relatedEntityId: announcement.id,
      });
    }
  }
}

export const groupAnnouncementService = new GroupAnnouncementService();

