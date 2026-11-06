import { z } from 'zod';

export const roadmapCreateSchema = z.object({
  skillName: z.string().min(1, 'skillName is required').max(100),
  currentProficiency: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  targetProficiency: z.enum(['Intermediate', 'Advanced', 'Expert']),
  learningObjective: z.string().min(5, 'Objective must be at least 5 characters').max(300),
  preferredPace: z.enum(['INTENSIVE', 'MODERATE', 'CASUAL']).optional().default('MODERATE'),
});

export const milestoneUpdateSchema = z.object({
  isCompleted: z.boolean(),
});

export const recommendationFeedbackSchema = z.object({
  recommendedUserId: z.number().int().positive('recommendedUserId must be a positive integer'),
  feedbackType: z.enum(['HELPFUL', 'NOT_RELEVANT', 'ALREADY_CONNECTED', 'NOT_INTERESTED']),
  reason: z.string().max(250).optional(),
});

export const assistantChatSchema = z.object({
  question: z.string().min(1, 'Question cannot be empty').max(500, 'Question cannot exceed 500 characters'),
});

export const smartScheduleQuerySchema = z.object({
  partnerId: z.coerce.number().int().positive('partnerId must be a positive integer'),
  durationMinutes: z.coerce.number().int().min(15).max(180).optional().default(60),
});

export const similarityAnalyzeSchema = z.object({
  skillA: z.string().min(1, 'skillA is required').max(100),
  skillB: z.string().min(1, 'skillB is required').max(100),
});

