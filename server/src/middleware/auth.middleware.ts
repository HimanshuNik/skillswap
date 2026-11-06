import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { verifyToken, type AuthTokenPayload } from '../utils/tokens.js';
import { userRepository, type SafeUser } from '../repositories/user.repository.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

export const AUTH_COOKIE_NAME = 'skillswap_token';
export const CSRF_COOKIE_NAME = 'skillswap_csrf';

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export const getCsrfCookieOptions = () => ({
  httpOnly: false, // Client needs to read this cookie to attach to x-csrf-token header
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      tokenPayload?: AuthTokenPayload;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    // Fallback to Bearer header if provided
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const payload = verifyToken(token);
    if (!payload) {
      throw new UnauthorizedError('Session expired, please sign in again');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || user.isActive === false) {
      throw new UnauthorizedError(
        user && user.isActive === false ? 'Account has been deactivated' : 'User account not found'
      );
    }

    if (user.isSuspended) {
      throw new ForbiddenError(
        user.suspendedReason
          ? `Your account has been suspended: ${user.suspendedReason}`
          : 'Your account has been suspended by an administrator'
      );
    }

    req.user = userRepository.toSafeUser(user);
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const role = req.user.role || 'USER';
    if (!allowedRoles.includes(role)) {
      throw new ForbiddenError('Insufficient permissions to access this resource');
    }
    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireModerator = requireRole(['ADMIN', 'MODERATOR']);

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        const user = await userRepository.findById(payload.userId);
        if (user && user.isActive !== false) {
          req.user = userRepository.toSafeUser(user);
          req.tokenPayload = payload;
        }
      }
    }
    next();
  } catch {
    next();
  }
};

