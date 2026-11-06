import { z } from 'zod';

export const RESERVED_USERNAMES = [
  'admin',
  'administrator',
  'system',
  'root',
  'api',
  'auth',
  'null',
  'undefined',
  'support',
  'help',
  'skillswap',
  'moderator',
  'mod',
] as const;

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(
      /^[a-z0-9_-]+$/,
      'Username can only contain lowercase letters, numbers, underscores, and hyphens'
    )
    .refine(
      (u) => !RESERVED_USERNAMES.includes(u as any),
      { message: 'This username is reserved' }
    ),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Email or username is required'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password cannot exceed 128 characters'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required to confirm account deletion'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;


