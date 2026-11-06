import type { Request, Response } from 'express';
import { CommunityService } from '../services/community/community.service.js';
import {
  createPostSchema,
  updatePostSchema,
  createCommentSchema,
  updateCommentSchema,
  voteSchema,
  communityReportSchema,
} from '../validators/community.validator.js';

export class CommunityController {
  constructor(private communityService: CommunityService = new CommunityService()) {}

  createPost = async (req: Request, res: Response): Promise<void> => {
    const validated = createPostSchema.parse(req.body);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const post = await this.communityService.createPost(userId, validated, userRole);
    res.status(201).json({ success: true, data: { post } });
  };

  getPostById = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const post = await this.communityService.getPostById(postId, currentUserId, userRole);
    res.json({ success: true, data: { post } });
  };

  listPosts = async (req: Request, res: Response): Promise<void> => {
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const skillId = req.query.skillId ? parseInt(req.query.skillId as string, 10) : undefined;
    const groupId = req.query.groupId !== undefined ? (req.query.groupId === 'null' ? null : parseInt(req.query.groupId as string, 10)) : undefined;
    const postType = req.query.postType as string | undefined;
    const search = req.query.search as string | undefined;
    const sort = req.query.sort as 'recent' | 'popular' | 'unanswered' | undefined;
    const isResolved = req.query.isResolved !== undefined ? req.query.isResolved === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const result = await this.communityService.listPosts(
      { skillId, groupId, postType, search, sort, isResolved, page, limit },
      currentUserId,
      userRole
    );

    res.json({
      success: true,
      data: {
        posts: result.posts,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      },
    });
  };

  updatePost = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = updatePostSchema.parse(req.body);

    const post = await this.communityService.updatePost(postId, userId, validated, userRole);
    res.json({ success: true, data: { post } });
  };

  deletePost = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await this.communityService.deletePost(postId, userId, userRole);
    res.json({ success: true, message: 'Post successfully deleted' });
  };

  createComment = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = createCommentSchema.parse(req.body);

    const comment = await this.communityService.createComment(postId, userId, validated, userRole);
    res.status(201).json({ success: true, data: { comment } });
  };

  getComments = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const currentUserId = req.user?.id;
    const userRole = req.user?.role;

    const comments = await this.communityService.getComments(postId, currentUserId, userRole);
    res.json({ success: true, data: { comments } });
  };

  updateComment = async (req: Request, res: Response): Promise<void> => {
    const commentId = parseInt(req.params.commentId as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = updateCommentSchema.parse(req.body);

    const comment = await this.communityService.updateComment(commentId, userId, validated.content, userRole);
    res.json({ success: true, data: { comment } });
  };

  deleteComment = async (req: Request, res: Response): Promise<void> => {
    const commentId = parseInt(req.params.commentId as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    await this.communityService.deleteComment(commentId, userId, userRole);
    res.json({ success: true, message: 'Comment successfully removed' });
  };

  markAcceptedAnswer = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const commentId = parseInt(req.params.commentId as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const result = await this.communityService.markAcceptedAnswer(postId, commentId, userId, userRole);
    res.json({
      success: true,
      message: 'Answer marked as accepted solution',
      data: result,
    });
  };

  unmarkAcceptedAnswer = async (req: Request, res: Response): Promise<void> => {
    const postId = parseInt(req.params.id as string, 10);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const post = await this.communityService.unmarkAcceptedAnswer(postId, userId, userRole);
    res.json({
      success: true,
      message: 'Accepted answer unselected',
      data: { post },
    });
  };

  toggleVote = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const validated = voteSchema.parse(req.body);

    const result = await this.communityService.toggleVote(
      userId,
      validated.targetType,
      validated.targetId,
      userRole
    );

    res.json({ success: true, data: result });
  };

  reportContent = async (req: Request, res: Response): Promise<void> => {
    const reporterId = req.user!.id;
    const validated = communityReportSchema.parse(req.body);

    const result = await this.communityService.reportContent(reporterId, validated);
    res.status(201).json(result);
  };

  getAnalytics = async (_req: Request, res: Response): Promise<void> => {
    const analytics = await this.communityService.getAnalytics();
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json({ success: true, data: { analytics } });
  };
}

