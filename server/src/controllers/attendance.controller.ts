import { Request, Response } from 'express';
import Attendance from '../models/Attendance.model.js';
import Member from '../models/Member.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { todayIST, yesterdayIST } from '../utils/geo.js';
import { logActivity } from './activity.controller.js';

/**
 * GET /api/attendance
 * List attendance records, optionally filtered by memberId or date range.
 */
export const getAttendance = asyncHandler(async (req: Request, res: Response) => {
  const { memberId, from, to, status, method } = req.query;
  const filter: any = {};

  if (memberId) filter.memberId = memberId;
  if (status) filter.status = status;
  if (method) filter.method = method;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from as string);
    if (to) filter.date.$lte = new Date(to as string);
  }

  const records = await Attendance.find(filter)
    .populate('memberId', 'name phone currentStreak longestStreak')
    .sort({ date: -1 })
    .limit(200);

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
    status: 'success',
  });

  if (existing) {
    res.status(400).json({ success: false, message: 'Attendance already marked today', code: 'DUPLICATE' });
    return;
  }

  const record = await Attendance.create({
    memberId,
    date: new Date(),
    method: method || 'manual',
    status: 'success',
    lat: null,
    lon: null,
    distance_m: null,
  });

  // Update streak
  const todayStr = todayIST();
  const yesterdayStr = yesterdayIST();

  if (member.lastAttendanceDate !== todayStr) {
    if (member.lastAttendanceDate === yesterdayStr) {
      member.currentStreak = (member.currentStreak || 0) + 1;
    } else {
      member.currentStreak = 1;
    }
    if (member.currentStreak > (member.longestStreak || 0)) {
      member.longestStreak = member.currentStreak;
    }
    member.lastAttendanceDate = todayStr;
    await member.save();
  }

  await logActivity({
    memberId: member._id.toString(),
    memberName: member.name,
    action: 'note_added',
    note: `Manual attendance marked — Streak: ${member.currentStreak}`,
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
    status: 'success',
  });

  if (existing) {
    res.json({ success: true, message: `${member.name}, attendance already marked today! 🔥 Streak: ${member.currentStreak}` });
    return;
  }

  await Attendance.create({
    memberId,
    date: new Date(),
    method: 'qr-scan',
    status: 'success',
  });

  // Update streak
  const todayStr = todayIST();
  const yesterdayStr = yesterdayIST();

  if (member.lastAttendanceDate !== todayStr) {
    if (member.lastAttendanceDate === yesterdayStr) {
      member.currentStreak = (member.currentStreak || 0) + 1;
    } else {
      member.currentStreak = 1;
    }
    if (member.currentStreak > (member.longestStreak || 0)) {
      member.longestStreak = member.currentStreak;
    }
    member.lastAttendanceDate = todayStr;
    await member.save();
  }

  res.json({ success: true, message: `✅ ${member.name}, attendance marked! 🔥 Streak: ${member.currentStreak}` });
});

/**
 * GET /api/attendance/stats
 * Dashboard stats: today count, week count, top streaks, method breakdown.
 */
export const getAttendanceStats = asyncHandler(async (_req: Request, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayCount, weekCount, topStreaks, methodBreakdown] = await Promise.all([
    // Today's check-ins
    Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, status: 'success' }),
    // This week
    Attendance.countDocuments({ date: { $gte: weekAgo }, status: 'success' }),
    // Top 5 current streaks
    Member.find({ currentStreak: { $gt: 0 } })
      .sort({ currentStreak: -1 })
      .limit(5)
      .select('name currentStreak longestStreak'),
    // Method breakdown for today
    Attendance.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow }, status: 'success' } },
      { $group: { _id: '$method', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      todayCount,
      weekCount,
      topStreaks,
      methodBreakdown: methodBreakdown.reduce(
        (acc: Record<string, number>, item: any) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
  });
});
