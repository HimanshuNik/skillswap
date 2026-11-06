import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupParticipantRecord {
  id: number;
  sessionId: number;
  userId: number;
  status: string; // REGISTERED, WAITLIST, ATTENDED, ABSENT, CANCELLED
  isVerifiedAttendance: boolean;
  joinedAt: string | null;
  leftAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupParticipantWithUser extends GroupParticipantRecord {
  user: AuthorSummary;
}

export class GroupParticipantRepository {
  async register(data: {
    sessionId: number;
    userId: number;
    status?: string;
  }): Promise<GroupParticipantRecord> {
    const participant = await db.orm.public.GroupSessionParticipant.create({
      sessionId: data.sessionId,
      userId: data.userId,
      status: data.status || 'REGISTERED',
      isVerifiedAttendance: false,
    });

    return participant as unknown as GroupParticipantRecord;
  }

  async findParticipant(sessionId: number, userId: number): Promise<GroupParticipantRecord | null> {
    const p = await db.orm.public.GroupSessionParticipant.where({
      sessionId,
      userId,
    }).first();

    return (p as unknown as GroupParticipantRecord) || null;
  }

  async findBySession(sessionId: number, status?: string): Promise<GroupParticipantRecord[]> {
    let list = (await db.orm.public.GroupSessionParticipant.where({
      sessionId,
    }).all()) as unknown as GroupParticipantRecord[];

    if (status) {
      list = list.filter((p) => p.status === status);
    }

    return list;
  }

  async countBySession(sessionId: number, status: string = 'REGISTERED'): Promise<number> {
    const list = await this.findBySession(sessionId, status);
    return list.length;
  }

  async update(
    id: number,
    data: Partial<{
      status: string;
      isVerifiedAttendance: boolean;
      joinedAt: string | null;
      leftAt: string | null;
      notes: string | null;
    }>
  ): Promise<GroupParticipantRecord | null> {
    const updated = await db.orm.public.GroupSessionParticipant.where({ id }).update(data);
    return (updated as unknown as GroupParticipantRecord) || null;
  }

  async delete(sessionId: number, userId: number): Promise<boolean> {
    const p = await this.findParticipant(sessionId, userId);
    if (!p) return false;
    await db.orm.public.GroupSessionParticipant.where({ id: p.id }).delete();
    return true;
  }

  async enrichWithUsers(list: GroupParticipantRecord[]): Promise<GroupParticipantWithUser[]> {
    const results: GroupParticipantWithUser[] = [];
    for (const item of list) {
      const u = await userRepository.findById(item.userId);
      results.push({
        ...item,
        user: {
          id: u?.id || item.userId,
          name: u?.name || 'Member',
          username: u?.username || 'member',
          avatarUrl: u?.avatarUrl || null,
        },
      });
    }
    return results;
  }
}

export const groupParticipantRepository = new GroupParticipantRepository();

