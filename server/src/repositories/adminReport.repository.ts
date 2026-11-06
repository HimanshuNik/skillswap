import { db } from '../prisma/db.js';
import { userRepository } from './user.repository.js';

export interface UserReportRecord {
  id: number;
  reporterId: number;
  reportedId: number;
  targetType: string;
  targetId: number | null;
  category: string;
  reason: string;
  status: string; // OPEN, UNDER_REVIEW, RESOLVED, DISMISSED
  resolutionNotes: string | null;
  resolvedBy: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserReportWithDetails extends UserReportRecord {
  reporter: {
    id: number;
    name: string;
    username: string;
    email: string;
  };
  reported: {
    id: number;
    name: string;
    username: string;
    email: string;
    isSuspended: boolean;
  };
}

export class AdminReportRepository {
  async createReport(data: {
    reporterId: number;
    reportedId: number;
    targetType: string;
    targetId?: number | null;
    category: string;
    reason: string;
  }): Promise<UserReportRecord> {
    const report = await db.orm.public.UserReport.create({
      reporterId: data.reporterId,
      reportedId: data.reportedId,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      category: data.category,
      reason: data.reason,
      status: 'OPEN',
      resolutionNotes: null,
      resolvedBy: null,
      resolvedAt: null,
    });

    return report as unknown as UserReportRecord;
  }

  async findRecentByUser(reporterId: number, reportedId: number, windowHours = 24): Promise<UserReportRecord | null> {
    const reports = (await db.orm.public.UserReport.where({
      reporterId,
      reportedId,
    }).all()) as unknown as UserReportRecord[];

    const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
    const recent = reports.find((r) => new Date(r.createdAt).getTime() > cutoff);
    return recent || null;
  }

  async findById(id: number): Promise<UserReportRecord | null> {
    const report = await db.orm.public.UserReport.where({ id }).first();
    return report as unknown as UserReportRecord | null;
  }

  async updateStatus(
    id: number,
    status: string,
    resolutionNotes?: string | null,
    resolvedBy?: number | null
  ): Promise<UserReportRecord | null> {
    await db.orm.public.UserReport.where({ id }).update({
      status,
      resolutionNotes: resolutionNotes || null,
      resolvedBy: resolvedBy || null,
      resolvedAt: new Date().toISOString(),
    });

    return this.findById(id);
  }

  async countPending(): Promise<number> {
    const openReports = (await db.orm.public.UserReport.where({ status: 'OPEN' }).all()) as unknown as UserReportRecord[];
    const underReview = (await db.orm.public.UserReport.where({ status: 'UNDER_REVIEW' }).all()) as unknown as UserReportRecord[];
    return openReports.length + underReview.length;
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    status?: string;
    category?: string;
  }): Promise<{ reports: UserReportWithDetails[]; total: number; totalPages: number }> {
    const all = (await db.orm.public.UserReport.all()) as unknown as UserReportRecord[];

    let filtered = all;
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((r) => r.status === params.status);
    }
    if (params.category && params.category !== 'all') {
      filtered = filtered.filter((r) => r.category === params.category);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const offset = (params.page - 1) * params.limit;
    const sliced = filtered.slice(offset, offset + params.limit);

    // Enrich with reporter and reported user details
    const userIds = Array.from(new Set(sliced.flatMap((r) => [r.reporterId, r.reportedId])));
    const userMap = new Map<number, any>();

    for (const uid of userIds) {
      const u = await userRepository.findById(uid);
      if (u) {
        userMap.set(uid, {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          isSuspended: Boolean(u.isSuspended),
        });
      }
    }

    const enriched: UserReportWithDetails[] = sliced.map((r) => ({
      ...r,
      reporter: userMap.get(r.reporterId) || {
        id: r.reporterId,
        name: 'Unknown User',
        username: 'unknown',
        email: 'unknown',
      },
      reported: userMap.get(r.reportedId) || {
        id: r.reportedId,
        name: 'Unknown User',
        username: 'unknown',
        email: 'unknown',
        isSuspended: false,
      },
    }));

    return {
      reports: enriched,
      total,
      totalPages,
    };
  }
}

export const adminReportRepository = new AdminReportRepository();

