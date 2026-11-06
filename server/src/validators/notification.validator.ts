import { z } from 'zod';

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  page: z.coerce.number().int().min(1).optional().default(1),
  unreadOnly: z
    .preprocess((val) => {
      if (typeof val === 'string') {
        return val.toLowerCase() === 'true';
      }
      return Boolean(val);
    }, z.boolean())
    .optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;

