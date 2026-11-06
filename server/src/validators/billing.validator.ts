import { z } from 'zod';

export const createCheckoutSchema = z.object({
  planCode: z.enum(['PRO', 'PREMIUM'], {
    error: 'planCode must be PRO or PREMIUM',
  }),
  billingCycle: z.enum(['MONTHLY', 'YEARLY'], {
    error: 'billingCycle must be MONTHLY or YEARLY',
  }),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;

