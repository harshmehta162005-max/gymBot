import { Request, Response, NextFunction } from 'express';
import { validateWebhookSignature } from '../services/whatsapp.service.js';
import { logger } from '../utils/logger.js';

/**
 * Validates X-Hub-Signature-256 on incoming webhook POSTs.
 * Must run BEFORE express.json() on the webhook route — uses raw body buffer.
 */
export const webhookValidator = (req: Request, res: Response, next: NextFunction): void => {
  // Skip validation for GET (webhook verification challenge)
  if (req.method === 'GET') {
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string;

  if (!signature) {
    logger.warn('Webhook request missing X-Hub-Signature-256 header');
    res.status(401).json({ success: false, message: 'Missing signature', code: 'UNAUTHORIZED' });
    return;
  }

  // req.body should be a raw Buffer at this point (from express.raw())
  const rawBody = (req as any).rawBody as Buffer;

  if (!rawBody) {
    logger.error('Raw body buffer not available — check middleware order');
    res.status(500).json({ success: false, message: 'Server config error', code: 'INTERNAL' });
    return;
  }

  if (!validateWebhookSignature(rawBody, signature)) {
    logger.warn('Webhook signature validation failed');
    res.status(401).json({ success: false, message: 'Invalid signature', code: 'UNAUTHORIZED' });
    return;
  }

  next();
};
