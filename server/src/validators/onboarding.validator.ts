import { z } from 'zod';

export const PROFICIENCY_LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const;
export const LEARNING_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const TIME_SLOTS = ['Morning', 'Afternoon', 'Evening'] as const;

export const onboardingSchema = z.object({
  profile: z.object({
    displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(100),
    bio: z.string().max(1000, 'Bio cannot exceed 1000 characters').optional().default(''),
    location: z.string().max(100, 'Location cannot exceed 100 characters').optional().default(''),
  }),
  teachingSkills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Skill name cannot be empty'),
        level: z.enum(PROFICIENCY_LEVELS, {
          message: 'Invalid proficiency level (Beginner, Intermediate, Advanced, Expert)',
        }),
      })
    )
    .min(1, 'At least one teaching skill is required')
    .refine(
      (skills) => {
        const names = skills.map((s) => s.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: 'Teaching skills cannot contain duplicates' }
    ),
  learningSkills: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Skill name cannot be empty'),
        targetLevel: z.enum(LEARNING_LEVELS, {
          message: 'Invalid learning target level (Beginner, Intermediate, Advanced)',
        }),
      })
    )
    .min(1, 'At least one learning skill is required')
    .refine(
      (skills) => {
        const names = skills.map((s) => s.name.toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: 'Learning skills cannot contain duplicates' }
    ),
  availability: z.object({
    schedule: z
      .array(
        z.object({
          day: z.string(),
          slots: z.array(z.string()),
        })
      )
      .refine(
        (schedule) => schedule.some((day) => day.slots && day.slots.length > 0),
        { message: 'At least one availability slot must be selected' }
      ),
    sessionLength: z.number().optional().default(60),
    timezone: z.string().optional().default('UTC'),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

