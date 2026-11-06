import { db } from '../prisma/db.js';

export interface NotificationRecord {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl: string | null;
  referenceId: number | null;
  referenceType: string | null;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  readAt: string | null;
  createdAt: string;
}

export class NotificationRepository {
  async findById(id: number, client: any = db): Promise<NotificationRecord | null> {
    const record = await client.orm.public.Notification.where({ id }).first();
    return record as unknown as NotificationRecord | null;
  }

  async findByUser(
    userId: number,
    options: {
      limit?: number;
      page?: number;
      unreadOnly?: boolean;
    } = {},
    client: any = db
  ): Promise<{ notifications: NotificationRecord[]; total: number; unreadCount: number; page: number; limit: number }> {
    const limit = Math.max(1, Math.min(options.limit || 20, 100));
    const page = Math.max(1, options.page || 1);
    const offset = (page - 1) * limit;

    const all = await client.orm.public.Notification.where({ userId }).all();
    let records = (all as any[]) as NotificationRecord[];

    const unreadCount = records.filter((n) => !n.isRead).length;

    if (options.unreadOnly) {
      records = records.filter((n) => !n.isRead);
    }

    // Sort newest first
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = records.length;
    const paginated = records.slice(offset, offset + limit);

    return {
      notifications: paginated,
      total,
      unreadCount,
      page,
      limit,
    };
  }

  async countUnread(userId: number, client: any = db): Promise<number> {
    const records = await client.orm.public.Notification.where({
      userId,
      isRead: false,
    }).all();
    return records.length;
  }

  async create(
    data: {
      userId: number;
      type: string;
      title: string;
      message: string;
      linkUrl?: string | null;
      relatedEntityType?: string | null;
      relatedEntityId?: number | null;
    },
    client: any = db
  ): Promise<NotificationRecord> {
    const created = await client.orm.public.Notification.create({
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      isRead: false,
      linkUrl: data.linkUrl || null,
      referenceId: data.relatedEntityId || null,
      referenceType: data.relatedEntityType || null,
      relatedEntityType: data.relatedEntityType || null,
      relatedEntityId: data.relatedEntityId || null,
      readAt: null,
    });
    return created as unknown as NotificationRecord;
  }

  async markAsRead(id: number, userId: number, client: any = db): Promise<NotificationRecord | null> {
    const existing = await this.findById(id, client);
    if (!existing || existing.userId !== userId) {
      return null;
    }

    if (existing.isRead) {
      return existing; // idempotent
    }

    const updated = await client.orm.public.Notification.where({ id }).update({
      isRead: true,
      readAt: new Date().toISOString(),
    });
    return updated as unknown as NotificationRecord;
  }

  async markAllAsRead(userId: number, client: any = db): Promise<number> {
    const unread = await client.orm.public.Notification.where({
      userId,
      isRead: false,
    }).all();

    const now = new Date().toISOString();
    let count = 0;
    for (const n of unread as any[]) {
      await client.orm.public.Notification.where({ id: n.id }).update({
        isRead: true,
        readAt: now,
      });
      count++;
    }

    return count;
  }
}

export const notificationRepository = new NotificationRepository();

