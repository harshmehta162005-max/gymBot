import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

// Extend Express Request to carry owner payload
declare global {
  namespace Express {
    interface Request {
      owner?: {
        ownerId: string;
        gymName: string;
        email: string;
      };
    }
  }
}

/**
 * JWT auth middleware.
 * Verifies the token from the Authorization header.
 * Attaches decoded payload (ownerId, gymName, email) to req.owner.
 */
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'No token provided', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
      ownerId: string;
      gymName: string;
      email: string;
    };
    req.owner = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'UNAUTHORIZED' });
  }
};
