import { db } from '../prisma/db.js';

export interface DaySchedule {
  day: string;
  slots: string[];
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export class UserAvailabilityRepository {
  async findByUser(userId: number, client: any = db): Promise<DaySchedule[]> {
    const records = await client.orm.public.UserAvailability.where({ userId }).all();
    const map = new Map<string, string[]>();

    for (const day of DAYS_OF_WEEK) {
      map.set(day, []);
    }

    for (const r of records as any[]) {
      const existing = map.get(r.dayOfWeek) || [];
      if (!existing.includes(r.timeSlot)) {
        existing.push(r.timeSlot);
      }
      map.set(r.dayOfWeek, existing);
    }

    return DAYS_OF_WEEK.map((day) => ({
      day,
      slots: map.get(day) || [],
    }));
  }

  async saveSchedule(
    userId: number,
    schedule: DaySchedule[],
    client: any = db
  ): Promise<DaySchedule[]> {
    // 1. Remove existing availability records for user
    const existing = await client.orm.public.UserAvailability.where({ userId }).all();
    for (const r of existing as any[]) {
      await client.orm.public.UserAvailability.where({ id: r.id }).delete();
    }

    // 2. Insert new slots
    for (const dayItem of schedule) {
      if (!DAYS_OF_WEEK.includes(dayItem.day)) continue;
      for (const slot of dayItem.slots) {
        if (!slot) continue;
        await client.orm.public.UserAvailability.create({
          userId,
          dayOfWeek: dayItem.day,
          timeSlot: slot,
        });
      }
    }

    return this.findByUser(userId, client);
  }

  async clearByUser(userId: number, client: any = db): Promise<void> {
    const existing = await client.orm.public.UserAvailability.where({ userId }).all();
    for (const r of existing as any[]) {
      await client.orm.public.UserAvailability.where({ id: r.id }).delete();
    }
  }
}

export const userAvailabilityRepository = new UserAvailabilityRepository();
