import { db } from '../../prisma/db.js';
import type { AuthorSummary } from '../communityPost.repository.js';
import { userRepository } from '../user.repository.js';

export interface GroupSessionRecord {
  id: number;
  groupId: number;
  hostId: number;
  title: string;
  description: string | null;
  topic: string | null;
  startTime: string;
  endTime: string;
  timezone: string;
  maxParticipants: number;
  status: string; // SCHEDULED, LIVE, COMPLETED, CANCELED
  meetingRoomId: string | null;
  meetingUrl: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupSessionWithDetails extends GroupSessionRecord {
  host: AuthorSummary;
  participantCount?: number;
  userRegistered?: boolean;
}

export class GroupSessionRepository {
  async create(data: {
    groupId: number;
    hostId: number;
    title: string;
    description?: string | null;
    topic?: string | null;
    startTime: string;
    endTime: string;
    timezone?: string;
    maxParticipants?: number;
    status?: string;
    meetingRoomId?: string | null;
    meetingUrl?: string | null;
  }): Promise<GroupSessionRecord> {
    const session = await db.orm.public.GroupSession.create({
      groupId: data.groupId,
      hostId: data.hostId,
      title: data.title,
      description: data.description ?? null,
      topic: data.topic ?? null,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timezone || 'UTC',
      maxParticipants: data.maxParticipants || 20,
      status: data.status || 'SCHEDULED',
      meetingRoomId: data.meetingRoomId ?? null,
      meetingUrl: data.meetingUrl ?? null,
    });

    return session as unknown as GroupSessionRecord;
  }

  async findById(id: number): Promise<GroupSessionRecord | null> {
    const session = await db.orm.public.GroupSession.where({ id }).first();
    return (session as unknown as GroupSessionRecord) || null;
  }

  async findByGroup(
    groupId: number,
    options?: { status?: string }
  ): Promise<GroupSessionRecord[]> {
    let sessions = (await db.orm.public.GroupSession.where({
      groupId,
    }).all()) as unknown as GroupSessionRecord[];

    if (options?.status) {
      sessions = sessions.filter((s) => s.status === options.status);
    }

    // Sort by startTime ascending
    return sessions.sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  async findByHost(hostId: number): Promise<GroupSessionRecord[]> {
    const sessions = (await db.orm.public.GroupSession.where({
      hostId,
    }).all()) as unknown as GroupSessionRecord[];

    return sessions;
  }

  async update(
    id: number,
    data: Partial<{
      title: string;
      description: string | null;
      topic: string | null;
      startTime: string;
      endTime: string;
      timezone: string;
      maxParticipants: number;
      status: string;
      meetingRoomId: string | null;
      meetingUrl: string | null;
      cancellationReason: string | null;
    }>
  ): Promise<GroupSessionRecord | null> {
    const updated = await db.orm.public.GroupSession.where({ id }).update(data);
    return (updated as unknown as GroupSessionRecord) || null;
  }

  async delete(id: number): Promise<boolean> {
    await db.orm.public.GroupSession.where({ id }).delete();
    return true;
  }

  async enrichWithHost(session: GroupSessionRecord): Promise<GroupSessionWithDetails> {
    const host = await userRepository.findById(session.hostId);
    return {
      ...session,
      host: {
        id: host?.id || session.hostId,
        name: host?.name || 'Unknown Host',
        username: host?.username || 'unknown',
        avatarUrl: host?.avatarUrl || null,
      },
    };
  }
}

export const groupSessionRepository = new GroupSessionRepository();

