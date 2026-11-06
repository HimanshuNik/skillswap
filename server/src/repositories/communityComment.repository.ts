import { db } from '../prisma/db.js';
import type { AuthorSummary } from './communityPost.repository.js';

export interface CommunityCommentRecord {
  id: number;
  postId: number;
  authorId: number;
  parentId: number | null;
  content: string;
  depth: number;
  upvoteCount: number;
  isAcceptedAnswer: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityCommentWithDetails extends CommunityCommentRecord {
  author: AuthorSummary;
  hasUpvoted?: boolean;
  replies?: CommunityCommentWithDetails[];
}

export class CommunityCommentRepository {
  async create(data: {
    postId: number;
    authorId: number;
    content: string;
    parentId?: number | null;
    depth?: number;
  }): Promise<CommunityCommentRecord> {
    const comment = await db.orm.public.CommunityComment.create({
      postId: data.postId,
      authorId: data.authorId,
      content: data.content,
      parentId: data.parentId || null,
      depth: Math.min(2, data.depth || 0), // Bounded nesting depth: 0 = root, 1 = reply, 2 = subreply
      upvoteCount: 0,
      isAcceptedAnswer: false,
      isDeleted: false,
    });

    return comment as unknown as CommunityCommentRecord;
  }

  async findById(id: number): Promise<CommunityCommentRecord | null> {
    const comment = await db.orm.public.CommunityComment.where({ id }).first();
    return comment as unknown as CommunityCommentRecord | null;
  }

  async findByPostId(postId: number): Promise<CommunityCommentRecord[]> {
    const comments = (await db.orm.public.CommunityComment.where({ postId }).all()) as unknown as CommunityCommentRecord[];
    // Sort chronologically
    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async update(id: number, data: Partial<CommunityCommentRecord>): Promise<CommunityCommentRecord | null> {
    const updated = await db.orm.public.CommunityComment.where({ id }).update({
      ...(data.content !== undefined && { content: data.content }),
      ...(data.isAcceptedAnswer !== undefined && { isAcceptedAnswer: data.isAcceptedAnswer }),
      ...(data.isDeleted !== undefined && { isDeleted: data.isDeleted }),
      ...(data.upvoteCount !== undefined && { upvoteCount: data.upvoteCount }),
    });

    return (updated as unknown as CommunityCommentRecord) || null;
  }

  async softDelete(id: number): Promise<void> {
    await db.orm.public.CommunityComment.where({ id }).update({
      isDeleted: true,
      content: '[This comment has been deleted]',
    });
  }

  async delete(id: number): Promise<void> {
    await db.orm.public.CommunityComment.where({ id }).delete();
  }

  async incrementUpvotes(id: number, delta: number): Promise<void> {
    const comment = await this.findById(id);
    if (!comment) return;
    const newCount = Math.max(0, comment.upvoteCount + delta);
    await db.orm.public.CommunityComment.where({ id }).update({ upvoteCount: newCount });
  }

  async populateDetailsAndBuildTree(
    comments: CommunityCommentRecord[],
    currentUserId?: number
  ): Promise<CommunityCommentWithDetails[]> {
    if (comments.length === 0) return [];

    const authorIds = [...new Set(comments.map((c) => c.authorId))];
    const commentIds = comments.map((c) => c.id);

    const [allUsers, userVotes] = await Promise.all([
      db.orm.public.User.all(),
      currentUserId
        ? db.orm.public.CommunityVote.where({ userId: currentUserId, targetType: 'COMMENT' }).all()
        : Promise.resolve([]),
    ]);

    const userMap = new Map(
      (allUsers as any[]).map((u) => [
        u.id,
        { id: u.id, name: u.name, username: u.username, avatarUrl: u.avatarUrl || null },
      ])
    );

    const upvotedCommentIds = new Set(
      (userVotes as any[]).map((v) => v.targetId)
    );

    // Map each comment to detailed record
    const detailedComments: CommunityCommentWithDetails[] = comments.map((c) => {
      const author = userMap.get(c.authorId) || {
        id: c.authorId,
        name: 'Community Member',
        username: `user_${c.authorId}`,
        avatarUrl: null,
      };

      return {
        ...c,
        author: c.isDeleted
          ? { id: 0, name: '[deleted]', username: 'deleted', avatarUrl: null }
          : author,
        hasUpvoted: upvotedCommentIds.has(c.id),
        replies: [],
      };
    });

    // Assemble hierarchical tree:
    // Root items (parentId === null) have replies populated
    const commentMap = new Map<number, CommunityCommentWithDetails>();
    detailedComments.forEach((c) => commentMap.set(c.id, c));

    const rootComments: CommunityCommentWithDetails[] = [];

    detailedComments.forEach((c) => {
      if (c.parentId && commentMap.has(c.parentId)) {
        const parent = commentMap.get(c.parentId)!;
        parent.replies = parent.replies || [];
        parent.replies.push(c);
      } else {
        rootComments.push(c);
      }
    });

    // For questions, accepted answer should appear first among root answers
    rootComments.sort((a, b) => {
      if (a.isAcceptedAnswer !== b.isAcceptedAnswer) {
        return a.isAcceptedAnswer ? -1 : 1;
      }
      return b.upvoteCount - a.upvoteCount;
    });

    return rootComments;
  }
}
