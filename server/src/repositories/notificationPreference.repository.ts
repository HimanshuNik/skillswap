import { db } from '../prisma/db.js';

export interface UserNotificationPreferenceRecord {
  id: number;
  userId: number;
  swapRequests: boolean;
  messages: boolean;
  sessions: boolean;
  reviews: boolean;
  emailAlerts: boolean;
  pushEnabled: boolean;
  pushSwapRequests: boolean;
  pushMessages: boolean;
  pushSessions: boolean;
  pushReminders: boolean;
  pushGroupActivity: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NotificationPreferencesInput = {
  swapRequests?: boolean;
  messages?: boolean;
  sessions?: boolean;
  reviews?: boolean;
  emailAlerts?: boolean;
  pushEnabled?: boolean;
  pushSwapRequests?: boolean;
  pushMessages?: boolean;
  pushSessions?: boolean;
  pushReminders?: boolean;
  pushGroupActivity?: boolean;
};

export class NotificationPreferenceRepository {
  async findByUserId(
    userId: number,
    client: any = db
  ): Promise<UserNotificationPreferenceRecord | null> {
    const record = await client.orm.public.UserNotificationPreference.where({ userId }).first();
    return record as unknown as UserNotificationPreferenceRecord | null;
  }

  async getOrDefault(
    userId: number,
    client: any = db
  ): Promise<{
    userId: number;
    swapRequests: boolean;
    messages: boolean;
    sessions: boolean;
    reviews: boolean;
    emailAlerts: boolean;
    pushEnabled: boolean;
    pushSwapRequests: boolean;
    pushMessages: boolean;
    pushSessions: boolean;
    pushReminders: boolean;
    pushGroupActivity: boolean;
  }> {
    const existing = await this.findByUserId(userId, client);
    if (existing) {
      return {
        userId: existing.userId,
        swapRequests: existing.swapRequests,
        messages: existing.messages,
        sessions: existing.sessions,
        reviews: existing.reviews,
        emailAlerts: existing.emailAlerts,
        pushEnabled: existing.pushEnabled ?? true,
        pushSwapRequests: existing.pushSwapRequests ?? true,
        pushMessages: existing.pushMessages ?? true,
        pushSessions: existing.pushSessions ?? true,
        pushReminders: existing.pushReminders ?? true,
        pushGroupActivity: existing.pushGroupActivity ?? true,
      };
    }

    return {
      userId,
      swapRequests: true,
      messages: true,
      sessions: true,
      reviews: true,
      emailAlerts: true,
      pushEnabled: true,
      pushSwapRequests: true,
      pushMessages: true,
      pushSessions: true,
      pushReminders: true,
      pushGroupActivity: true,
    };
  }

  async upsert(
    userId: number,
    data: NotificationPreferencesInput,
    client: any = db
  ): Promise<UserNotificationPreferenceRecord> {
    const existing = await this.findByUserId(userId, client);

    if (existing) {
      const updateData: Record<string, boolean> = {};
      if (data.swapRequests !== undefined) updateData.swapRequests = data.swapRequests;
      if (data.messages !== undefined) updateData.messages = data.messages;
      if (data.sessions !== undefined) updateData.sessions = data.sessions;
      if (data.reviews !== undefined) updateData.reviews = data.reviews;
      if (data.emailAlerts !== undefined) updateData.emailAlerts = data.emailAlerts;
      if (data.pushEnabled !== undefined) updateData.pushEnabled = data.pushEnabled;
      if (data.pushSwapRequests !== undefined) updateData.pushSwapRequests = data.pushSwapRequests;
      if (data.pushMessages !== undefined) updateData.pushMessages = data.pushMessages;
      if (data.pushSessions !== undefined) updateData.pushSessions = data.pushSessions;
      if (data.pushReminders !== undefined) updateData.pushReminders = data.pushReminders;
      if (data.pushGroupActivity !== undefined) updateData.pushGroupActivity = data.pushGroupActivity;

      const updated = await client.orm.public.UserNotificationPreference.where({ id: existing.id }).update(
        updateData
      );
      return updated as unknown as UserNotificationPreferenceRecord;
    }

    const created = await client.orm.public.UserNotificationPreference.create({
      userId,
      swapRequests: data.swapRequests ?? true,
      messages: data.messages ?? true,
      sessions: data.sessions ?? true,
      reviews: data.reviews ?? true,
      emailAlerts: data.emailAlerts ?? true,
      pushEnabled: data.pushEnabled ?? true,
      pushSwapRequests: data.pushSwapRequests ?? true,
      pushMessages: data.pushMessages ?? true,
      pushSessions: data.pushSessions ?? true,
      pushReminders: data.pushReminders ?? true,
      pushGroupActivity: data.pushGroupActivity ?? true,
    });
    return created as unknown as UserNotificationPreferenceRecord;
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();

