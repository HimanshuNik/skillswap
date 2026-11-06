import {
  StudyGroupRepository,
  type StudyGroupRecord,
  type StudyGroupWithDetails,
} from '../../repositories/studyGroup.repository.js';
import {
  StudyGroupMemberRepository,
  type StudyGroupMemberRecord,
  type StudyGroupMemberWithUser,
} from '../../repositories/studyGroupMember.repository.js';
import { NotFoundError, BadRequestError, ForbiddenError, ConflictError } from '../../utils/errors.js';
import { NotificationService } from '../notification.service.js';

export class StudyGroupService {
  constructor(
    private groupRepo: StudyGroupRepository = new StudyGroupRepository(),
    private memberRepo: StudyGroupMemberRepository = new StudyGroupMemberRepository(),
    private notificationService: NotificationService = new NotificationService()
  ) {}

  private slugify(text: string): string {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `${base}-${randomSuffix}`;
  }

  async createGroup(
    userId: number,
    data: {
      name: string;
      description: string;
      skillId?: number | null;
      visibility?: string;
      membershipRules?: string | null;
    }
  ): Promise<StudyGroupWithDetails> {
    const slug = this.slugify(data.name);

    const group = await this.groupRepo.create({
      name: data.name,
      slug,
      description: data.description,
      creatorId: userId,
      skillId: data.skillId || null,
      visibility: data.visibility || 'PUBLIC',
      membershipRules: data.membershipRules || null,
    });

    // Add creator as OWNER
    await this.memberRepo.addMember({
      groupId: group.id,
      userId,
      role: 'OWNER',
      status: 'ACTIVE',
    });

    const [details] = await this.groupRepo.populateDetails([group], userId);
    return details;
  }

  async getGroupById(groupId: number, currentUserId?: number, userRole?: string): Promise<StudyGroupWithDetails> {
    const group = await this.groupRepo.findById(groupId);
    if (!group || group.isArchived) {
      throw new NotFoundError('Study group not found');
    }

    const [details] = await this.groupRepo.populateDetails([group], currentUserId);

    // Enforce private group access control
    if (group.visibility === 'PRIVATE') {
      const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
      const isMember = details.membership?.isMember;

      if (!isPrivileged && !isMember) {
        // Redact internal rules or private details for non-members
        return {
          ...details,
          description: 'This is a private study group. Join to view full details and discussions.',
          membershipRules: null,
        };
      }
    }

    return details;
  }

  async getGroupBySlug(slug: string, currentUserId?: number, userRole?: string): Promise<StudyGroupWithDetails> {
    const group = await this.groupRepo.findBySlug(slug);
    if (!group || group.isArchived) {
      throw new NotFoundError('Study group not found');
    }

    return this.getGroupById(group.id, currentUserId, userRole);
  }

  async listGroups(
    filters: {
      skillId?: number;
      visibility?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    currentUserId?: number
  ): Promise<{ groups: StudyGroupWithDetails[]; total: number }> {
    const { groups, total } = await this.groupRepo.findMany(filters);
    const populated = await this.groupRepo.populateDetails(groups, currentUserId);
    return { groups: populated, total };
  }

  async getUserGroups(userId: number): Promise<StudyGroupWithDetails[]> {
    const memberships = await this.memberRepo.findByUser(userId, 'ACTIVE');
    if (memberships.length === 0) return [];

    const groupPromises = memberships.map((m) => this.groupRepo.findById(m.groupId));
    const groups = (await Promise.all(groupPromises)).filter(
      (g): g is StudyGroupRecord => g !== null && !g.isArchived
    );

    return this.groupRepo.populateDetails(groups, userId);
  }

  async joinPublicGroup(groupId: number, userId: number): Promise<StudyGroupMemberRecord> {
    const group = await this.groupRepo.findById(groupId);
    if (!group || group.isArchived) {
      throw new NotFoundError('Study group not found');
    }

    if (group.visibility !== 'PUBLIC') {
      throw new BadRequestError('This group is private. Please submit a join request instead.');
    }

    const existing = await this.memberRepo.findMember(groupId, userId);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictError('You are already an active member of this group.');
      }
      if (existing.status === 'REJECTED') {
        throw new ForbiddenError('Your previous membership request was rejected.');
      }
      // Re-activate if was previously pending
      const updated = await this.memberRepo.updateMember(groupId, userId, {
        status: 'ACTIVE',
        role: 'MEMBER',
      });
      await this.groupRepo.incrementMemberCount(groupId, 1);
      return updated!;
    }

    const newMember = await this.memberRepo.addMember({
      groupId,
      userId,
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    await this.groupRepo.incrementMemberCount(groupId, 1);
    return newMember;
  }

  async requestJoinPrivateGroup(groupId: number, userId: number): Promise<StudyGroupMemberRecord> {
    const group = await this.groupRepo.findById(groupId);
    if (!group || group.isArchived) {
      throw new NotFoundError('Study group not found');
    }

    if (group.visibility !== 'PRIVATE') {
      return this.joinPublicGroup(groupId, userId);
    }

    const existing = await this.memberRepo.findMember(groupId, userId);
    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictError('You are already an active member of this group.');
      }
      if (existing.status === 'PENDING') {
        return existing;
      }
      if (existing.status === 'REJECTED') {
        throw new ForbiddenError('Your membership request was previously rejected.');
      }
    }

    const newMember = await this.memberRepo.addMember({
      groupId,
      userId,
      role: 'MEMBER',
      status: 'PENDING',
    });

    // Notify group owner
    try {
      await this.notificationService.createNotification({
        userId: group.creatorId,
        type: 'GROUP_INVITE',
        title: 'New Study Group Join Request',
        message: `A user has requested to join your private study group "${group.name}".`,
        linkUrl: `/community/groups/${group.id}`,
      });
    } catch {
      // Non-blocking notification
    }

    return newMember;
  }

  async handleMemberAction(
    groupId: number,
    actorId: number,
    targetUserId: number,
    action: 'APPROVE' | 'REJECT' | 'PROMOTE_MODERATOR' | 'DEMOTE_MEMBER' | 'REMOVE',
    actorRole?: string
  ): Promise<{ success: boolean; message: string }> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new NotFoundError('Study group not found');

    const actorMembership = await this.memberRepo.findMember(groupId, actorId);
    const isGlobalAdmin = actorRole === 'ADMIN';
    const isGroupOwner = actorMembership?.role === 'OWNER';
    const isGroupMod = actorMembership?.role === 'MODERATOR' && actorMembership.status === 'ACTIVE';

    if (!isGlobalAdmin && !isGroupOwner && !isGroupMod) {
      throw new ForbiddenError('You do not have permission to manage members of this group.');
    }

    const targetMembership = await this.memberRepo.findMember(groupId, targetUserId);
    if (!targetMembership) {
      throw new NotFoundError('Target user membership record not found.');
    }

    if (action === 'APPROVE') {
      if (targetMembership.status === 'ACTIVE') {
        return { success: true, message: 'User is already an active member.' };
      }
      await this.memberRepo.updateMember(groupId, targetUserId, { status: 'ACTIVE' });
      await this.groupRepo.incrementMemberCount(groupId, 1);

      try {
        await this.notificationService.createNotification({
          userId: targetUserId,
          type: 'GROUP_INVITE',
          title: 'Study Group Request Approved! 🎉',
          message: `Your request to join "${group.name}" has been approved. Welcome to the study group!`,
          linkUrl: `/community/groups/${group.id}`,
        });
      } catch {
        // Non-blocking
      }

      return { success: true, message: 'Membership request approved.' };
    }

    if (action === 'REJECT') {
      await this.memberRepo.updateMember(groupId, targetUserId, { status: 'REJECTED' });
      return { success: true, message: 'Membership request rejected.' };
    }

    if (action === 'PROMOTE_MODERATOR') {
      if (!isGlobalAdmin && !isGroupOwner) {
        throw new ForbiddenError('Only the group owner can promote members to moderators.');
      }
      await this.memberRepo.updateMember(groupId, targetUserId, { role: 'MODERATOR' });
      return { success: true, message: 'Member promoted to group moderator.' };
    }

    if (action === 'DEMOTE_MEMBER') {
      if (!isGlobalAdmin && !isGroupOwner) {
        throw new ForbiddenError('Only the group owner can demote moderators.');
      }
      await this.memberRepo.updateMember(groupId, targetUserId, { role: 'MEMBER' });
      return { success: true, message: 'Moderator demoted to regular member.' };
    }

    if (action === 'REMOVE') {
      if (targetMembership.role === 'OWNER') {
        throw new ForbiddenError('The group owner cannot be removed.');
      }
      if (targetMembership.role === 'MODERATOR' && !isGlobalAdmin && !isGroupOwner) {
        throw new ForbiddenError('Moderators can only be removed by the group owner.');
      }
      await this.memberRepo.removeMember(groupId, targetUserId);
      if (targetMembership.status === 'ACTIVE') {
        await this.groupRepo.incrementMemberCount(groupId, -1);
      }
      return { success: true, message: 'Member removed from group.' };
    }

    throw new BadRequestError('Invalid member action.');
  }

  async leaveGroup(groupId: number, userId: number): Promise<{ success: boolean; message: string }> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new NotFoundError('Study group not found');

    const membership = await this.memberRepo.findMember(groupId, userId);
    if (!membership || membership.status !== 'ACTIVE') {
      throw new BadRequestError('You are not an active member of this group.');
    }

    if (membership.role === 'OWNER') {
      // Find other active members
      const activeMembers = await this.memberRepo.findByGroup(groupId, 'ACTIVE');
      const otherMembers = activeMembers.filter((m) => m.userId !== userId);

      if (otherMembers.length === 0) {
        // Last member leaving: archive group
        await this.memberRepo.removeMember(groupId, userId);
        await this.groupRepo.update(groupId, { isArchived: true, memberCount: 0 });
        return { success: true, message: 'You left the group. The group has been archived as no members remain.' };
      }

      // Transfer ownership to oldest moderator, or oldest member
      const nextOwner = otherMembers.find((m) => m.role === 'MODERATOR') || otherMembers[0];
      await this.memberRepo.updateMember(groupId, nextOwner.userId, { role: 'OWNER' });
      await this.groupRepo.update(groupId, { creatorId: nextOwner.userId });
    }

    await this.memberRepo.removeMember(groupId, userId);
    await this.groupRepo.incrementMemberCount(groupId, -1);
    return { success: true, message: 'You have left the study group.' };
  }

  async getMembers(
    groupId: number,
    status: string = 'ACTIVE',
    currentUserId?: number,
    userRole?: string
  ): Promise<StudyGroupMemberWithUser[]> {
    const group = await this.groupRepo.findById(groupId);
    if (!group) throw new NotFoundError('Study group not found');

    if (group.visibility === 'PRIVATE') {
      const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
      const myMembership = currentUserId ? await this.memberRepo.findMember(groupId, currentUserId) : null;
      if (!isPrivileged && myMembership?.status !== 'ACTIVE') {
        throw new ForbiddenError('You must be a member of this private group to view its member list.');
      }
    }

    const members = await this.memberRepo.findByGroup(groupId, status);
    return this.memberRepo.populateUsers(members);
  }

  async getUserActiveGroupIds(userId?: number): Promise<number[]> {
    if (!userId) return [];
    const memberships = await this.memberRepo.findByUser(userId, 'ACTIVE');
    return memberships.map((m) => m.groupId);
  }

  async canAccessGroup(groupId: number, userId?: number, userRole?: string): Promise<boolean> {
    const group = await this.groupRepo.findById(groupId);
    if (!group || group.isArchived) return false;
    if (group.visibility === 'PUBLIC') return true;
    if (userRole === 'ADMIN' || userRole === 'MODERATOR') return true;
    if (!userId) return false;
    const member = await this.memberRepo.findMember(groupId, userId);
    return member?.status === 'ACTIVE';
  }

  async canPostInGroup(groupId: number, userId: number, userRole?: string): Promise<boolean> {
    if (userRole === 'ADMIN') return true;
    const member = await this.memberRepo.findMember(groupId, userId);
    return member?.status === 'ACTIVE';
  }
}
