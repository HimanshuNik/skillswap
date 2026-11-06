import { z } from 'zod';

export const privacyUpdateSchema = z.object({
  showLevel: z.boolean().optional(),
  showBadges: z.boolean().optional(),
  showStats: z.boolean().optional(),
  showActivityHeatmap: z.boolean().optional(),
  showLearningGoals: z.boolean().optional(),
});

export const streakToggleSchema = z.object({
  isEnabled: z.boolean(),
});

export const featureBadgeSchema = z.object({
  isFeatured: z.boolean(),
});

export const createGoalSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(100),
  description: z.string().max(500).optional().nullable(),
  skillId: z.number().int().positive().optional().nullable(),
  skillName: z.string().max(100).optional().nullable(),
  goalType: z.enum(['SESSIONS_COUNT', 'HOURS_COUNT', 'ROADMAP_MILESTONES', 'CUSTOM']).default('SESSIONS_COUNT'),
  targetValue: z.number().int().min(1, 'Target value must be at least 1').max(1000),
  unit: z.string().max(20).optional().default('sessions'),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  isAutomated: z.boolean().optional().default(true),
});

export const updateGoalSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  targetValue: z.number().int().min(1).max(1000).optional(),
  currentValue: z.number().int().min(0).max(1000).optional(),
  unit: z.string().max(20).optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
});

export const analyticsOverviewQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d', 'all']).optional().default('30d'),
});

export const activityHeatmapQuerySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  timezone: z.string().optional().default('UTC'),
});

