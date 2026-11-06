import { db } from '../prisma/db.js';

export interface UserStreakRecord {
  id: number;
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Returns current date string formatted as YYYY-MM-DD in the given timezone.
 */
export function getDateStringInTimezone(date: Date = new Date(), timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date); // Output format: YYYY-MM-DD
  } catch {
    return date.toISOString().split('T')[0]!;
  }
}

/**
 * Calculates calendar day difference between two YYYY-MM-DD strings.
 */
export function getDaysDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export class StreakRepository {
  async getOrCreateStreak(userId: number): Promise<UserStreakRecord> {
    const existing = await db.orm.public.UserStreak.where({ userId }).first();
    if (existing) {
      return existing as unknown as UserStreakRecord;
    }

    try {
      const created = await db.orm.public.UserStreak.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: null,
        isEnabled: true,
      });
      return created as unknown as UserStreakRecord;
    } catch {
      const retry = await db.orm.public.UserStreak.where({ userId }).first();
      return retry as unknown as UserStreakRecord;
    }
  }

  async recordDailyActivity(
    userId: number,
    timezone: string = 'UTC'
  ): Promise<{
    activeRecorded: boolean;
    currentStreak: number;
    longestStreak: number;
    isEnabled: boolean;
  }> {
    const streak = await this.getOrCreateStreak(userId);

    // If user has opted out of streak tracking
    if (!streak.isEnabled) {
      return {
        activeRecorded: false,
        currentStreak: 0,
        longestStreak: streak.longestStreak,
        isEnabled: false,
      };
    }

    const todayStr = getDateStringInTimezone(new Date(), timezone);

    // If already active today, no change to streak
    if (streak.lastActiveDate === todayStr) {
      return {
        activeRecorded: false,
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        isEnabled: true,
      };
    }

    let newCurrentStreak = 1;

    if (streak.lastActiveDate) {
      const diffDays = getDaysDifference(streak.lastActiveDate, todayStr);
      if (diffDays === 1) {
        // Consecutive day activity!
        newCurrentStreak = streak.currentStreak + 1;
      } else if (diffDays === 0) {
        newCurrentStreak = streak.currentStreak;
      } else {
        // Streak broken, reset to 1
        newCurrentStreak = 1;
      }
    } else {
      newCurrentStreak = 1;
    }

    const newLongestStreak = Math.max(streak.longestStreak, newCurrentStreak);

    await db.orm.public.UserStreak.where({ id: streak.id }).update({
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastActiveDate: todayStr,
    });

    return {
      activeRecorded: true,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isEnabled: true,
    };
  }

  async setStreakEnabled(userId: number, isEnabled: boolean): Promise<UserStreakRecord> {
    const streak = await this.getOrCreateStreak(userId);
    const updated = await db.orm.public.UserStreak.where({ id: streak.id }).update({
      isEnabled,
      currentStreak: isEnabled ? streak.currentStreak : 0,
    });
    return updated as unknown as UserStreakRecord;
  }
}

export const streakRepository = new StreakRepository();

