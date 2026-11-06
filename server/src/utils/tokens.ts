import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface AuthTokenPayload {
  userId: number;
  email: string;
  username: string;
}

/**
 * Signs a JWT token containing user identity.
 */
export const signToken = (payload: AuthTokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
};

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid/expired.
 * Explicitly restricts verification to HS256 to prevent algorithm confusion attacks.
 */
export const verifyToken = (token: string): AuthTokenPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded) {
      return decoded as AuthTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Generates a 32-byte cryptographically secure random token and its SHA-256 hash.
 * The raw token is sent to the user (via email or dev console).
 * The SHA-256 hash is stored in the database.
 */
export const generateResetToken = (): {
  rawToken: string;
  tokenHash: string;
  expiresAt: string;
} => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  return { rawToken, tokenHash, expiresAt };
};

/**
 * Computes the SHA-256 hash of a raw token for database lookup.
 */
export const hashResetToken = (rawToken: string): string => {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
};

/**
 * Generates a 32-byte random CSRF token.
 */
export const generateCsrfToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

