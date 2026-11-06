import { db } from '../prisma/db.js';
import { skillRepository } from './skill.repository.js';

export interface SwapRequestRecord {
  id: number;
  senderId: number;
  receiverId: number;
  senderSkillId: number;
  receiverSkillId: number;
  status: string; // PENDING, ACCEPTED, REJECTED, CANCELLED, IN_PROGRESS, COMPLETED, DISPUTED
  message: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SwapRequestUserSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  averageRating: number;
}

export interface SwapRequestSkillSummary {
  id: number;
  name: string;
  category: string;
}

export interface SwapRequestWithDetails extends SwapRequestRecord {
  sender: SwapRequestUserSummary;
  receiver: SwapRequestUserSummary;
  senderSkill: SwapRequestSkillSummary;
  receiverSkill: SwapRequestSkillSummary;
  conversationId?: number | null;
}

export class SwapRequestRepository {
  async findById(id: number, client: any = db): Promise<SwapRequestRecord | null> {
    const record = await client.orm.public.SwapRequest.where({ id }).first();
    return record as unknown as SwapRequestRecord | null;
  }

  async create(
    data: {
      senderId: number;
      receiverId: number;
      senderSkillId: number;
      receiverSkillId: number;
      message?: string | null;
    },
    client: any = db
  ): Promise<SwapRequestRecord> {
    const created = await client.orm.public.SwapRequest.create({
      senderId: data.senderId,
      receiverId: data.receiverId,
      senderSkillId: data.senderSkillId,
      receiverSkillId: data.receiverSkillId,
      status: 'PENDING',
      message: data.message || null,
    });
    return created as unknown as SwapRequestRecord;
  }

  async updateStatus(id: number, status: string, client: any = db): Promise<SwapRequestRecord> {
    const updated = await client.orm.public.SwapRequest.where({ id }).update({ status });
    return updated as unknown as SwapRequestRecord;
  }

  async update(id: number, data: Record<string, any>, client: any = db): Promise<SwapRequestRecord> {
    const updated = await client.orm.public.SwapRequest.where({ id }).update(data);
    return updated as unknown as SwapRequestRecord;
  }

  /**
   * Checks if an active swap request or agreement exists between two users in either direction.
   * Active statuses: PENDING, ACCEPTED, IN_PROGRESS
   */
  async findActiveBetweenUsers(userA: number, userB: number, client: any = db): Promise<SwapRequestRecord | null> {
    const activeStatuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS'];
    
    // Check direction A -> B
    const sent = await client.orm.public.SwapRequest.where({
      senderId: userA,
      receiverId: userB,
    }).all();
    for (const r of sent as any[]) {
      if (activeStatuses.includes(r.status)) {
        return r as SwapRequestRecord;
      }
    }

    // Check direction B -> A
    const received = await client.orm.public.SwapRequest.where({
      senderId: userB,
      receiverId: userA,
    }).all();
    for (const r of received as any[]) {
      if (activeStatuses.includes(r.status)) {
        return r as SwapRequestRecord;
      }
    }

    return null;
  }

  /**
   * Helper to populate user and skill details for a list of SwapRequest records.
   */
  private async populateDetails(
    records: SwapRequestRecord[],
    client: any = db
  ): Promise<SwapRequestWithDetails[]> {
    if (!records || records.length === 0) return [];

    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map<number, SwapRequestSkillSummary>(
      allSkills.map((s) => [s.id, { id: s.id, name: s.name, category: s.category }])
    );

    // Collect all unique user IDs and swap request IDs
    const userIds = new Set<number>();
    const swapIds = new Set<number>();
    for (const r of records) {
      userIds.add(r.senderId);
      userIds.add(r.receiverId);
      swapIds.add(r.id);
    }

    // Targeted parallel lookups for required users only (avoids full-table scan on User)
    const userMap = new Map<number, SwapRequestUserSummary>();
    await Promise.all(
      Array.from(userIds).map(async (uid) => {
        const u = (await client.orm.public.User.where({ id: uid }).first()) as any;
        if (u) {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            username: u.username,
            avatarUrl: u.avatarUrl || null,
            averageRating: Number(u.averageRating) || 0,
          });
        }
      })
    );

    // Targeted lookups for linked conversations
    const conversationMap = new Map<number, number>();
    await Promise.all(
      Array.from(swapIds).map(async (sId) => {
        const c = (await client.orm.public.Conversation.where({ swapRequestId: sId }).first()) as any;
        if (c) {
          conversationMap.set(sId, c.id);
        }
      })
    );

    return records.map((r) => ({
      ...r,
      sender: userMap.get(r.senderId) || {
        id: r.senderId,
        name: 'Unknown User',
        username: 'unknown',
        avatarUrl: null,
        averageRating: 0,
      },
      receiver: userMap.get(r.receiverId) || {
        id: r.receiverId,
        name: 'Unknown User',
        username: 'unknown',
        avatarUrl: null,
        averageRating: 0,
      },
      senderSkill: skillMap.get(r.senderSkillId) || {
        id: r.senderSkillId,
        name: 'Unknown Skill',
        category: 'General',
      },
      receiverSkill: skillMap.get(r.receiverSkillId) || {
        id: r.receiverSkillId,
        name: 'Unknown Skill',
        category: 'General',
      },
      conversationId: conversationMap.get(r.id) || null,
    }));
  }

  async findIncoming(userId: number, client: any = db): Promise<SwapRequestWithDetails[]> {
    const records = await client.orm.public.SwapRequest.where({ receiverId: userId }).all();
    const list = (records as any[] as SwapRequestRecord[]).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return this.populateDetails(list, client);
  }

  async findOutgoing(userId: number, client: any = db): Promise<SwapRequestWithDetails[]> {
    const records = await client.orm.public.SwapRequest.where({ senderId: userId }).all();
    const list = (records as any[] as SwapRequestRecord[]).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return this.populateDetails(list, client);
  }

  async countPendingIncoming(userId: number, client: any = db): Promise<number> {
    const records = await client.orm.public.SwapRequest.where({
      receiverId: userId,
      status: 'PENDING',
    }).all();
    return (records as any[]).length;
  }
}

export const swapRequestRepository = new SwapRequestRepository();

