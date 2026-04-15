import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Global error handler.
 * Always returns { success: false, message, code } shape.
 * Never exposes stack traces in production (per skill spec).
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(err.message || 'Internal server error', err);

  const statusCode = err.statusCode || 500;
  const response: { success: false; message: string; code: string; stack?: string } = {
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  };

  if (ENV.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
