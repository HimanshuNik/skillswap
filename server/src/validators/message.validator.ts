import { z } from 'zod';

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  clientMessageId: z.string().optional(),
});

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  beforeId: z.coerce.number().int().positive().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type GetMessagesQueryInput = z.infer<typeof getMessagesQuerySchema>;

