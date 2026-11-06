import { z } from 'zod';
import { PROFICIENCY_LEVELS, LEARNING_LEVELS } from './onboarding.validator.js';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  bio: z.string().max(1000, 'Bio cannot exceed 1000 characters').nullable().optional(),
  location: z.string().max(100, 'Location cannot exceed 100 characters').nullable().optional(),
  timezone: z.string().max(50, 'Timezone is too long').nullable().optional(),
  avatarUrl: z.string().url('Avatar URL must be a valid URL').or(z.literal('')).nullable().optional(),
});

export const addTeachingSkillSchema = z
  .object({
    skillId: z.number().int().positive().optional(),
    skillName: z.string().trim().min(1).optional(),
    proficiencyLevel: z.enum(PROFICIENCY_LEVELS, {
      message: 'Invalid proficiency level (Beginner, Intermediate, Advanced, Expert)',
    }),
  })
  .refine((data) => data.skillId !== undefined || data.skillName !== undefined, {
    message: 'Either skillId or skillName must be provided',
  });

export const addLearningSkillSchema = z
  .object({
    skillId: z.number().int().positive().optional(),
    skillName: z.string().trim().min(1).optional(),
    targetLevel: z.enum(LEARNING_LEVELS, {
      message: 'Invalid target level (Beginner, Intermediate, Advanced)',
    }),
  })
  .refine((data) => data.skillId !== undefined || data.skillName !== undefined, {
    message: 'Either skillId or skillName must be provided',
  });

export const updateAvailabilitySchema = z.object({
  schedule: z
    .array(
      z.object({
        day: z.string(),
        slots: z.array(z.string()),
      })
    )
    .min(1, 'Schedule must contain days'),
  timezone: z.string().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddTeachingSkillInput = z.infer<typeof addTeachingSkillSchema>;
export type AddLearningSkillInput = z.infer<typeof addLearningSkillSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const updateNotificationPreferencesSchema = z.object({
  swapRequests: z.boolean().optional(),
  messages: z.boolean().optional(),
  sessions: z.boolean().optional(),
  reviews: z.boolean().optional(),
  emailAlerts: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  pushSwapRequests: z.boolean().optional(),
  pushMessages: z.boolean().optional(),
  pushSessions: z.boolean().optional(),
  pushReminders: z.boolean().optional(),
  pushGroupActivity: z.boolean().optional(),
});
export type UpdateNotificationPreferencesInput = z.infer<typeof updateNotificationPreferencesSchema>;


