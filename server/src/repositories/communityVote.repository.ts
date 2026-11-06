import { db } from '../prisma/db.js';

export interface CommunityVoteRecord {
  id: number;
  userId: number;
  targetType: string; // POST, COMMENT
  targetId: number;
  voteType: string; // UPVOTE
  createdAt: string;
}

export class CommunityVoteRepository {
  async findUserVote(
    userId: number,
    targetType: string,
    targetId: number
  ): Promise<CommunityVoteRecord | null> {
    const vote = await db.orm.public.CommunityVote.where({
      userId,
      targetType,
      targetId,
    }).first();

    return vote as unknown as CommunityVoteRecord | null;
  }

  async create(data: {
    userId: number;
    targetType: string;
    targetId: number;
    voteType?: string;
  }): Promise<CommunityVoteRecord> {
    const vote = await db.orm.public.CommunityVote.create({
      userId: data.userId,
      targetType: data.targetType,
      targetId: data.targetId,
      voteType: data.voteType || 'UPVOTE',
    });

    return vote as unknown as CommunityVoteRecord;
  }

  async delete(userId: number, targetType: string, targetId: number): Promise<void> {
    await db.orm.public.CommunityVote.where({
      userId,
      targetType,
      targetId,
    }).delete();
  }

  async countByTarget(targetType: string, targetId: number): Promise<number> {
    const votes = await db.orm.public.CommunityVote.where({
      targetType,
      targetId,
    }).all();

    return votes.length;
  }
}

