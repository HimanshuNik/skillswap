import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError, HttpStatusCode, ErrorCode } from '../utils/errors.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import type { ApiErrorResponse } from '../types/api.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({ err }, `Error caught in global handler: ${err.message}`);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request data',
        details,
      },
    };

    res.status(HttpStatusCode.BAD_REQUEST).json(response);
    return;
  }

  // Handle body-parser 413 Payload Too Large
  if ((err as any).status === 413 || (err as any).type === 'entity.too.large') {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: ErrorCode.PAYLOAD_TOO_LARGE,
        message: 'Request payload exceeds allowable limit (1MB)',
      },
    };
    res.status(HttpStatusCode.PAYLOAD_TOO_LARGE).json(response);
    return;
  }

  // Handle known operational AppError
  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: String(err.code),
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown or unhandled programmer errors
  const isDev = env.NODE_ENV === 'development';
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: isDev ? err.message : 'An unexpected server error occurred',
      details: isDev ? [{ message: err.stack ?? '' }] : undefined,
    },
  };

  res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json(response);
};

