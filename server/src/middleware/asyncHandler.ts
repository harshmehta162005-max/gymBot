import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers so thrown errors are caught
 * and forwarded to the Express error handler automatically.
 * Eliminates repetitive try/catch in every controller.
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
