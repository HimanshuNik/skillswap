import { db } from '../prisma/db.js';
import { userRepository } from './user.repository.js';

export interface AdminAuditRecord {
  id: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminAuditWithActor extends AdminAuditRecord {
  actor: {
    id: number;
    name: string;
    username: string;
    email: string;
    role?: string;
  };
}

export class AdminAuditRepository {
  async logAction(data: {
    actorId: number;
    action: string;
    targetType: string;
    targetId?: number | null;
    details?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<AdminAuditRecord> {
    const entry = await db.orm.public.AdminAuditLog.create({
      actorId: data.actorId,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      details: data.details ?? null,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    });

    return entry as unknown as AdminAuditRecord;
  }

  async findAllPaginated(params: {
    page: number;
    limit: number;
    action?: string;
    targetType?: string;
  }): Promise<{ logs: AdminAuditWithActor[]; total: number; totalPages: number }> {
    const all = (await db.orm.public.AdminAuditLog.all()) as unknown as AdminAuditRecord[];

    let filtered = all;
    if (params.action && params.action !== 'all') {
      filtered = filtered.filter((l) => l.action === params.action);
    }
    if (params.targetType && params.targetType !== 'all') {
      filtered = filtered.filter((l) => l.targetType === params.targetType);
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / params.limit));
    const offset = (params.page - 1) * params.limit;
    const sliced = filtered.slice(offset, offset + params.limit);

    // Fetch actor details
    const actorIds = Array.from(new Set(sliced.map((l) => l.actorId)));
    const actorMap = new Map<number, any>();

    for (const aid of actorIds) {
      const u = await userRepository.findById(aid);
      if (u) {
        actorMap.set(aid, {
          id: u.id,
          name: u.name,
          username: u.username,
          email: u.email,
          role: u.role || 'USER',
        });
      }
    }

    const enriched: AdminAuditWithActor[] = sliced.map((l) => ({
      ...l,
      actor: actorMap.get(l.actorId) || {
        id: l.actorId,
        name: 'System Admin',
        username: 'admin',
        email: 'admin@skillswap.local',
        role: 'ADMIN',
      },
    }));

    return {
      logs: enriched,
      total,
      totalPages,
    };
  }
}

export const adminAuditRepository = new AdminAuditRepository();

