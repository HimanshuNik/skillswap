import { db } from '../prisma/db.js';
import type { AuthorSummary } from './communityPost.repository.js';

export interface StudyGroupMemberRecord {
  id: number;
  groupId: number;
  userId: number;
  role: string; // OWNER, MODERATOR, MEMBER
  status: string; // ACTIVE, PENDING, REJECTED
  joinedAt: string;
  updatedAt: string;
}

export interface StudyGroupMemberWithUser extends StudyGroupMemberRecord {
  user: AuthorSummary;
}

export class StudyGroupMemberRepository {
  async addMember(data: {
    groupId: number;
    userId: number;
    role?: string;
    status?: string;
  }): Promise<StudyGroupMemberRecord> {
    const member = await db.orm.public.StudyGroupMember.create({
      groupId: data.groupId,
      userId: data.userId,
      role: data.role || 'MEMBER',
      status: data.status || 'ACTIVE',
    });

    return member as unknown as StudyGroupMemberRecord;
  }

  async findMember(groupId: number, userId: number): Promise<StudyGroupMemberRecord | null> {
    const member = await db.orm.public.StudyGroupMember.where({
      groupId,
      userId,
    }).first();

    return member as unknown as StudyGroupMemberRecord | null;
  }

  async findByGroup(groupId: number, status?: string): Promise<StudyGroupMemberRecord[]> {
    let members = (await db.orm.public.StudyGroupMember.where({ groupId }).all()) as unknown as StudyGroupMemberRecord[];

    if (status) {
      members = members.filter((m) => m.status === status);
    }

    return members;
  }

  async findByUser(userId: number, status: string = 'ACTIVE'): Promise<StudyGroupMemberRecord[]> {
    const members = (await db.orm.public.StudyGroupMember.where({ userId }).all()) as unknown as StudyGroupMemberRecord[];
    return members.filter((m) => m.status === status);
  }

  async updateMember(
    groupId: number,
    userId: number,
    data: Partial<Pick<StudyGroupMemberRecord, 'role' | 'status'>>
  ): Promise<StudyGroupMemberRecord | null> {
    const updated = await db.orm.public.StudyGroupMember.where({ groupId, userId }).update({
      ...(data.role !== undefined && { role: data.role }),
      ...(data.status !== undefined && { status: data.status }),
    });

    return (updated as unknown as StudyGroupMemberRecord) || null;
  }

  async removeMember(groupId: number, userId: number): Promise<void> {
    await db.orm.public.StudyGroupMember.where({ groupId, userId }).delete();
  }

  async populateUsers(members: StudyGroupMemberRecord[]): Promise<StudyGroupMemberWithUser[]> {
    if (members.length === 0) return [];

    const userIds = [...new Set(members.map((m) => m.userId))];
    const allUsers = (await db.orm.public.User.all()) as any[];

    const userMap = new Map(
      allUsers.map((u) => [
        u.id,
        { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl || null },
      ])
    );

    return members.map((m) => ({
      ...m,
      user: userMap.get(m.userId) || {
        id: m.userId,
        name: 'Group Member',
        username: `user_${m.userId}`,
        avatarUrl: null,
      },
    }));
  }
}

export const studyGroupMemberRepository = new StudyGroupMemberRepository();
