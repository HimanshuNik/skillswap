import { z } from 'zod';

export const REVIEW_SORT_OPTIONS = ['newest', 'highest', 'lowest'] as const;

export const createReviewSchema = z.object({
  sessionId: z.number().int().positive('Session ID must be a positive integer'),
  rating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  comment: z
    .string()
    .trim()
    .max(1000, 'Comment cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const reviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  page: z.coerce.number().int().min(1).optional().default(1),
  sort: z.enum(REVIEW_SORT_OPTIONS).optional().default('newest'),
});

export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;

