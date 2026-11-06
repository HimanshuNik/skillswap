import { db } from '../prisma/db.js';
import { skillRepository } from './skill.repository.js';

export interface ReviewRecord {
  id: number;
  sessionId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewerSummary {
  id: number;
  name: string;
  username: string;
  avatarUrl: string | null;
}

export interface ReviewWithDetails extends ReviewRecord {
  reviewer: ReviewerSummary;
  skill?: {
    id: number;
    name: string;
    category: string;
  };
  sessionCompletionDate?: string;
}

export interface UserReputation {
  userId: number;
  averageRating: number;
  totalReviews: number;
  completedTeachingSessions: number;
  completedSessions: number;
  hasReviews: boolean;
  ratingLabel?: string;
}

export class ReviewRepository {
  async findById(id: number, client: any = db): Promise<ReviewRecord | null> {
    const record = await client.orm.public.Review.where({ id }).first();
    return record as unknown as ReviewRecord | null;
  }

  async findBySessionId(sessionId: number, client: any = db): Promise<ReviewRecord[]> {
    const records = await client.orm.public.Review.where({ sessionId }).all();
    return records as unknown as ReviewRecord[];
  }

  async findBySessionAndReviewer(
    sessionId: number,
    reviewerId: number,
    client: any = db
  ): Promise<ReviewRecord | null> {
    const record = await client.orm.public.Review.where({
      sessionId,
      reviewerId,
    }).first();
    return record as unknown as ReviewRecord | null;
  }

  async create(
    data: {
      sessionId: number;
      reviewerId: number;
      revieweeId: number;
      rating: number;
      comment?: string | null;
    },
    client: any = db
  ): Promise<ReviewRecord> {
    const created = await client.orm.public.Review.create({
      sessionId: data.sessionId,
      reviewerId: data.reviewerId,
      revieweeId: data.revieweeId,
      rating: data.rating,
      comment: data.comment || null,
    });
    return created as unknown as ReviewRecord;
  }

  async findByReviewee(
    revieweeId: number,
    options: {
      limit?: number;
      page?: number;
      sort?: 'newest' | 'highest' | 'lowest';
    } = {},
    client: any = db
  ): Promise<{ reviews: ReviewWithDetails[]; total: number; page: number; limit: number; totalPages: number }> {
    const limit = Math.max(1, Math.min(options.limit || 10, 50));
    const page = Math.max(1, options.page || 1);
    const offset = (page - 1) * limit;

    const all = await client.orm.public.Review.where({ revieweeId }).all();
    let records = (all as any[]) as ReviewRecord[];

    // Sorting
    if (options.sort === 'highest') {
      records.sort((a, b) => b.rating - a.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (options.sort === 'lowest') {
      records.sort((a, b) => a.rating - b.rating || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      // Default: newest first
      records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    const total = records.length;
    const paginated = records.slice(offset, offset + limit);

    // Enrich with reviewer profiles, session completion date, and skill
    const populated = await this.populateDetails(paginated, client);

    return {
      reviews: populated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async populateDetails(records: ReviewRecord[], client: any = db): Promise<ReviewWithDetails[]> {
    if (!records || records.length === 0) return [];

    const reviewerIds = new Set<number>();
    const sessionIds = new Set<number>();
    for (const r of records) {
      reviewerIds.add(r.reviewerId);
      sessionIds.add(r.sessionId);
    }

    const allUsers = await client.orm.public.User.all();
    const userMap = new Map<number, ReviewerSummary>();
    for (const u of allUsers as any[]) {
      if (reviewerIds.has(u.id)) {
        userMap.set(u.id, {
          id: u.id,
          name: u.name,
          username: u.username,
          avatarUrl: u.avatarUrl || null,
        });
      }
    }

    const allSessions = await client.orm.public.Session.all();
    const sessionMap = new Map<number, any>();
    const skillIds = new Set<number>();
    for (const s of allSessions as any[]) {
      if (sessionIds.has(s.id)) {
        sessionMap.set(s.id, s);
        if (s.skillId) skillIds.add(s.skillId);
      }
    }

    const allSkills = await skillRepository.findAll(undefined, client);
    const skillMap = new Map(allSkills.map((sk) => [sk.id, { id: sk.id, name: sk.name, category: sk.category }]));

    return records.map((r) => {
      const sess = sessionMap.get(r.sessionId);
      const skill = sess?.skillId ? skillMap.get(sess.skillId) : undefined;
      return {
        ...r,
        reviewer: userMap.get(r.reviewerId) || {
          id: r.reviewerId,
          name: 'Reviewer',
          username: 'reviewer',
          avatarUrl: null,
        },
        skill,
        sessionCompletionDate: sess?.completionConfirmedAt || sess?.completedAt || sess?.scheduledStart || undefined,
      };
    });
  }

  async calculateReputation(userId: number, client: any = db): Promise<UserReputation> {
    const reviews = await client.orm.public.Review.where({ revieweeId: userId }).all();
    const totalReviews = reviews.length;

    let averageRating = 0;
    if (totalReviews > 0) {
      const sum = (reviews as any[]).reduce((acc, cur) => acc + cur.rating, 0);
      averageRating = Number((sum / totalReviews).toFixed(2));
    }

    // Count completed teaching sessions
    const sessions = await client.orm.public.Session.all();
    const completedTeaching = (sessions as any[]).filter(
      (s) => s.teacherId === userId && s.status === 'COMPLETED'
    ).length;

    const user = await client.orm.public.User.where({ id: userId }).first();
    const totalCompleted = user?.completedSessions || 0;

    return {
      userId,
      averageRating,
      totalReviews,
      completedTeachingSessions: completedTeaching,
      completedSessions: totalCompleted,
      hasReviews: totalReviews > 0,
      ratingLabel: totalReviews > 0 ? `${averageRating.toFixed(1)} Stars` : 'New Member',
    };
  }
}

export const reviewRepository = new ReviewRepository();
