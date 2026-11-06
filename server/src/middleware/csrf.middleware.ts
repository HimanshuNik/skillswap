import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { generateCsrfToken } from '../utils/tokens.js';
import { CSRF_COOKIE_NAME, AUTH_COOKIE_NAME, getCsrfCookieOptions } from './auth.middleware.js';
import { ForbiddenError, ErrorCode } from '../utils/errors.js';

export const setCsrfCookie = (res: Response): string => {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  return token;
};

// Paths exempt from CSRF checks (public initial authentication and payment webhooks)
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/billing/webhook',
];


export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Ensure every client has a CSRF cookie set
  if (!req.cookies?.[CSRF_COOKIE_NAME]) {
    setCsrfCookie(res);
  }

  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt unauthenticated entry endpoints
  if (EXEMPT_PATHS.includes(req.path)) {
    return next();
  }

  // Only enforce CSRF when a cookie session exists
  const hasAuthCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);
  if (!hasAuthCookie) {
    return next();
  }

  const csrfHeader = req.headers['x-csrf-token'];
  const csrfCookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!csrfHeader || !csrfCookie || typeof csrfHeader !== 'string' || typeof csrfCookie !== 'string') {
    return next(new ForbiddenError('Invalid or missing CSRF token', ErrorCode.CSRF_ERROR));
  }

  // Constant-time comparison to prevent timing-attack information leakage
  const headerBuf = Buffer.from(csrfHeader);
  const cookieBuf = Buffer.from(csrfCookie);

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return next(new ForbiddenError('Invalid or missing CSRF token', ErrorCode.CSRF_ERROR));
  }

  next();
};

