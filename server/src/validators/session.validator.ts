import { z } from 'zod';

export const RESCHEDULE_ACTIONS = ['ACCEPT', 'REJECT'] as const;
export const COMPLETION_ACTIONS = ['CONFIRM', 'DISPUTE'] as const;
export const SESSION_FILTER_OPTIONS = ['upcoming', 'past', 'all'] as const;
export const SESSION_ROLE_OPTIONS = ['teacher', 'learner'] as const;

export const createSessionSchema = z.object({
  swapRequestId: z.number().int().positive('Swap request ID must be a positive integer'),
  teacherId: z.number().int().positive('Teacher ID must be a positive integer'),
  learnerId: z.number().int().positive('Learner ID must be a positive integer'),
  skillId: z.number().int().positive('Skill ID must be a positive integer'),
  scheduledStart: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start date format' })),
  duration: z.number().int().min(15, 'Minimum duration is 15 minutes').max(240, 'Maximum duration is 240 minutes').default(60),
  timezone: z.string().trim().max(100).optional().default('UTC'),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const rescheduleSessionSchema = z.object({
  proposedStart: z
    .string()
    .datetime({ offset: true })
    .or(z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid proposed date format' })),
  duration: z.number().int().min(15).max(240).optional(),
  reason: z.string().trim().max(500, 'Reason cannot exceed 500 characters').optional().nullable(),
});

export type RescheduleSessionInput = z.infer<typeof rescheduleSessionSchema>;

export const respondRescheduleSchema = z.object({
  action: z.enum(RESCHEDULE_ACTIONS, {
    message: 'Action must be either ACCEPT or REJECT',
  }),
});

export type RespondRescheduleInput = z.infer<typeof respondRescheduleSchema>;

export const cancelSessionSchema = z.object({
  reason: z.string().trim().min(3, 'Cancellation reason must be at least 3 characters').max(500, 'Cancellation reason cannot exceed 500 characters'),
});

export type CancelSessionInput = z.infer<typeof cancelSessionSchema>;

export const confirmCompletionSchema = z
  .object({
    action: z.enum(COMPLETION_ACTIONS, {
      message: 'Action must be either CONFIRM or DISPUTE',
    }),
    disputeReason: z.string().trim().max(500, 'Dispute reason cannot exceed 500 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.action === 'DISPUTE' && (!data.disputeReason || data.disputeReason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Dispute reason is required when disputing session completion',
      path: ['disputeReason'],
    }
  );

export type ConfirmCompletionInput = z.infer<typeof confirmCompletionSchema>;

export const sessionQuerySchema = z.object({
  filter: z.enum(SESSION_FILTER_OPTIONS).optional().default('all'),
  status: z.string().optional(),
  role: z.enum(SESSION_ROLE_OPTIONS).optional(),
  swapRequestId: z.coerce.number().int().positive().optional(),
});

export type SessionQueryInput = z.infer<typeof sessionQuerySchema>;
