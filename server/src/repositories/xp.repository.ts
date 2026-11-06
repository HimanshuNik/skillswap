import { db } from '../prisma/db.js';
import { logger } from '../config/logger.js';

export interface XPTransactionRecord {
  id: number;
  userId: number;
  amount: number;
  actionType: string;
  idempotencyKey: string;
  description: string;
  metadata: string | null;
  createdAt: string;
}

export interface UserXPRecord {
  id: number;
  userId: number;
  totalXp: number;
  currentLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
}

export const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, title: 'Novice Explorer' },
  { level: 2, minXp: 100, title: 'Curious Learner' },
  { level: 3, minXp: 250, title: 'Active Exchanger' },
  { level: 4, minXp: 500, title: 'Skill Enthusiast' },
  { level: 5, minXp: 900, title: 'Dedicated Practitioner' },
  { level: 6, minXp: 1400, title: 'Knowledge Contributor' },
  { level: 7, minXp: 2000, title: 'Community Mentor' },
  { level: 8, minXp: 2800, title: 'Senior Exchanger' },
  { level: 9, minXp: 3800, title: 'Skill Maestro' },
  { level: 10, minXp: 5000, title: 'Grandmaster Swap' },
];

export function calculateLevelFromXP(totalXp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(totalXp));

  if (safeXp < 5000) {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (safeXp >= LEVEL_THRESHOLDS[i].minXp) {
        const currentTier = LEVEL_THRESHOLDS[i];
        const nextTier = LEVEL_THRESHOLDS[i + 1];
        const minXp = currentTier.minXp;
        const maxXp = nextTier ? nextTier.minXp : 5000;
        const span = maxXp - minXp;
        const progress = span > 0 ? Math.min(100, Math.round(((safeXp - minXp) / span) * 100)) : 100;
        return {
          level: currentTier.level,
          title: currentTier.title,
          currentLevelXp: minXp,
          nextLevelXp: maxXp,
          xpInCurrentLevel: safeXp - minXp,
          xpRequiredForNextLevel: maxXp - safeXp,
          progressPercent: progress,
        };
      }
    }
  }

  // Above level 10: 1500 XP per level
  const extraXp = safeXp - 5000;
  const extraLevels = Math.floor(extraXp / 1500);
  const currentLevel = 10 + extraLevels;
  const currentLevelXp = 5000 + extraLevels * 1500;
  const nextLevelXp = currentLevelXp + 1500;
  const xpInCurrentLevel = safeXp - currentLevelXp;
  const xpRequiredForNextLevel = nextLevelXp - safeXp;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / 1500) * 100));

  return {
    level: currentLevel,
    title: 'Grandmaster Swap',
    currentLevelXp,
    nextLevelXp,
    xpInCurrentLevel,
    xpRequiredForNextLevel,
    progressPercent,
  };
}

export class XPRepository {
  async getOrCreateUserXP(userId: number): Promise<UserXPRecord> {
    const existing = await db.orm.public.UserXP.where({ userId }).first();
    if (existing) {
      return existing as unknown as UserXPRecord;
    }

    try {
      const created = await db.orm.public.UserXP.create({
        userId,
        totalXp: 0,
        currentLevel: 1,
      });
      return created as unknown as UserXPRecord;
    } catch {
      // In case of concurrent race condition, fetch existing
      const retry = await db.orm.public.UserXP.where({ userId }).first();
      return retry as unknown as UserXPRecord;
    }
  }

  async addXPTransaction(params: {
    userId: number;
    amount: number;
    actionType: string;
    idempotencyKey: string;
    description: string;
    metadata?: Record<string, any>;
  }): Promise<{
    applied: boolean;
    alreadyAwarded: boolean;
    transaction: XPTransactionRecord | null;
    userXP: UserXPRecord;
    leveledUp: boolean;
    previousLevel: number;
    newLevel: number;
  }> {
    const userXP = await this.getOrCreateUserXP(params.userId);

    // Check idempotency key to prevent double awarding or XP farming
    const existingTx = await db.orm.public.XPTransaction.where({
      idempotencyKey: params.idempotencyKey,
    }).first();

    if (existingTx) {
      logger.warn(
        { key: params.idempotencyKey, userId: params.userId },
        'XP transaction skipped: idempotency key already exists'
      );
      return {
        applied: false,
        alreadyAwarded: true,
        transaction: existingTx as unknown as XPTransactionRecord,
        userXP,
        leveledUp: false,
        previousLevel: userXP.currentLevel,
        newLevel: userXP.currentLevel,
      };
    }

    // Atomic insert of XPTransaction
    const tx = await db.orm.public.XPTransaction.create({
      userId: params.userId,
      amount: params.amount,
      actionType: params.actionType,
      idempotencyKey: params.idempotencyKey,
      description: params.description,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    });

    // Compute new non-negative total XP
    const newTotalXp = Math.max(0, userXP.totalXp + params.amount);
    const levelCalc = calculateLevelFromXP(newTotalXp);
    const previousLevel = userXP.currentLevel;
    const newLevel = levelCalc.level;
    const leveledUp = newLevel > previousLevel;

    // Update UserXP
    const updated = await db.orm.public.UserXP.where({ id: userXP.id }).update({
      totalXp: newTotalXp,
      currentLevel: newLevel,
    });

    const updatedUserXP = (updated || {
      ...userXP,
      totalXp: newTotalXp,
      currentLevel: newLevel,
    }) as unknown as UserXPRecord;

    return {
      applied: true,
      alreadyAwarded: false,
      transaction: tx as unknown as XPTransactionRecord,
      userXP: updatedUserXP,
      leveledUp,
      previousLevel,
      newLevel,
    };
  }

  async getTransactions(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ transactions: XPTransactionRecord[]; total: number }> {
    const records = await db.orm.public.XPTransaction.where({ userId }).all();
    const sorted = (records as unknown as XPTransactionRecord[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const paged = sorted.slice(offset, offset + limit);

    return {
      transactions: paged,
      total: records.length,
    };
  }

  async getXPEarnedInRange(userId: number, startDate?: Date, endDate?: Date): Promise<number> {
    const records = await db.orm.public.XPTransaction.where({ userId }).all();
    let sum = 0;
    for (const r of records) {
      const created = new Date(r.createdAt);
      if (startDate && created < startDate) continue;
      if (endDate && created > endDate) continue;
      sum += r.amount;
    }
    return sum;
  }
}

export const xpRepository = new XPRepository();
