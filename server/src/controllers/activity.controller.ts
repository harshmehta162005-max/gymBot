import { Request, Response } from 'express';
import ActivityLog from '../models/ActivityLog.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * GET /api/activity
 * List activity logs with search, filter, date range, and pagination.
 * Query: ?search=harsh&action=payment_received&range=7d&page=1&limit=30
 */
export const getActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner!.ownerId;
  const {
    search,
    action,
    range,
    page = '1',
    limit = '30',
  } = req.query as Record<string, string>;

  const filter: any = { ownerId };

  // Search by member name
  if (search) {
    filter.memberName = { $regex: search, $options: 'i' };
  }

  // Filter by action type
  if (action) {
    filter.action = action;
  }

  // Date range filter
  if (range) {
    const now = new Date();
    let from: Date | null = null;
    switch (range) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
    }
    if (from) {
      filter.createdAt = { $gte: from };
    }
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * DELETE /api/activity
 * Clear all activity logs.
 */
export const clearActivityLogs = asyncHandler(async (req: Request, res: Response) => {
  const result = await ActivityLog.deleteMany({ ownerId: req.owner!.ownerId });
  res.json({ success: true, message: `${result.deletedCount} activity log(s) cleared` });
});

/**
 * Helper: Log an activity. Called from other controllers.
 */
export async function logActivity(data: {
  ownerId: string;
  memberId?: string | null;
  memberName: string;
  action: string;
  amount?: number;
  note?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await ActivityLog.create({
      ownerId: data.ownerId,
      memberId: data.memberId || null,
      memberName: data.memberName,
      action: data.action,
      amount: data.amount,
      note: data.note || '',
      metadata: data.metadata || {},
    });
  } catch {
    // Never let activity logging crash the main flow
  }
}
