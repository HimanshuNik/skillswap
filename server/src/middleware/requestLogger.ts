import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';
import { telemetry } from '../utils/telemetry.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  // Extract or generate unique Request ID for distributed tracing
  const incomingRequestId = req.headers['x-request-id'];
  const requestId =
    typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
      ? incomingRequestId.trim()
      : crypto.randomUUID();

  // Attach to request object and response header
  (req as any).id = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    // Record request in in-memory telemetry tracker
    telemetry.recordRequest(duration, statusCode);

    const logPayload = {
      requestId,
      method,
      url: originalUrl,
      status: statusCode,
      durationMs: duration,
    };

    if (statusCode >= 500) {
      logger.error(logPayload, `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else if (statusCode >= 400) {
      logger.warn(logPayload, `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    } else {
      logger.info(logPayload, `[${requestId}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    }
  });

  next();
};

