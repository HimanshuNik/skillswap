import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.get('/csrf', (req, res) => authController.getCsrfToken(req, res));
authRouter.post('/register', authRateLimiter, (req, res, next) => authController.register(req, res, next));
authRouter.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
authRouter.post('/logout', (req, res, next) => authController.logout(req, res, next));
authRouter.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
authRouter.post('/forgot-password', passwordResetRateLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
authRouter.post('/reset-password', passwordResetRateLimiter, (req, res, next) => authController.resetPassword(req, res, next));
authRouter.post('/change-password', authenticate, (req, res, next) => authController.changePassword(req, res, next));


