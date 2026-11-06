import type { Request, Response, NextFunction } from 'express';

/**
 * Defensive middleware to bound request lifetimes and prevent connection starvation.
 * Returns 504 Gateway Timeout if the server execution exceeds the threshold.
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Socket.IO and streaming endpoints handle their own lifecycle
    if (req.path.startsWith('/socket.io')) {
      return next();
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: {
            code: 'GATEWAY_TIMEOUT',
            message: 'Request timed out: Server exceeded processing deadline',
          },
        });
      }
    }, timeoutMs);

    // Ensure timer is cancelled when response completes or connection closes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};

