import rateLimit from 'express-rate-limit';
import { HttpStatusCode, ErrorCode } from '../utils/errors.js';
import { env } from '../config/env.js';
import type { ApiErrorResponse } from '../types/api.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per window
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      },
    };
    res.status(HttpStatusCode.TOO_MANY_REQUESTS).json(response);
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit password reset requests to 5 per hour per IP
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_EXCEEDED,
        message: 'Too many password reset requests. Please try again in an hour.',
      },
    };
    res.status(HttpStatusCode.TOO_MANY_REQUESTS).json(response);
  },
});

