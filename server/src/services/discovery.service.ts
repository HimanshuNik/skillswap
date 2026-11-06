import { db } from '../prisma/db.js';
import { skillRepository } from '../repositories/skill.repository.js';
import { calculateMatchScore, type MatchResult, type MatchUserContext } from './matching.service.js';
import { DAYS_OF_WEEK } from '../repositories/userAvailability.repository.js';

export interface DiscoverUserItem {
  id: number;
  name: string;
  username: string;
  initials: string;
  location: string;
  bio: string;
  avatarUrl: string | null;
  category: string;
  rating: number;
  averageRating: number;
  totalReviews: number;
  completedSessions: number;
  teaches: string[];
  wantsToLearn: string[];
}

export interface DiscoverQueryOptions {
  search?: string;
  category?: string;
  page?: number;
  limit?: number;
  excludeUserId?: number;
}

export interface DiscoverResult {
  users: DiscoverUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class DiscoveryService {
  /**
   * Helper to fetch and group full skill and availability context for onboarded users.
   */
  private async getOnboardedContexts(client: any = db) {
    const rawUsers = await client.orm.public.User.where({ isOnboarded: true }).all();
    const users = (rawUsers as any[]).filter((u) => u.isActive !== false);
    const teachingRecords = await client.orm.public.UserTeachingSkill.all();
    const learningRecords = await client.orm.public.UserLearningSkill.all();
    const availabilityRecords = await client.orm.public.UserAvailability.all();
    const allSkills = await skillRepository.findAll(undefined, client);

    const skillMap = new Map<number, { id: number; name: string; category: string }>(
      allSkills.map((s) => [s.id, s])
    );

    const teachingMap = new Map<number, Array<{ id: number; name: string; category: string; level?: string }>>();
    for (const r of teachingRecords as any[]) {
      const skill = skillMap.get(r.skillId) || { id: r.skillId, name: 'Unknown', category: 'General' };
      const list = teachingMap.get(r.userId) || [];
      list.push({ ...skill, level: r.proficiencyLevel });
      teachingMap.set(r.userId, list);
    }

    const learningMap = new Map<number, Array<{ id: number; name: string; category: string; targetLevel?: string }>>();
    for (const r of learningRecords as any[]) {
      const skill = skillMap.get(r.skillId) || { id: r.skillId, name: 'Unknown', category: 'General' };
      const list = learningMap.get(r.userId) || [];
      list.push({ ...skill, targetLevel: r.targetLevel });
      learningMap.set(r.userId, list);
    }

    const availMap = new Map<number, Array<{ day: string; slots: string[] }>>();
    for (const r of availabilityRecords as any[]) {
      let list = availMap.get(r.userId);
      if (!list) {
        list = DAYS_OF_WEEK.map((d) => ({ day: d, slots: [] }));
        availMap.set(r.userId, list);
      }
      const dayObj = list.find((d) => d.day === r.dayOfWeek);
      if (dayObj && !dayObj.slots.includes(r.timeSlot)) {
        dayObj.slots.push(r.timeSlot);
      }
    }

    return {
      users: users as any[],
      teachingMap,
      learningMap,
      availMap,
    };
  }

  async getDiscoverUsers(options: DiscoverQueryOptions = {}): Promise<DiscoverResult> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(500, Math.max(1, options.limit || 12));
    const search = options.search?.trim().toLowerCase() || '';
    const category = options.category && options.category !== 'All' ? options.category : null;

    const { users, teachingMap, learningMap } = await this.getOnboardedContexts();

    // Map into displayable items
    let items: DiscoverUserItem[] = users
      .filter((u) => !options.excludeUserId || u.id !== options.excludeUserId)
      .map((u) => {
        const teaching = teachingMap.get(u.id) || [];
        const learning = learningMap.get(u.id) || [];

        const teachesNames = teaching.map((t) => t.name);
        const learningNames = learning.map((l) => l.name);

        // Derive primary category from first teaching skill or default
        const primaryCategory = teaching[0]?.category || 'General';

        const initials = u.name
          ? u.name
              .split(' ')
              .map((p: string) => p.charAt(0))
              .join('')
              .toUpperCase()
              .slice(0, 2)
          : '??';

        return {
          id: u.id,
          name: u.name,
          username: u.username,
          initials,
          location: u.location || '',
          bio: u.bio || '',
          avatarUrl: u.avatarUrl,
          category: primaryCategory,
          rating: Number(u.averageRating) || 0,
          averageRating: Number(u.averageRating) || 0,
          totalReviews: u.totalReviews || 0,
          completedSessions: u.completedSessions || 0,
          teaches: teachesNames,
          wantsToLearn: learningNames,
        };
      });

    // Apply search filter
    if (search) {
      items = items.filter((user) => {
        const nameMatch = user.name.toLowerCase().includes(search);
        const usernameMatch = user.username.toLowerCase().includes(search);
        const locMatch = user.location.toLowerCase().includes(search);
        const bioMatch = user.bio.toLowerCase().includes(search);
        const teachMatch = user.teaches.some((s) => s.toLowerCase().includes(search));
        const learnMatch = user.wantsToLearn.some((s) => s.toLowerCase().includes(search));
        return nameMatch || usernameMatch || locMatch || bioMatch || teachMatch || learnMatch;
      });
    }

    // Apply category filter
    if (category) {
      items = items.filter((user) => {
        const userTeaching = teachingMap.get(user.id) || [];
        return userTeaching.some(
          (t) => t.category.toLowerCase() === category.toLowerCase()
        );
      });
    }

    // Sort by rating & activity
    items.sort((a, b) => {
      if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
      return b.completedSessions - a.completedSessions;
    });

    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedUsers = items.slice(startIndex, startIndex + limit);

    return {
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getMatches(currentUserId: number, limit = 20): Promise<{ matches: MatchResult[]; total: number }> {
    const { users, teachingMap, learningMap, availMap } = await this.getOnboardedContexts();

    const currentUserRecord = users.find((u) => u.id === currentUserId);
    if (!currentUserRecord || !currentUserRecord.isOnboarded) {
      return { matches: [], total: 0 };
    }

    const currentUserContext: MatchUserContext = {
      id: currentUserRecord.id,
      name: currentUserRecord.name,
      username: currentUserRecord.username,
      location: currentUserRecord.location,
      bio: currentUserRecord.bio,
      avatarUrl: currentUserRecord.avatarUrl,
      timezone: currentUserRecord.timezone,
      averageRating: Number(currentUserRecord.averageRating) || 0,
      totalReviews: currentUserRecord.totalReviews || 0,
      completedSessions: currentUserRecord.completedSessions || 0,
      teachingSkills: teachingMap.get(currentUserId) || [],
      learningSkills: learningMap.get(currentUserId) || [],
      availability: availMap.get(currentUserId) || [],
    };

    const matches: MatchResult[] = [];

    for (const candidateRecord of users) {
      if (candidateRecord.id === currentUserId) continue;

      const candidateContext: MatchUserContext = {
        id: candidateRecord.id,
        name: candidateRecord.name,
        username: candidateRecord.username,
        location: candidateRecord.location,
        bio: candidateRecord.bio,
        avatarUrl: candidateRecord.avatarUrl,
        timezone: candidateRecord.timezone,
        averageRating: Number(candidateRecord.averageRating) || 0,
        totalReviews: candidateRecord.totalReviews || 0,
        completedSessions: candidateRecord.completedSessions || 0,
        teachingSkills: teachingMap.get(candidateRecord.id) || [],
        learningSkills: learningMap.get(candidateRecord.id) || [],
        availability: availMap.get(candidateRecord.id) || [],
      };

      const match = calculateMatchScore(currentUserContext, candidateContext);
      if (match && match.compatibilityScore > 0) {
        matches.push(match);
      }
    }

    // Sort: reciprocal first, then highest compatibilityScore descending
    matches.sort((a, b) => {
      if (a.isReciprocal !== b.isReciprocal) {
        return a.isReciprocal ? -1 : 1;
      }
      return b.compatibilityScore - a.compatibilityScore;
    });

    const total = matches.length;
    const paginatedMatches = matches.slice(0, limit);

    return {
      matches: paginatedMatches,
      total,
    };
  }
}

export const discoveryService = new DiscoveryService();

