import { z } from 'zod';

export const createSwapRequestSchema = z.object({
  receiverId: z.number().int().positive('Receiver ID must be a positive integer'),
  senderSkillId: z.number().int().positive('Sender skill ID must be a positive integer'),
  receiverSkillId: z.number().int().positive('Receiver skill ID must be a positive integer'),
  message: z.string().trim().max(500, 'Message cannot exceed 500 characters').optional().nullable(),
});

export type CreateSwapRequestInput = z.infer<typeof createSwapRequestSchema>;

