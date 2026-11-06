import { db } from '../prisma/db.js';
import { skillRepository } from './skill.repository.js';

export interface SessionRecord {
  id: number;
  swapRequestId: number;
  teacherId: number;
  learnerId: number;
  skillId: number;
  scheduledAt: string | null;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  duration: number;
  timezone: string | null;
  status: string; // SCHEDULED, IN_PROGRESS, COMPLETION_PENDING, COMPLETED, CANCELLED, DISPUTED, RESCHEDULE_PROPOSED
  meetingProvider: string | null;
  meetingRoomId: string | null;
  meetingUrl: string | null;
  notes: string | null;

  rescheduledBy: number | null;
  proposedAt: string | null;
  proposedStart: string | null;
  proposedEnd: string | null;
  rescheduleReason: string | null;

  completedBy: number | null;
  completedAt: string | null;
  completionConfirmedAt: string | null;

  disputedBy: number | null;
  disputeReason: string | null;

  cancelledBy: number | null;
  cancellationReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface SessionUserSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface SessionWithDetails extends SessionRecord {
  teacher: SessionUserSummary;
  learner: SessionUserSummary;
  skill: {
    id: number;
    name: string;
    category: string;
  };
  swapRequest?: {
    id: number;
    status: string;
    senderId: number;
    receiverId: number;
    senderSkillId: number;
    receiverSkillId: number;
  };
}

export class SessionRepository {
  async findById(id: number, client: any = db): Promise<SessionRecord | null> {
    const record = await client.orm.public.Session.where({ id }).first();
    return record as unknown as SessionRecord | null;
  }

  async findBySwapRequestId(swapRequestId: number, client: any = db): Promise<SessionRecord[]> {
    const records = await client.orm.public.Session.where({ swapRequestId }).all();
    return records as unknown as SessionRecord[];
  }

  async create(
    data: {
      swapRequestId: number;
      teacherId: number;
      learnerId: number;
      skillId: number;
      scheduledStart: string;
      scheduledEnd: string;
      duration: number;
      timezone?: string;
      status?: string;
      meetingProvider?: string;
      meetingRoomId?: string;
      meetingUrl?: string;
      notes?: string | null;
    },
    client: any = db
  ): Promise<SessionRecord> {
    const record = await client.orm.public.Session.create({
      swapRequestId: data.swapRequestId,
      teacherId: data.teacherId,
      learnerId: data.learnerId,
      skillId: data.skillId,
      scheduledAt: data.scheduledStart,
      scheduledStart: data.scheduledStart,
      scheduledEnd: data.scheduledEnd,
      duration: data.duration,
      timezone: data.timezone || 'UTC',
      status: data.status || 'SCHEDULED',
      meetingProvider: data.meetingProvider || 'Jitsi',
      meetingRoomId: data.meetingRoomId || null,
      meetingUrl: data.meetingUrl || null,
      notes: data.notes || null,
    });
    return record as unknown as SessionRecord;
  }

  async update(
    id: number,
    data: Partial<Omit<SessionRecord, 'id' | 'createdAt' | 'updatedAt'>>,
    client: any = db
  ): Promise<SessionRecord> {
    const record = await client.orm.public.Session.where({ id }).update(data);
    return record as unknown as SessionRecord;
  }

  /**
   * Finds conflicting active sessions for a user within a target time window.
   */
  async findConflictingSessions(
    userId: number,
    newStartIso: string,
    newEndIso: string,
    excludeSessionId?: number,
    client: any = db
  ): Promise<SessionRecord[]> {
    const activeStatuses = [
      'SCHEDULED',
      'IN_PROGRESS',
      'COMPLETION_PENDING',
      'RESCHEDULE_PROPOSED',
      'REQUESTED',
    ];

    const allSessions = await client.orm.public.Session.all();
    const newStart = new Date(newStartIso).getTime();
    const newEnd = new Date(newEndIso).getTime();

    const conflicts: SessionRecord[] = [];

    for (const s of allSessions as any[]) {
      if (excludeSessionId && s.id === excludeSessionId) continue;
      if (!activeStatuses.includes(s.status)) continue;

      // Must involve this user
      if (s.teacherId !== userId && s.learnerId !== userId) continue;

      const sStart = new Date(s.scheduledStart || s.scheduledAt).getTime();
      const sEnd = s.scheduledEnd
        ? new Date(s.scheduledEnd).getTime()
        : sStart + (s.duration || 60) * 60 * 1000;

      // Check standard interval intersection: startA < endB && endA > startB
      if (sStart < newEnd && sEnd > newStart) {
        conflicts.push(s as SessionRecord);
      }
    }

    return conflicts;
  }

  /**
   * Populates teacher, learner, skill, and swapRequest details for sessions.
   */
  async populateDetails(
    records: SessionRecord[],
    client: any = db
  ): Promise<SessionWithDetails[]> {
    if (!records || records.length === 0) return [];

    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map(allSkills.map((s) => [s.id, { id: s.id, name: s.name, category: s.category }]));

    const userIds = new Set<number>();
    const swapRequestIds = new Set<number>();
    for (const r of records) {
      userIds.add(r.teacherId);
      userIds.add(r.learnerId);
      if (r.swapRequestId) swapRequestIds.add(r.swapRequestId);
    }

    // Targeted parallel lookups for participating users (avoids full-table scan on User)
    const userMap = new Map<number, SessionUserSummary>();
    await Promise.all(
      Array.from(userIds).map(async (uid) => {
        const u = (await client.orm.public.User.where({ id: uid }).first()) as any;
        if (u) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl || null,
          });
        }
      })
    );

    // Targeted lookups for linked swap requests
    const swapMap = new Map<number, any>();
    await Promise.all(
      Array.from(swapRequestIds).map(async (srId) => {
        const sr = await client.orm.public.SwapRequest.where({ id: srId }).first();
        if (sr) {
          swapMap.set(sr.id, sr);
        }
      })
    );

    return records.map((r) => ({
      ...r,
      teacher: userMap.get(r.teacherId) || {
        id: r.teacherId,
        name: 'Teacher',
        username: 'teacher',
        avatarUrl: null,
      },
      learner: userMap.get(r.learnerId) || {
        id: r.learnerId,
        name: 'Learner',
        username: 'learner',
        avatarUrl: null,
      },
      skill: skillMap.get(r.skillId) || {
        id: r.skillId,
        name: 'Skill',
        category: 'General',
      },
      swapRequest: swapMap.get(r.swapRequestId) || undefined,
    }));
  }

  /**
   * Retrieves all sessions for a user, sorted chronologically with details populated.
   */
  async findByUser(
    userId: number,
    options: {
      status?: string;
      role?: 'teacher' | 'learner';
      filter?: 'upcoming' | 'past' | 'all';
      swapRequestId?: number;
    } = {},
    client: any = db
  ): Promise<SessionWithDetails[]> {
    const all = await client.orm.public.Session.all();
    let records = (all as any[]).filter(
      (s) => s.teacherId === userId || s.learnerId === userId
    ) as SessionRecord[];

    if (options.swapRequestId) {
      records = records.filter((s) => s.swapRequestId === options.swapRequestId);
    }

    if (options.role === 'teacher') {
      records = records.filter((s) => s.teacherId === userId);
    } else if (options.role === 'learner') {
      records = records.filter((s) => s.learnerId === userId);
    }

    if (options.status) {
      records = records.filter((s) => s.status === options.status);
    }

    const now = Date.now();
    if (options.filter === 'upcoming') {
      records = records.filter((s) => {
        const endTime = s.scheduledEnd
          ? new Date(s.scheduledEnd).getTime()
          : new Date(s.scheduledStart || s.scheduledAt!).getTime() + (s.duration || 60) * 60 * 1000;
        return (
          ['SCHEDULED', 'IN_PROGRESS', 'RESCHEDULE_PROPOSED', 'REQUESTED'].includes(s.status) &&
          endTime >= now - 15 * 60 * 1000 // up to 15 min past end is considered in upcoming/active
        );
      });
      // Sort upcoming ascending (soonest first)
      records.sort((a, b) => {
        const timeA = new Date(a.scheduledStart || a.scheduledAt!).getTime();
        const timeB = new Date(b.scheduledStart || b.scheduledAt!).getTime();
        return timeA - timeB;
      });
    } else if (options.filter === 'past') {
      records = records.filter((s) => {
        const endTime = s.scheduledEnd
          ? new Date(s.scheduledEnd).getTime()
          : new Date(s.scheduledStart || s.scheduledAt!).getTime() + (s.duration || 60) * 60 * 1000;
        return (
          ['COMPLETED', 'CANCELLED', 'DISPUTED', 'COMPLETION_PENDING'].includes(s.status) ||
          endTime < now - 15 * 60 * 1000
        );
      });
      // Sort past descending (most recent first)
      records.sort((a, b) => {
        const timeA = new Date(a.scheduledStart || a.scheduledAt!).getTime();
        const timeB = new Date(b.scheduledStart || b.scheduledAt!).getTime();
        return timeB - timeA;
      });
    } else {
      // Default: sort descending by scheduled date
      records.sort((a, b) => {
        const timeA = new Date(a.scheduledStart || a.scheduledAt!).getTime();
        const timeB = new Date(b.scheduledStart || b.scheduledAt!).getTime();
        return timeB - timeA;
      });
    }

    return this.populateDetails(records, client);
  }

  /**
   * Checks whether both reciprocal directions have at least one COMPLETED session.
   */
  async checkReciprocalCompletion(
    swapRequestId: number,
    client: any = db
  ): Promise<{
    hasDirection1: boolean;
    hasDirection2: boolean;
    isFullyCompleted: boolean;
    completedCount: number;
  }> {
    const swap = await client.orm.public.SwapRequest.where({ id: swapRequestId }).first();
    if (!swap) {
      return { hasDirection1: false, hasDirection2: false, isFullyCompleted: false, completedCount: 0 };
    }

    const sessions = await this.findBySwapRequestId(swapRequestId, client);
    const completed = sessions.filter((s) => s.status === 'COMPLETED');

    // Direction 1: Sender teaches receiver
    const hasDirection1 = completed.some(
      (s) =>
        s.teacherId === swap.senderId &&
        s.learnerId === swap.receiverId &&
        s.skillId === swap.senderSkillId
    );

    // Direction 2: Receiver teaches sender
    const hasDirection2 = completed.some(
      (s) =>
        s.teacherId === swap.receiverId &&
        s.learnerId === swap.senderId &&
        s.skillId === swap.receiverSkillId
    );

    return {
      hasDirection1,
      hasDirection2,
      isFullyCompleted: hasDirection1 && hasDirection2,
      completedCount: completed.length,
    };
  }
}

export const sessionRepository = new SessionRepository();

