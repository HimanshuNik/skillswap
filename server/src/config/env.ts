import 'dotenv/config';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    JWT_SECRET: z.string().default('skillswap-dev-jwt-super-secret-key-32chars-min'),
    JWT_EXPIRES_IN: z.string().default('7d'),
    COOKIE_SECRET: z.string().default('skillswap-dev-cookie-secret-key-32chars'),
    VAPID_PUBLIC_KEY: z.string().default('BEMJEc0SSeD7V7hSKwinFmepDVt_BTMoWnleMePjKvIm03PK6Cx7o5WQ1mOLwcj3sAVDVK7SRL3rppxJufQd4Kg'),
    VAPID_PRIVATE_KEY: z.string().default('8spk2LJw67tg2noKEZPxwgo2VYVmPJwfBTALO1a0Crg'),
    VAPID_SUBJECT: z.string().default('mailto:admin@skillswap.local'),
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return (
          data.JWT_SECRET !== 'skillswap-dev-jwt-super-secret-key-32chars-min' &&
          data.JWT_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message: 'In production, a custom JWT_SECRET of at least 32 characters must be set.',
      path: ['JWT_SECRET'],
    }
  )
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return (
          data.COOKIE_SECRET !== 'skillswap-dev-cookie-secret-key-32chars' &&
          data.COOKIE_SECRET.length >= 32
        );
      }
      return true;
    },
    {
      message: 'In production, a custom COOKIE_SECRET of at least 32 characters must be set.',
      path: ['COOKIE_SECRET'],
    }
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Environment configuration error:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
