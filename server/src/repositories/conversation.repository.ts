import { db } from '../prisma/db.js';
import { messageRepository } from './message.repository.js';
import { skillRepository } from './skill.repository.js';

export interface ConversationRecord {
  id: number;
  swapRequestId: number | null;
  status: string; // ACTIVE, READ_ONLY
  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipantRecord {
  id: number;
  conversationId: number;
  userId: number;
  joinedAt: string;
  lastReadAt: string | null;
}

export interface ConversationPeerSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
  initials: string;
  isOnline?: boolean;
}

export interface ConversationSwapRequestSummary {
  id: number;
  status: string;
  senderSkillName: string;
  receiverSkillName: string;
}

export interface ConversationSummary {
  id: number;
  swapRequestId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string | null;
  unreadCount: number;
  peer: ConversationPeerSummary;
  swapRequest?: ConversationSwapRequestSummary | null;
  latestMessage?: {
    id: number;
    conversationId: number;
    senderId: number;
    content: string;
    createdAt: string;
    readAt: string | null;
  } | null;
}

function computeInitials(name: string): string {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??';
}

export class ConversationRepository {
  async findById(id: number, client: any = db): Promise<ConversationRecord | null> {
    const record = await client.orm.public.Conversation.where({ id }).first();
    return record as unknown as ConversationRecord | null;
  }

  async findBySwapRequestId(swapRequestId: number, client: any = db): Promise<ConversationRecord | null> {
    const record = await client.orm.public.Conversation.where({ swapRequestId }).first();
    return record as unknown as ConversationRecord | null;
  }

  async create(
    data: { swapRequestId?: number; status?: string },
    client: any = db
  ): Promise<ConversationRecord> {
    const record = await client.orm.public.Conversation.create({
      swapRequestId: data.swapRequestId || null,
      status: data.status || 'ACTIVE',
    });
    return record as unknown as ConversationRecord;
  }

  async updateStatus(
    id: number,
    status: string,
    client: any = db
  ): Promise<ConversationRecord> {
    const record = await client.orm.public.Conversation.where({ id }).update({
      status,
    });
    return record as unknown as ConversationRecord;
  }

  async addParticipant(
    conversationId: number,
    userId: number,
    client: any = db
  ): Promise<ConversationParticipantRecord> {
    // Check if participant already exists
    const existing = await client.orm.public.ConversationParticipant.where({
      conversationId,
      userId,
    }).first();

    if (existing) {
      return existing as unknown as ConversationParticipantRecord;
    }

    const record = await client.orm.public.ConversationParticipant.create({
      conversationId,
      userId,
    });
    return record as unknown as ConversationParticipantRecord;
  }

  async getParticipants(
    conversationId: number,
    client: any = db
  ): Promise<ConversationParticipantRecord[]> {
    const records = await client.orm.public.ConversationParticipant.where({
      conversationId,
    }).all();
    return records as unknown as ConversationParticipantRecord[];
  }

  async isParticipant(
    conversationId: number,
    userId: number,
    client: any = db
  ): Promise<boolean> {
    const record = await client.orm.public.ConversationParticipant.where({
      conversationId,
      userId,
    }).first();
    return !!record;
  }

  async updateLastRead(
    conversationId: number,
    userId: number,
    timestamp?: string,
    client: any = db
  ): Promise<void> {
    const now = timestamp || new Date().toISOString();
    const participant = await client.orm.public.ConversationParticipant.where({
      conversationId,
      userId,
    }).first();

    if (participant) {
      await client.orm.public.ConversationParticipant.where({
        id: participant.id,
      }).update({
        lastReadAt: now,
      });
    }
  }

  /**
   * Atomically creates a conversation (or retrieves existing) and adds participants idempotently.
   */
  async createWithParticipants(
    swapRequestId: number,
    participantUserIds: number[],
    client: any = db
  ): Promise<ConversationRecord> {
    let conversation = await this.findBySwapRequestId(swapRequestId, client);
    if (!conversation) {
      conversation = await this.create({ swapRequestId, status: 'ACTIVE' }, client);
    }

    for (const userId of participantUserIds) {
      await this.addParticipant(conversation.id, userId, client);
    }

    return conversation;
  }

  /**
   * Retrieves all conversations for a user with peer profile, latest message, and unread counts.
   */
  async findUserConversations(
    userId: number,
    client: any = db
  ): Promise<ConversationSummary[]> {
    // 1. Get all memberships for userId
    const userMemberships = await client.orm.public.ConversationParticipant.where({
      userId,
    }).all();

    if (!userMemberships || userMemberships.length === 0) {
      return [];
    }

    // 2. Pre-fetch all skills for name lookup
    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map<number, string>(allSkills.map((s) => [s.id, s.name]));

    const summaries: ConversationSummary[] = [];

    for (const membership of userMemberships as any[]) {
      const conv = await this.findById(membership.conversationId, client);
      if (!conv) continue;

      // Find all participants in this conversation
      const participants = await this.getParticipants(conv.id, client);
      const peerParticipant = participants.find((p) => p.userId !== userId);

      // If no peer participant found yet (edge case), use placeholder
      let peerSummary: ConversationPeerSummary = {
        id: 0,
        name: 'Unknown User',
        username: 'unknown',
        avatarUrl: null,
        initials: '??',
      };

      if (peerParticipant) {
        const peerUser = await client.orm.public.User.where({ id: peerParticipant.userId }).first();
        if (peerUser) {
          peerSummary = {
            id: peerUser.id,
            name: peerUser.name,
            username: peerUser.username,
            avatarUrl: peerUser.avatarUrl || null,
            initials: computeInitials(peerUser.name),
          };
        }
      }

      // Check linked swap request details if applicable
      let swapRequestSummary: ConversationSwapRequestSummary | null = null;
      if (conv.swapRequestId) {
        const sr = await client.orm.public.SwapRequest.where({ id: conv.swapRequestId }).first();
        if (sr) {
          swapRequestSummary = {
            id: sr.id,
            status: sr.status,
            senderSkillName: skillMap.get(sr.senderSkillId) || 'Unknown Skill',
            receiverSkillName: skillMap.get(sr.receiverSkillId) || 'Unknown Skill',
          };
        }
      }

      // Get latest message in conversation
      const latestMsg = await messageRepository.findLatestInConversation(conv.id, client);

      // Get unread count for current user
      const unreadCount = await messageRepository.countUnreadInConversation(
        conv.id,
        userId,
        membership.lastReadAt,
        client
      );

      summaries.push({
        id: conv.id,
        swapRequestId: conv.swapRequestId,
        status: conv.status,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        lastReadAt: membership.lastReadAt,
        unreadCount,
        peer: peerSummary,
        swapRequest: swapRequestSummary,
        latestMessage: latestMsg
          ? {
              id: latestMsg.id,
              conversationId: latestMsg.conversationId,
              senderId: latestMsg.senderId,
              content: latestMsg.content,
              createdAt: latestMsg.createdAt,
              readAt: latestMsg.readAt,
            }
          : null,
      });
    }

    // Sort by latest message createdAt descending, or conv.updatedAt descending
    summaries.sort((a, b) => {
      const timeA = a.latestMessage
        ? new Date(a.latestMessage.createdAt).getTime()
        : new Date(a.updatedAt).getTime();
      const timeB = b.latestMessage
        ? new Date(b.latestMessage.createdAt).getTime()
        : new Date(b.updatedAt).getTime();
      return timeB - timeA;
    });

    return summaries;
  }

  /**
   * Total unread messages across all conversations for a user.
   */
  async countTotalUnreadForUser(userId: number, client: any = db): Promise<number> {
    const memberships = await client.orm.public.ConversationParticipant.where({
      userId,
    }).all();

    let total = 0;
    for (const m of memberships as any[]) {
      const count = await messageRepository.countUnreadInConversation(
        m.conversationId,
        userId,
        m.lastReadAt,
        client
      );
      total += count;
    }

    return total;
  }
}

export const conversationRepository = new ConversationRepository();
