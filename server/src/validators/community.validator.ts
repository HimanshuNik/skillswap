import { z } from 'zod';

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters'),
  content: z
    .string()
    .trim()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content cannot exceed 10,000 characters'),
  postType: z
    .enum(['DISCUSSION', 'QUESTION', 'RESOURCE'])
    .default('DISCUSSION'),
  skillId: z.number().int().positive().nullable().optional(),
  groupId: z.number().int().positive().nullable().optional(),
  tags: z.string().trim().max(100).nullable().optional(),
});

export const updatePostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  content: z
    .string()
    .trim()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content cannot exceed 10,000 characters')
    .optional(),
  tags: z.string().trim().max(100).nullable().optional(),
  isPinned: z.boolean().optional(),
  isLocked: z.boolean().optional(),
  isHidden: z.boolean().optional(),
});

export const createCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(3000, 'Comment cannot exceed 3,000 characters'),
  parentId: z.number().int().positive().nullable().optional(),
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(3000, 'Comment cannot exceed 3,000 characters'),
});

export const voteSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.number().int().positive(),
});

export const createGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name cannot exceed 100 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1,000 characters'),
  skillId: z.number().int().positive().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  membershipRules: z.string().trim().max(1000).nullable().optional(),
});

export const updateGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name cannot exceed 100 characters')
    .optional(),
  description: z
    .string()
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(1000, 'Description cannot exceed 1,000 characters')
    .optional(),
  skillId: z.number().int().positive().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  membershipRules: z.string().trim().max(1000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const groupMemberActionSchema = z.object({
  userId: z.number().int().positive(),
  action: z.enum(['APPROVE', 'REJECT', 'PROMOTE_MODERATOR', 'DEMOTE_MEMBER', 'REMOVE']),
});

export const communityReportSchema = z.object({
  targetType: z.enum(['COMMUNITY_POST', 'COMMUNITY_COMMENT', 'STUDY_GROUP']),
  targetId: z.number().int().positive(),
  category: z.enum(['SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'MISLEADING', 'OTHER']),
  reason: z
    .string()
    .trim()
    .min(5, 'Reason must be at least 5 characters')
    .max(1000, 'Reason cannot exceed 1,000 characters'),
});

