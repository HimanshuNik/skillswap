import {
  CommunityPostRepository,
  type CommunityPostRecord,
  type CommunityPostWithDetails,
} from '../../repositories/communityPost.repository.js';
import {
  CommunityCommentRepository,
  type CommunityCommentRecord,
  type CommunityCommentWithDetails,
} from '../../repositories/communityComment.repository.js';
import { CommunityVoteRepository } from '../../repositories/communityVote.repository.js';
import { StudyGroupService } from './studyGroup.service.js';
import { GamificationService } from '../gamification/gamification.service.js';
import { NotificationService } from '../notification.service.js';
import { db } from '../../prisma/db.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../../utils/errors.js';

export class CommunityService {
  constructor(
    private postRepo: CommunityPostRepository = new CommunityPostRepository(),
    private commentRepo: CommunityCommentRepository = new CommunityCommentRepository(),
    private voteRepo: CommunityVoteRepository = new CommunityVoteRepository(),
    private studyGroupService: StudyGroupService = new StudyGroupService(),
    private gamificationService: GamificationService = new GamificationService(),
    private notificationService: NotificationService = new NotificationService()
  ) {}

  private sanitize(input: string): string {
    // Strip malicious script and event handler tags while preserving markdown formatting
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/javascript:[^"']*/gi, '');
  }

  // --- 1. POSTS ---

  async createPost(
    userId: number,
    data: {
      title: string;
      content: string;
      postType?: string;
      skillId?: number | null;
      groupId?: number | null;
      tags?: string | null;
    },
    userRole?: string
  ): Promise<CommunityPostWithDetails> {
    // If inside a study group, enforce posting permissions
    if (data.groupId) {
      const canPost = await this.studyGroupService.canPostInGroup(data.groupId, userId, userRole);
      if (!canPost) {
        throw new ForbiddenError('You must be an active member of this study group to post.');
      }
    }

    const title = this.sanitize(data.title.trim());
    const content = this.sanitize(data.content.trim());

    const post = await this.postRepo.create({
      authorId: userId,
      title,
      content,
      postType: data.postType || 'DISCUSSION',
      skillId: data.skillId || null,
      groupId: data.groupId || null,
      tags: data.tags || null,
    });

    const [details] = await this.postRepo.populateDetails([post], userId);
    this.clearAnalyticsCache();
    return details;
  }

  async getPostById(
    postId: number,
    currentUserId?: number,
    userRole?: string
  ): Promise<CommunityPostWithDetails> {
    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new NotFoundError('Post not found');
    }

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';

    if (post.isHidden && !isPrivileged && post.authorId !== currentUserId) {
      throw new NotFoundError('Post not found');
    }

    // If inside a study group, enforce access control
    if (post.groupId) {
      const canAccess = await this.studyGroupService.canAccessGroup(
        post.groupId,
        currentUserId,
        userRole
      );
      if (!canAccess) {
        throw new ForbiddenError('You do not have permission to view posts in this private group.');
      }
    }

    // Increment views asynchronously
    this.postRepo.incrementViews(postId).catch(() => {});

    const [details] = await this.postRepo.populateDetails([post], currentUserId);
    return details;
  }

  async listPosts(
    filters: {
      skillId?: number;
      groupId?: number | null;
      postType?: string;
      search?: string;
      sort?: 'recent' | 'popular' | 'unanswered';
      isResolved?: boolean;
      page?: number;
      limit?: number;
    },
    currentUserId?: number,
    userRole?: string
  ): Promise<{ posts: CommunityPostWithDetails[]; total: number }> {
    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';

    if (filters.groupId) {
      const canAccess = await this.studyGroupService.canAccessGroup(
        filters.groupId,
        currentUserId,
        userRole
      );
      if (!canAccess) {
        throw new ForbiddenError('You do not have permission to view posts in this group.');
      }
    }

    // For public feed without specific groupId, protect private groups
    let allowedGroupIds: number[] = [];
    if (!filters.groupId && !isPrivileged) {
      allowedGroupIds = await this.studyGroupService.getUserActiveGroupIds(currentUserId);
    }

    const { posts, total } = await this.postRepo.findMany({
      ...filters,
      includeHidden: isPrivileged,
      excludePrivateGroups: !filters.groupId && !isPrivileged,
      allowedGroupIds,
    });

    const populated = await this.postRepo.populateDetails(posts, currentUserId);
    return { posts: populated, total };
  }

  async updatePost(
    postId: number,
    userId: number,
    data: {
      title?: string;
      content?: string;
      tags?: string | null;
      isPinned?: boolean;
      isLocked?: boolean;
      isHidden?: boolean;
    },
    userRole?: string
  ): Promise<CommunityPostWithDetails> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    const isAuthor = post.authorId === userId;

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to edit this post');
    }

    // Only moderators can change moderation flags
    if ((data.isPinned !== undefined || data.isLocked !== undefined || data.isHidden !== undefined) && !isPrivileged) {
      throw new ForbiddenError('Only moderators can pin, lock, or hide posts');
    }

    const updated = await this.postRepo.update(postId, {
      ...(data.title && { title: this.sanitize(data.title.trim()) }),
      ...(data.content && { content: this.sanitize(data.content.trim()) }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(isPrivileged && data.isPinned !== undefined && { isPinned: data.isPinned }),
      ...(isPrivileged && data.isLocked !== undefined && { isLocked: data.isLocked }),
      ...(isPrivileged && data.isHidden !== undefined && { isHidden: data.isHidden }),
    });

    const [details] = await this.postRepo.populateDetails([updated!], userId);
    return details;
  }

  async deletePost(postId: number, userId: number, userRole?: string): Promise<void> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    const isAuthor = post.authorId === userId;

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to delete this post');
    }

    await this.postRepo.delete(postId);
    this.clearAnalyticsCache();
  }

  // --- 2. COMMENTS & ANSWERS ---

  async createComment(
    postId: number,
    userId: number,
    data: {
      content: string;
      parentId?: number | null;
    },
    userRole?: string
  ): Promise<CommunityCommentRecord> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    if (post.isLocked && userRole !== 'ADMIN') {
      throw new BadRequestError('This discussion is locked. New comments cannot be added.');
    }

    if (post.groupId) {
      const canPost = await this.studyGroupService.canPostInGroup(post.groupId, userId, userRole);
      if (!canPost) {
        throw new ForbiddenError('You must be a member of this study group to comment.');
      }
    }

    let depth = 0;
    let parentComment: CommunityCommentRecord | null = null;

    if (data.parentId) {
      parentComment = await this.commentRepo.findById(data.parentId);
      if (!parentComment || parentComment.postId !== postId) {
        throw new BadRequestError('Parent comment does not exist in this discussion');
      }
      depth = Math.min(2, parentComment.depth + 1);
    }

    const content = this.sanitize(data.content.trim());

    const comment = await this.commentRepo.create({
      postId,
      authorId: userId,
      content,
      parentId: data.parentId || null,
      depth,
    });

    await this.postRepo.incrementComments(postId, 1);

    // Notifications
    try {
      if (data.parentId && parentComment && parentComment.authorId !== userId) {
        // Reply to a comment
        await this.notificationService.createNotification({
          userId: parentComment.authorId,
          type: 'COMMENT_REPLY',
          title: 'New Reply to Your Comment',
          message: `Someone replied to your comment in "${post.title}".`,
          linkUrl: `/community/posts/${postId}`,
        });
      } else if (!data.parentId && post.authorId !== userId) {
        // Root comment / answer on the post
        const isQuestion = post.postType === 'QUESTION';
        await this.notificationService.createNotification({
          userId: post.authorId,
          type: isQuestion ? 'QUESTION_ANSWER' : 'POST_REPLY',
          title: isQuestion ? 'New Answer to Your Question' : 'New Comment on Your Post',
          message: `Someone posted in "${post.title}".`,
          linkUrl: `/community/posts/${postId}`,
        });
      }
    } catch {
      // Non-blocking notification dispatch
    }

    this.clearAnalyticsCache();
    return comment;
  }

  async getComments(
    postId: number,
    currentUserId?: number,
    userRole?: string
  ): Promise<CommunityCommentWithDetails[]> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Post not found');

    if (post.groupId) {
      const canAccess = await this.studyGroupService.canAccessGroup(
        post.groupId,
        currentUserId,
        userRole
      );
      if (!canAccess) {
        throw new ForbiddenError('You do not have permission to view comments in this private group.');
      }
    }

    const comments = await this.commentRepo.findByPostId(postId);
    return this.commentRepo.populateDetailsAndBuildTree(comments, currentUserId);
  }

  async updateComment(
    commentId: number,
    userId: number,
    content: string,
    userRole?: string
  ): Promise<CommunityCommentRecord> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    if (comment.authorId !== userId && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to edit this comment');
    }

    if (comment.isDeleted) {
      throw new BadRequestError('Deleted comments cannot be edited');
    }

    const sanitized = this.sanitize(content.trim());
    const updated = await this.commentRepo.update(commentId, { content: sanitized });
    return updated!;
  }

  async deleteComment(commentId: number, userId: number, userRole?: string): Promise<void> {
    const comment = await this.commentRepo.findById(commentId);
    if (!comment) throw new NotFoundError('Comment not found');

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    if (comment.authorId !== userId && !isPrivileged) {
      throw new ForbiddenError('You do not have permission to delete this comment');
    }

    await this.commentRepo.softDelete(commentId);
    await this.postRepo.incrementComments(comment.postId, -1);
    this.clearAnalyticsCache();
  }

  // --- 3. ACCEPTED ANSWER (QUESTIONS) ---

  async markAcceptedAnswer(
    postId: number,
    commentId: number,
    userId: number,
    userRole?: string
  ): Promise<{ post: CommunityPostRecord; comment: CommunityCommentRecord }> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Question not found');

    if (post.postType !== 'QUESTION') {
      throw new BadRequestError('Accepted answers can only be designated for questions');
    }

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    if (post.authorId !== userId && !isPrivileged) {
      throw new ForbiddenError('Only the question author or a moderator can mark an accepted answer');
    }

    const comment = await this.commentRepo.findById(commentId);
    if (!comment || comment.postId !== postId) {
      throw new NotFoundError('Answer not found in this question');
    }

    if (comment.isDeleted) {
      throw new BadRequestError('A deleted comment cannot be marked as the accepted answer');
    }

    // Unset any previous accepted answer
    if (post.acceptedAnswerId) {
      await this.commentRepo.update(post.acceptedAnswerId, { isAcceptedAnswer: false });
    }

    // Mark new accepted answer
    const updatedComment = await this.commentRepo.update(commentId, { isAcceptedAnswer: true });
    const updatedPost = await this.postRepo.update(postId, {
      acceptedAnswerId: commentId,
      isResolved: true,
    });

    // Gamification Hook: Award +25 XP to the helpful answer author
    try {
      await this.gamificationService.awardXP({
        userId: comment.authorId,
        amount: 25,
        actionType: 'COMMUNITY_ACCEPTED_ANSWER',
        idempotencyKey: `ACCEPTED_ANSWER:${comment.id}`,
        description: `Your answer was marked as accepted on question "${post.title}"`,
        metadata: { postId: post.id, commentId: comment.id },
      });

      await this.notificationService.createNotification({
        userId: comment.authorId,
        type: 'ACCEPTED_ANSWER',
        title: 'Solution Accepted! +25 XP 🎉',
        message: `Your answer to "${post.title}" was marked as the accepted solution!`,
        linkUrl: `/community/posts/${postId}`,
      });
    } catch {
      // Non-blocking gamification hook
    }

    return { post: updatedPost!, comment: updatedComment! };
  }

  async unmarkAcceptedAnswer(
    postId: number,
    userId: number,
    userRole?: string
  ): Promise<CommunityPostRecord> {
    const post = await this.postRepo.findById(postId);
    if (!post) throw new NotFoundError('Question not found');

    const isPrivileged = userRole === 'ADMIN' || userRole === 'MODERATOR';
    if (post.authorId !== userId && !isPrivileged) {
      throw new ForbiddenError('Only the question author or a moderator can unmark the accepted answer');
    }

    if (post.acceptedAnswerId) {
      await this.commentRepo.update(post.acceptedAnswerId, { isAcceptedAnswer: false });
    }

    const updatedPost = await this.postRepo.update(postId, {
      acceptedAnswerId: null,
      isResolved: false,
    });

    return updatedPost!;
  }

  // --- 4. VOTING & REACTIONS ---

  async toggleVote(
    userId: number,
    targetType: 'POST' | 'COMMENT',
    targetId: number,
    userRole?: string
  ): Promise<{ upvoted: boolean; count: number }> {
    if (targetType === 'POST') {
      const post = await this.postRepo.findById(targetId);
      if (!post) throw new NotFoundError('Post not found');
      if (post.groupId) {
        const canAccess = await this.studyGroupService.canAccessGroup(post.groupId, userId, userRole);
        if (!canAccess) throw new ForbiddenError('Cannot vote on posts in private groups you have not joined');
      }
    } else {
      const comment = await this.commentRepo.findById(targetId);
      if (!comment || comment.isDeleted) throw new NotFoundError('Comment not found');
    }

    const existingVote = await this.voteRepo.findUserVote(userId, targetType, targetId);

    if (existingVote) {
      // Remove vote
      await this.voteRepo.delete(userId, targetType, targetId);
      if (targetType === 'POST') {
        await this.postRepo.incrementUpvotes(targetId, -1);
      } else {
        await this.commentRepo.incrementUpvotes(targetId, -1);
      }
      const count = await this.voteRepo.countByTarget(targetType, targetId);
      return { upvoted: false, count };
    } else {
      // Add vote
      await this.voteRepo.create({ userId, targetType, targetId });
      if (targetType === 'POST') {
        await this.postRepo.incrementUpvotes(targetId, 1);
      } else {
        await this.commentRepo.incrementUpvotes(targetId, 1);
      }
      const count = await this.voteRepo.countByTarget(targetType, targetId);
      return { upvoted: true, count };
    }
  }

  // --- 5. REPORTING & MODERATION ---

  async reportContent(
    reporterId: number,
    data: {
      targetType: 'COMMUNITY_POST' | 'COMMUNITY_COMMENT' | 'STUDY_GROUP';
      targetId: number;
      category: string;
      reason: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    let reportedUserId = 0;

    if (data.targetType === 'COMMUNITY_POST') {
      const post = await this.postRepo.findById(data.targetId);
      if (!post) throw new NotFoundError('Post not found');
      reportedUserId = post.authorId;
    } else if (data.targetType === 'COMMUNITY_COMMENT') {
      const comment = await this.commentRepo.findById(data.targetId);
      if (!comment) throw new NotFoundError('Comment not found');
      reportedUserId = comment.authorId;
    } else if (data.targetType === 'STUDY_GROUP') {
      const group = await this.studyGroupService.getGroupById(data.targetId);
      if (!group) throw new NotFoundError('Study group not found');
      reportedUserId = group.creatorId;
    }

    if (reportedUserId === reporterId) {
      throw new BadRequestError('You cannot report your own content');
    }

    // Check recent duplicate reports
    const existingReports = (await db.orm.public.UserReport.where({
      reporterId,
      targetType: data.targetType,
      targetId: data.targetId,
    }).all()) as any[];

    if (existingReports.length > 0) {
      throw new ConflictError('You have already submitted a report for this content.');
    }

    await db.orm.public.UserReport.create({
      reporterId,
      reportedId: reportedUserId,
      targetType: data.targetType,
      targetId: data.targetId,
      category: data.category,
      reason: this.sanitize(data.reason.trim()),
      status: 'OPEN',
    });

    return {
      success: true,
      message: 'Thank you for keeping our community safe. Our moderation team has been notified.',
    };
  }

  // --- 6. COMMUNITY ANALYTICS ---
  private analyticsCache: {
    data: {
      totalPosts: number;
      totalDiscussions: number;
      totalQuestions: number;
      resolvedQuestions: number;
      totalComments: number;
      totalStudyGroups: number;
      popularSkills: Array<{ skillId: number; name: string; count: number }>;
    };
    expiresAt: number;
  } | null = null;
  private readonly analyticsTtlMs = 60 * 1000;

  clearAnalyticsCache(): void {
    this.analyticsCache = null;
  }

  async getAnalytics(): Promise<{
    totalPosts: number;
    totalDiscussions: number;
    totalQuestions: number;
    resolvedQuestions: number;
    totalComments: number;
    totalStudyGroups: number;
    popularSkills: Array<{ skillId: number; name: string; count: number }>;
  }> {
    const now = Date.now();
    if (this.analyticsCache && now < this.analyticsCache.expiresAt) {
      return this.analyticsCache.data;
    }

    const [allPosts, allComments, allGroups, allSkills] = (await Promise.all([
      db.orm.public.CommunityPost.all(),
      db.orm.public.CommunityComment.all(),
      db.orm.public.StudyGroup.all(),
      db.orm.public.Skill.all(),
    ])) as [CommunityPostRecord[], CommunityCommentRecord[], any[], any[]];

    const activePosts = allPosts.filter((p) => !p.isHidden);
    const discussions = activePosts.filter((p) => p.postType === 'DISCUSSION');
    const questions = activePosts.filter((p) => p.postType === 'QUESTION');
    const resolvedQuestions = questions.filter((q) => q.isResolved);

    // Skill distribution
    const skillCountMap = new Map<number, number>();
    activePosts.forEach((p) => {
      if (p.skillId) {
        skillCountMap.set(p.skillId, (skillCountMap.get(p.skillId) || 0) + 1);
      }
    });

    const skillMap = new Map(allSkills.map((s) => [s.id, s.name]));
    const popularSkills = Array.from(skillCountMap.entries())
      .map(([skillId, count]) => ({
        skillId,
        name: skillMap.get(skillId) || 'Unknown Skill',
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const result = {
      totalPosts: activePosts.length,
      totalDiscussions: discussions.length,
      totalQuestions: questions.length,
      resolvedQuestions: resolvedQuestions.length,
      totalComments: allComments.filter((c) => !c.isDeleted).length,
      totalStudyGroups: allGroups.filter((g) => !g.isArchived).length,
      popularSkills,
    };

    this.analyticsCache = {
      data: result,
      expiresAt: now + this.analyticsTtlMs,
    };

    return result;
  }
}
