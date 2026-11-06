import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-csrf-token"]',
      'password',
      'passwordHash',
      'currentPassword',
      'newPassword',
      'token',
      'resetToken',
      'secret',
      'cardNumber',
      'cvc',
      'stripeSecretKey',
      'STRIPE_SECRET_KEY',
      'vapidPrivateKey',
      'privateKey',
      '*.password',
      '*.passwordHash',
      '*.cardNumber',
      '*.cvc',
      '*.secret',
      '*.privateKey',
    ],
    censor: '[REDACTED]',
  },
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

