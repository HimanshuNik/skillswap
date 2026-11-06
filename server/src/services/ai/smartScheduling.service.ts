import { db } from '../../prisma/db.js';
import { aiUsageRepository } from '../../repositories/aiUsage.repository.js';
import { getAIProvider } from './aiProvider.factory.js';
import { NotFoundError, BadRequestError } from '../../utils/errors.js';

export interface SmartScheduleSuggestion {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  slotType: 'Morning' | 'Afternoon' | 'Evening';
  startTimeIso: string;
  endTimeIso: string;
  durationMinutes: number;
  userTimezone: string;
  partnerTimezone: string;
  userLocalTime: string;
  partnerLocalTime: string;
  confidenceScore: number; // 0 - 100
  reason: string;
}

const SLOT_START_HOURS: Record<string, number> = {
  Morning: 10,   // 10:00 AM
  Afternoon: 14, // 2:00 PM
  Evening: 19,   // 7:00 PM
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export class SmartSchedulingService {
  async getSuggestions(
    currentUserId: number,
    partnerId: number,
    durationMinutes = 60
  ): Promise<{ suggestions: SmartScheduleSuggestion[] }> {
    const start = Date.now();
    if (currentUserId === partnerId) {
      throw new BadRequestError('Cannot generate scheduling suggestions with oneself');
    }

    const currentUser = await db.orm.public.User.where({ id: currentUserId }).first();
    const partner = await db.orm.public.User.where({ id: partnerId }).first();

    if (!currentUser || !partner) {
      throw new NotFoundError('User or partner not found');
    }

    const userTz = currentUser.timezone || 'UTC';
    const partnerTz = partner.timezone || 'UTC';

    // 1. Fetch availability for both users
    const userAvail = await db.orm.public.UserAvailability.where({ userId: currentUserId }).all();
    const partnerAvail = await db.orm.public.UserAvailability.where({ userId: partnerId }).all();

    const userSlotSet = new Set((userAvail as any[]).map((a) => `${a.dayOfWeek}_${a.timeSlot}`));
    const partnerSlotSet = new Set((partnerAvail as any[]).map((a) => `${a.dayOfWeek}_${a.timeSlot}`));

    // 2. Fetch existing booked sessions for both users to prevent conflicts
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const activeStatuses = ['SCHEDULED', 'RESCHEDULE_PROPOSED', 'IN_PROGRESS', 'COMPLETION_PENDING'];
    const allSessions = await db.orm.public.Session.all();

    const userBusyRanges: Array<{ start: number; end: number }> = [];
    for (const s of allSessions as any[]) {
      if ((s.teacherId === currentUserId || s.learnerId === currentUserId || s.teacherId === partnerId || s.learnerId === partnerId) && activeStatuses.includes(s.status) && s.scheduledStart) {
        const sStart = new Date(s.scheduledStart).getTime();
        const sEnd = s.scheduledEnd ? new Date(s.scheduledEnd).getTime() : sStart + (s.duration || 60) * 60 * 1000;
        userBusyRanges.push({ start: sStart, end: sEnd });
      }
    }

    // Helper: checks if a candidate time interval overlaps with any existing booking
    const hasConflict = (candStart: number, candEnd: number) => {
      return userBusyRanges.some((r) => candStart < r.end && candEnd > r.start);
    };

    // 3. Scan the next 14 calendar days (starting tomorrow to enforce notice)
    const suggestions: SmartScheduleSuggestion[] = [];

    for (let dayOffset = 1; dayOffset <= 14; dayOffset++) {
      const candidateDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const dayOfWeek = DAY_NAMES[candidateDate.getDay()] || 'Monday';
      const dateStr = candidateDate.toISOString().split('T')[0]!;

      // Evaluate each slot (Morning, Afternoon, Evening)
      const slots: Array<'Morning' | 'Afternoon' | 'Evening'> = ['Morning', 'Afternoon', 'Evening'];

      for (const slotType of slots) {
        const startHour = SLOT_START_HOURS[slotType] || 14;

        // Construct candidate UTC date
        const slotStart = new Date(candidateDate);
        slotStart.setUTCHours(startHour, 0, 0, 0);

        // Ensure minimum 2-hour buffer from now
        if (slotStart.getTime() < now.getTime() + 2 * 60 * 60 * 1000) {
          continue;
        }

        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

        // Conflict check
        if (hasConflict(slotStart.getTime(), slotEnd.getTime())) {
          continue;
        }

        const userKey = `${dayOfWeek}_${slotType}`;
        const hasUserSlot = userSlotSet.has(userKey) || userSlotSet.size === 0;
        const hasPartnerSlot = partnerSlotSet.has(userKey) || partnerSlotSet.size === 0;

        let confidenceScore = 50;
        let reason = '';

        if (hasUserSlot && hasPartnerSlot && userSlotSet.size > 0 && partnerSlotSet.size > 0) {
          confidenceScore = 95;
          reason = `Direct availability overlap: both you and ${partner.name} specified ${slotType} availability on ${dayOfWeek}s.`;
        } else if (hasUserSlot && partnerSlotSet.size === 0) {
          confidenceScore = 75;
          reason = `Matches your ${dayOfWeek} ${slotType} preference (${partner.name} has open schedule).`;
        } else if (hasPartnerSlot && userSlotSet.size === 0) {
          confidenceScore = 75;
          reason = `Matches ${partner.name}'s ${dayOfWeek} ${slotType} preference (conflict-free).`;
        } else {
          confidenceScore = 60;
          reason = `Conflict-free open slot on ${dayOfWeek} ${slotType}.`;
        }

        // Format localized strings
        const userLocalTime = `${slotStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: userTz })} ${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: userTz })}`;
        const partnerLocalTime = `${slotStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: partnerTz })} ${slotStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: partnerTz })}`;

        suggestions.push({
          date: dateStr,
          dayOfWeek,
          slotType,
          startTimeIso: slotStart.toISOString(),
          endTimeIso: slotEnd.toISOString(),
          durationMinutes,
          userTimezone: userTz,
          partnerTimezone: partnerTz,
          userLocalTime,
          partnerLocalTime,
          confidenceScore,
          reason,
        });
      }
    }

    // 4. Sort by confidence descending, then by date ascending
    suggestions.sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
      return new Date(a.startTimeIso).getTime() - new Date(b.startTimeIso).getTime();
    });

    const topSuggestions = suggestions.slice(0, 5);

    // Record AI usage
    const provider = getAIProvider();
    await aiUsageRepository.recordUsage({
      userId: currentUserId,
      feature: 'SMART_SCHEDULE',
      provider: provider.name,
      promptTokens: 25,
      completionTokens: 60,
      durationMs: Date.now() - start,
      success: true,
    }).catch(() => {});

    return { suggestions: topSuggestions };
  }
}

export const smartSchedulingService = new SmartSchedulingService();

