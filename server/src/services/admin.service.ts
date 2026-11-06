import { db } from '../prisma/db.js';
import { userRepository, type SafeUser, type UserRecord } from '../repositories/user.repository.js';
import { skillRepository, type SkillWithStats } from '../repositories/skill.repository.js';
import { adminReportRepository, type UserReportWithDetails } from '../repositories/adminReport.repository.js';
import { adminAuditRepository, type AdminAuditWithActor } from '../repositories/adminAudit.repository.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';
import { emailJobRepository } from '../repositories/emailJob.repository.js';
import { emailService } from './email.service.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import type { SessionRecord } from '../repositories/session.repository.js';
import type { SwapRequestRecord } from '../repositories/swapRequest.repository.js';

export interface PlatformOverviewStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    deactivated: number;
    newLast7Days: number;
    newLast30Days: number;
  };
  skills: {
    total: number;
    active: number;
    disabled: number;
  };
  swaps: {
    total: number;
    pending: number;
    accepted: number;
    completed: number;
    acceptanceRate: number; // percentage 0-100
  };
  sessions: {
    total: number;
    scheduled: number;
    completed: number;
    disputed: number;
    completionRate: number; // percentage 0-100
  };
  reviews: {
    total: number;
    averageRating: number;
  };
  reports: {
    pending: number;
    total: number;
  };
  emails: {
    pending: number;
    sent: number;
    failed: number;
    total: number;
  };
}

export class AdminService {
  async getOverview(): Promise<PlatformOverviewStats> {
    const [
      allUsers,
      allSkills,
      allSwaps,
      allSessions,
      allReviews,
      allReports,
      emailStats,
    ] = await Promise.all([
      db.orm.public.User.all() as unknown as Promise<UserRecord[]>,
      db.orm.public.Skill.all() as unknown as Promise<Array<{ id: number; isDisabled?: boolean }>>,
      db.orm.public.SwapRequest.all() as unknown as Promise<SwapRequestRecord[]>,
      db.orm.public.Session.all() as unknown as Promise<SessionRecord[]>,
      db.orm.public.Review.all() as unknown as Promise<Array<{ rating: number }>>,
      db.orm.public.UserReport.all() as unknown as Promise<Array<{ status: string }>>,
      emailJobRepository.getDeliveryStats(),
    ]);

    const now = Date.now();
    const ms7d = 7 * 24 * 60 * 60 * 1000;
    const ms30d = 30 * 24 * 60 * 60 * 1000;

    // User calculations
    let activeUsers = 0;
    let suspendedUsers = 0;
    let deactivatedUsers = 0;
    let newLast7Days = 0;
    let newLast30Days = 0;

    for (const u of allUsers) {
      if (u.isSuspended) suspendedUsers++;
      else if (u.isActive === false) deactivatedUsers++;
      else activeUsers++;

      const createdTime = new Date(u.createdAt).getTime();
      if (now - createdTime <= ms7d) newLast7Days++;
      if (now - createdTime <= ms30d) newLast30Days++;
    }

    // Skill calculations
    let disabledSkills = 0;
    for (const s of allSkills) {
      if (s.isDisabled) disabledSkills++;
    }

    // Swap calculations
    let pendingSwaps = 0;
    let acceptedSwaps = 0;
    let completedSwaps = 0;
    for (const s of allSwaps) {
      if (s.status === 'PENDING') pendingSwaps++;
      else if (s.status === 'ACCEPTED') acceptedSwaps++;
      else if (s.status === 'COMPLETED') completedSwaps++;
    }
    const resolvedSwaps = acceptedSwaps + completedSwaps + (allSwaps.length - pendingSwaps - acceptedSwaps - completedSwaps);
    const acceptanceRate = allSwaps.length > 0 ? Math.round(((acceptedSwaps + completedSwaps) / allSwaps.length) * 100) : 0;

    // Session calculations
    let scheduledSessions = 0;
    let completedSessions = 0;
    let disputedSessions = 0;
    for (const s of allSessions) {
      if (s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS') scheduledSessions++;
      else if (s.status === 'COMPLETED') completedSessions++;
      else if (s.status === 'DISPUTED') disputedSessions++;
    }
    const completionRate = allSessions.length > 0 ? Math.round((completedSessions / allSessions.length) * 100) : 0;

    // Review calculations
    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0
      ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
      : 0;

    // Report calculations
    let pendingReports = 0;
    for (const r of allReports) {
      if (r.status === 'OPEN' || r.status === 'UNDER_REVIEW') pendingReports++;
    }

    return {
      users: {
        total: allUsers.length,
        active: activeUsers,
        suspended: suspendedUsers,
        deactivated: deactivatedUsers,
        newLast7Days,
        newLast30Days,
      },
      skills: {
        total: allSkills.length,
        active: allSkills.length - disabledSkills,
        disabled: disabledSkills,
      },
      swaps: {
        total: allSwaps.length,
        pending: pendingSwaps,
        accepted: acceptedSwaps,
        completed: completedSwaps,
        acceptanceRate,
      },
      sessions: {
        total: allSessions.length,
        scheduled: scheduledSessions,
        completed: completedSessions,
        disputed: disputedSessions,
        completionRate,
      },
      reviews: {
        total: totalReviews,
        averageRating: avgRating,
      },
      reports: {
        pending: pendingReports,
        total: allReports.length,
      },
      emails: emailStats,
    };
  }

  async getTrends(days = 14): Promise<{
    userSignups: Array<{ date: string; count: number }>;
    sessionCompletions: Array<{ date: string; count: number }>;
    swapRequests: Array<{ date: string; count: number }>;
  }> {
    const [allUsers, allSessions, allSwaps] = await Promise.all([
      db.orm.public.User.all() as unknown as Promise<UserRecord[]>,
      db.orm.public.Session.all() as unknown as Promise<SessionRecord[]>,
      db.orm.public.SwapRequest.all() as unknown as Promise<SwapRequestRecord[]>,
    ]);

    // Build day buckets
    const dates: string[] = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().slice(0, 10)); // 'YYYY-MM-DD'
    }

    const signupMap = new Map<string, number>();
    const sessionMap = new Map<string, number>();
    const swapMap = new Map<string, number>();

    for (const d of dates) {
      signupMap.set(d, 0);
      sessionMap.set(d, 0);
      swapMap.set(d, 0);
    }

    for (const u of allUsers) {
      const d = u.createdAt.slice(0, 10);
      if (signupMap.has(d)) signupMap.set(d, (signupMap.get(d) || 0) + 1);
    }

    for (const s of allSessions) {
      if (s.status === 'COMPLETED' && s.completedAt) {
        const d = s.completedAt.slice(0, 10);
        if (sessionMap.has(d)) sessionMap.set(d, (sessionMap.get(d) || 0) + 1);
      }
    }

    for (const sw of allSwaps) {
      const d = sw.createdAt.slice(0, 10);
      if (swapMap.has(d)) swapMap.set(d, (swapMap.get(d) || 0) + 1);
    }

    return {
      userSignups: dates.map((d) => ({ date: d, count: signupMap.get(d) || 0 })),
      sessionCompletions: dates.map((d) => ({ date: d, count: sessionMap.get(d) || 0 })),
      swapRequests: dates.map((d) => ({ date: d, count: swapMap.get(d) || 0 })),
    };
  }

  async getTopSkills(limit = 5): Promise<{
    topTeaching: Array<{ id: number; name: string; category: string; count: number }>;
    topLearning: Array<{ id: number; name: string; category: string; count: number }>;
  }> {
    const stats = await skillRepository.findCatalogWithStats();

    const topTeaching = [...stats]
      .sort((a, b) => b.teachersCount - a.teachersCount)
      .slice(0, limit)
      .map((s) => ({ id: s.id, name: s.name, category: s.category, count: s.teachersCount }));

    const topLearning = [...stats]
      .sort((a, b) => b.learnersCount - a.learnersCount)
      .slice(0, limit)
      .map((s) => ({ id: s.id, name: s.name, category: s.category, count: s.learnersCount }));

    return { topTeaching, topLearning };
  }

  // --- User Operations ---
  async suspendUser(
    adminId: number,
    targetUserId: number,
    reason: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SafeUser> {
    if (adminId === targetUserId) {
      throw new BadRequestError('Administrators cannot suspend their own account');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) throw new NotFoundError('Target user not found');

    if (target.role === 'ADMIN') {
      throw new ForbiddenError('Cannot suspend another administrator');
    }

    await userRepository.suspendUser(targetUserId, reason, adminId);

    // Audit log
    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'USER_SUSPEND',
      targetType: 'USER',
      targetId: targetUserId,
      details: JSON.stringify({ reason, targetUsername: target.username }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    // Enqueue suspension email
    await emailService.enqueue({
      to: target.email,
      toName: target.name,
      userId: target.id,
      template: 'ACCOUNT_SUSPENDED',
      subject: 'SkillSwap Account Notice: Account Suspended',
      payload: { name: target.name, reason },
      bypassPreferences: true,
    });

    const updated = await userRepository.findById(targetUserId);
    return userRepository.toSafeUser(updated!);
  }

  async reactivateUser(
    adminId: number,
    targetUserId: number,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SafeUser> {
    const target = await userRepository.findById(targetUserId);
    if (!target) throw new NotFoundError('Target user not found');

    await userRepository.reactivateUser(targetUserId);

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'USER_REACTIVATE',
      targetType: 'USER',
      targetId: targetUserId,
      details: JSON.stringify({ targetUsername: target.username }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const updated = await userRepository.findById(targetUserId);
    return userRepository.toSafeUser(updated!);
  }

  async changeUserRole(
    adminId: number,
    targetUserId: number,
    newRole: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<SafeUser> {
    if (adminId === targetUserId) {
      throw new BadRequestError('Administrators cannot modify their own role');
    }

    const allowedRoles = ['USER', 'MODERATOR', 'ADMIN'];
    if (!allowedRoles.includes(newRole)) {
      throw new BadRequestError(`Invalid role. Must be one of: ${allowedRoles.join(', ')}`);
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) throw new NotFoundError('Target user not found');

    const oldRole = target.role || 'USER';
    await userRepository.updateRole(targetUserId, newRole);

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'ROLE_CHANGE',
      targetType: 'USER',
      targetId: targetUserId,
      details: JSON.stringify({ oldRole, newRole, targetUsername: target.username }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const updated = await userRepository.findById(targetUserId);
    return userRepository.toSafeUser(updated!);
  }

  // --- Report Moderation Operations ---
  async resolveReport(
    adminId: number,
    reportId: number,
    data: { resolutionNotes: string; actionTaken?: 'NONE' | 'SUSPEND' },
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserReportWithDetails> {
    const report = await adminReportRepository.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    if (data.actionTaken === 'SUSPEND') {
      await this.suspendUser(
        adminId,
        report.reportedId,
        `Suspended following resolution of report #${reportId}: ${data.resolutionNotes}`,
        meta
      );
    }

    await adminReportRepository.updateStatus(reportId, 'RESOLVED', data.resolutionNotes, adminId);

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'REPORT_RESOLVED',
      targetType: 'REPORT',
      targetId: reportId,
      details: JSON.stringify({
        resolutionNotes: data.resolutionNotes,
        actionTaken: data.actionTaken || 'NONE',
        reportedId: report.reportedId,
      }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const refreshed = await adminReportRepository.findAllPaginated({ page: 1, limit: 1 });
    const match = (await adminReportRepository.findAllPaginated({ page: 1, limit: 100 })).reports.find((r) => r.id === reportId);
    return match!;
  }

  async dismissReport(
    adminId: number,
    reportId: number,
    notes: string,
    meta?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserReportWithDetails> {
    const report = await adminReportRepository.findById(reportId);
    if (!report) throw new NotFoundError('Report not found');

    await adminReportRepository.updateStatus(reportId, 'DISMISSED', notes, adminId);

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'REPORT_DISMISSED',
      targetType: 'REPORT',
      targetId: reportId,
      details: JSON.stringify({ resolutionNotes: notes }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    const match = (await adminReportRepository.findAllPaginated({ page: 1, limit: 100 })).reports.find((r) => r.id === reportId);
    return match!;
  }

  // --- Skill Catalog Operations ---
  async createSkill(
    adminId: number,
    data: { name: string; category: string; description?: string },
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const skill = await skillRepository.createSkill(data);

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'SKILL_CREATED',
      targetType: 'SKILL',
      targetId: skill.id,
      details: JSON.stringify({ name: skill.name, category: skill.category }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return skill;
  }

  async updateSkill(
    adminId: number,
    skillId: number,
    data: { name?: string; category?: string; description?: string; isDisabled?: boolean },
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    const updated = await skillRepository.updateSkill(skillId, data);
    if (!updated) throw new NotFoundError('Skill not found');

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'SKILL_UPDATED',
      targetType: 'SKILL',
      targetId: skillId,
      details: JSON.stringify(data),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return updated;
  }

  // --- Platform Settings ---
  async updateSettings(
    adminId: number,
    settings: Record<string, string>,
    meta?: { ipAddress?: string; userAgent?: string }
  ) {
    for (const [key, value] of Object.entries(settings)) {
      await platformSettingRepository.set(key, value, adminId);
    }

    await adminAuditRepository.logAction({
      actorId: adminId,
      action: 'SETTING_UPDATED',
      targetType: 'SETTING',
      details: JSON.stringify({ updatedKeys: Object.keys(settings) }),
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    });

    return platformSettingRepository.getAll();
  }
}

export const adminService = new AdminService();

