import { z } from 'zod';

export const subscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh key is required'),
    auth: z.string().min(1, 'auth key is required'),
  }),
  userAgent: z.string().max(500).optional(),
});

export type SubscribePushInput = z.infer<typeof subscribePushSchema>;

export const unsubscribePushSchema = z.object({
  endpoint: z.string().url('Endpoint must be a valid URL'),
});

export type UnsubscribePushInput = z.infer<typeof unsubscribePushSchema>;

export const testPushSchema = z.object({
  title: z.string().max(100).optional(),
  body: z.string().max(300).optional(),
});

export type TestPushInput = z.infer<typeof testPushSchema>;

