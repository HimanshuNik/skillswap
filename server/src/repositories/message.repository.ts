import { db } from '../prisma/db.js';

export interface MessageRecord {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export class MessageRepository {
  async create(
    data: {
      conversationId: number;
      senderId: number;
      content: string;
    },
    client: any = db
  ): Promise<MessageRecord> {
    const record = await client.orm.public.Message.create({
      conversationId: data.conversationId,
      senderId: data.senderId,
      content: data.content,
    });
    return record as unknown as MessageRecord;
  }

  async findById(id: number, client: any = db): Promise<MessageRecord | null> {
    const record = await client.orm.public.Message.where({ id }).first();
    return record as unknown as MessageRecord | null;
  }

  async findByConversation(
    conversationId: number,
    options: { limit?: number; beforeId?: number } = {},
    client: any = db
  ): Promise<MessageRecord[]> {
    const limit = Math.min(100, Math.max(1, options.limit || 50));
    const all = await client.orm.public.Message.where({ conversationId }).all();
    let records = all as any[] as MessageRecord[];

    // Sort chronologically ascending
    records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // If cursor beforeId is provided, filter for messages with id < beforeId
    if (options.beforeId) {
      const idx = records.findIndex((m) => m.id === options.beforeId);
      if (idx !== -1) {
        records = records.slice(0, idx);
      }
    }

    // Take the most recent `limit` messages
    if (records.length > limit) {
      records = records.slice(records.length - limit);
    }

    return records;
  }

  async findLatestInConversation(
    conversationId: number,
    client: any = db
  ): Promise<MessageRecord | null> {
    const all = await client.orm.public.Message.where({ conversationId }).all();
    const records = all as any[] as MessageRecord[];
    if (records.length === 0) return null;

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records[0];
  }

  async markMessagesAsRead(
    conversationId: number,
    readerId: number,
    client: any = db
  ): Promise<number> {
    const all = await client.orm.public.Message.where({ conversationId }).all();
    let count = 0;
    const now = new Date().toISOString();

    for (const msg of all as any[]) {
      if (msg.senderId !== readerId && !msg.readAt) {
        await client.orm.public.Message.where({ id: msg.id }).update({ readAt: now });
        count++;
      }
    }

    return count;
  }

  async countUnreadInConversation(
    conversationId: number,
    readerId: number,
    lastReadAt: string | null = null,
    client: any = db
  ): Promise<number> {
    const all = await client.orm.public.Message.where({ conversationId }).all();
    let unread = 0;

    for (const msg of all as any[]) {
      if (msg.senderId !== readerId) {
        if (!msg.readAt) {
          unread++;
        } else if (lastReadAt && new Date(msg.createdAt).getTime() > new Date(lastReadAt).getTime()) {
          unread++;
        }
      }
    }

    return unread;
  }
}

export const messageRepository = new MessageRepository();

