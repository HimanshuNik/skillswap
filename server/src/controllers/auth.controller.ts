import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';
import {
  AUTH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  getAuthCookieOptions,
  getCsrfCookieOptions,
} from '../middleware/auth.middleware.js';
import { setCsrfCookie } from '../middleware/csrf.middleware.js';
import { HttpStatusCode } from '../utils/errors.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await authService.register(validated);

      // Set secure HTTP-only auth cookie
      res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
      // Set CSRF token cookie for future state-changing requests
      const csrfToken = setCsrfCookie(res);

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        message: 'Account created successfully',
        data: {
          user: result.user,
          csrfToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await authService.login(validated);

      res.cookie(AUTH_COOKIE_NAME, result.token, getAuthCookieOptions());
      const csrfToken = setCsrfCookie(res);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Signed in successfully',
        data: {
          user: result.user,
          csrfToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authOpts = getAuthCookieOptions();
      const csrfOpts = getCsrfCookieOptions();

      res.clearCookie(AUTH_COOKIE_NAME, {
        path: authOpts.path,
        httpOnly: authOpts.httpOnly,
        secure: authOpts.secure,
        sameSite: authOpts.sameSite,
      });
      res.clearCookie(CSRF_COOKIE_NAME, {
        path: csrfOpts.path,
        httpOnly: csrfOpts.httpOnly,
        secure: csrfOpts.secure,
        sameSite: csrfOpts.sameSite,
      });

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      // Ensure CSRF cookie exists
      let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
      if (!csrfToken) {
        csrfToken = setCsrfCookie(res);
      }

      res.status(HttpStatusCode.OK).json({
        success: true,
        data: {
          user: req.user,
          csrfToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = forgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(validated);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(validated);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(HttpStatusCode.UNAUTHORIZED).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
        return;
      }

      const validated = changePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user.id, validated);

      res.status(HttpStatusCode.OK).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  getCsrfToken(req: Request, res: Response): void {
    let token = req.cookies?.[CSRF_COOKIE_NAME];
    if (!token) {
      token = setCsrfCookie(res);
    }

    res.status(HttpStatusCode.OK).json({
      success: true,
      data: { csrfToken: token },
    });
  }
}

export const authController = new AuthController();

