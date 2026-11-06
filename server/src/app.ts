import cors from 'cors';
import cookieParser from 'cookie-parser';
import express, { type Application } from 'express';
import { env } from './config/env.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { apiRouter } from './routes/index.js';
import { healthController } from './controllers/health.controller.js';
import { NotFoundError } from './utils/errors.js';
import { requestTimeout } from './middleware/timeout.middleware.js';

export const createApp = (): Application => {
  const app = express();

  // Bounded Request Timeout (30s)
  app.use(requestTimeout(30000));

  // Defensive Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    if (env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // CORS configuration
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    })
  );

  // Cookie parsing with secret
  app.use(cookieParser(env.COOKIE_SECRET));

  // Body parsing with 1mb payload limit and rawBody buffer preservation for webhooks
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as any).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));


  // CSRF protection middleware for state-changing requests
  app.use(csrfProtection);

  // Request logger
  app.use(requestLogger);

  // Root greeting route
  app.get('/', (req, res) => healthController.getRoot(req, res));

  // Mount API routes
  app.use('/api', apiRouter);

  // 404 handler for unknown routes
  app.use((req, _res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
};
