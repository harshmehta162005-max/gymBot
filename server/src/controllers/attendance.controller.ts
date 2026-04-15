import { Request, Response } from 'express';
import Attendance from '../models/Attendance.model.js';
import Member from '../models/Member.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * GET /api/attendance
 * List attendance records, optionally filtered by memberId or date range.
 */
export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { memberId, from, to } = req.query;
  const filter: any = {};

  if (memberId) filter.memberId = memberId;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }

  const records = await Attendance.find(filter)
    .populate('memberId', 'name phone')
    .sort({ date: -1 });

  res.json({ success: true, data: records });
});

/**
 * POST /api/attendance
 * Mark attendance manually (from dashboard).
 */
export const markAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { memberId, method } = req.body;

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  // Prevent duplicate attendance for same member on same day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await Attendance.findOne({
    memberId,
    date: { $gte: today, $lt: tomorrow },
  });

  if (existing) {
    res.status(400).json({ success: false, message: 'Attendance already marked today', code: 'DUPLICATE' });
    return;
  }

  const record = await Attendance.create({
    memberId,
    date: new Date(),
    method: method || 'whatsapp-reply',
  });

  res.status(201).json({ success: true, data: record });
});

/**
 * GET /api/attendance/scan
 * Mark attendance via QR code scan (public endpoint).
 */
export const scanAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { memberId } = req.query;

  if (!memberId) {
    res.status(400).json({ success: false, message: 'memberId is required', code: 'BAD_REQUEST' });
    return;
  }

  const member = await Member.findById(memberId as string);
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  // Same duplicate check
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existing = await Attendance.findOne({
    memberId,
    date: { $gte: today, $lt: tomorrow },
  });

  if (existing) {
    res.json({ success: true, message: `${member.name}, attendance already marked today!` });
    return;
  }

  await Attendance.create({
    memberId,
    date: new Date(),
    method: 'qr-scan',
  });

  res.json({ success: true, message: `✅ ${member.name}, attendance marked!` });
});
