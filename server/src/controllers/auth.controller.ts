import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Owner from '../models/Owner.model.js';
import { ENV } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * POST /api/auth/register
 * Register a new gym owner. Now accepts gym location for attendance geofencing.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, gymName, phone, gymLat, gymLon, gymRadius, gymAddress } = req.body;

  const existing = await Owner.findOne({ email });
  if (existing) {
    res.status(400).json({ success: false, message: 'Email already registered', code: 'DUPLICATE' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await Owner.create({
    email,
    passwordHash,
    gymName,
    phone,
    gymLat: gymLat ?? null,
    gymLon: gymLon ?? null,
    gymRadius: gymRadius ?? 75,
    gymAddress: gymAddress || '',
  });

  const token = jwt.sign(
    { ownerId: owner._id, gymName: owner.gymName, email: owner.email },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    success: true,
    token,
    owner: {
      id: owner._id,
      email: owner.email,
      gymName: owner.gymName,
      gymLat: owner.gymLat,
      gymLon: owner.gymLon,
      gymRadius: owner.gymRadius,
      gymAddress: owner.gymAddress,
    },
  });
});

/**
 * POST /api/auth/login
 * Login and return JWT. Payload: { ownerId, gymName, email }.
 * Token expiry: 7 days. Never stores password in JWT.
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const owner = await Owner.findOne({ email });
  if (!owner) {
    res.status(401).json({ success: false, message: 'Invalid credentials', code: 'UNAUTHORIZED' });
    return;
  }

  const isMatch = await bcrypt.compare(password, owner.passwordHash);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Invalid credentials', code: 'UNAUTHORIZED' });
    return;
  }

  const token = jwt.sign(
    { ownerId: owner._id, gymName: owner.gymName, email: owner.email },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    owner: {
      id: owner._id,
      email: owner.email,
      gymName: owner.gymName,
      gymLat: owner.gymLat,
      gymLon: owner.gymLon,
      gymRadius: owner.gymRadius,
      gymAddress: owner.gymAddress,
    },
  });
});

/**
 * GET /api/owner/settings
 * Get owner settings — all configurable fields.
 */
export const getOwnerSettings = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner?.ownerId;
  const owner = await Owner.findById(ownerId).select('-passwordHash');
  if (!owner) {
    res.status(404).json({ success: false, message: 'Owner not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, data: owner });
});

/**
 * PUT /api/owner/settings
 * Update owner settings — accepts any Owner field except email/password.
 */
export const updateOwnerSettings = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner?.ownerId;

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    res.status(404).json({ success: false, message: 'Owner not found', code: 'NOT_FOUND' });
    return;
  }

  // Whitelist of updatable fields
  const allowedFields: (keyof typeof req.body)[] = [
    'gymName', 'phone', 'ownerName',
    'gymLat', 'gymLon', 'gymRadius', 'gymAddress',
    'businessShifts', 'businessDays',
    'defaultMonthlyFee', 'currency', 'gracePeriodDays',
    'reminderEnabled', 'defaultReminderDays', 'afterDueReminderDays', 'reminderTime', 'reminderLanguage',
    'attendanceMethods', 'duplicateWindowHours', 'streakMilestones',
    'welcomeMessage', 'autoReplyEnabled',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      (owner as any)[field] = req.body[field];
    }
  }

  // Clamp numeric fields
  if (owner.gymRadius) owner.gymRadius = Math.max(10, Math.min(500, owner.gymRadius));
  if (owner.gracePeriodDays !== undefined) owner.gracePeriodDays = Math.max(0, Math.min(30, owner.gracePeriodDays));
  if (owner.duplicateWindowHours !== undefined) owner.duplicateWindowHours = Math.max(1, Math.min(24, owner.duplicateWindowHours));

  await owner.save();

  // Also update localStorage-compatible response
  res.json({
    success: true,
    data: owner.toObject({ versionKey: false }),
    // Slim version for localStorage
    ownerSlim: {
      id: owner._id,
      email: owner.email,
      gymName: owner.gymName,
    },
  });
});

/**
 * PUT /api/owner/change-password
 * Change owner password. Requires current password for verification.
 */
export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner?.ownerId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Both current and new password are required', code: 'BAD_REQUEST' });
    return;
  }

  if (newPassword.length < 6) {
    res.status(400).json({ success: false, message: 'New password must be at least 6 characters', code: 'BAD_REQUEST' });
    return;
  }

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    res.status(404).json({ success: false, message: 'Owner not found', code: 'NOT_FOUND' });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, owner.passwordHash);
  if (!isMatch) {
    res.status(401).json({ success: false, message: 'Current password is incorrect', code: 'UNAUTHORIZED' });
    return;
  }

  owner.passwordHash = await bcrypt.hash(newPassword, 12);
  await owner.save();

  res.json({ success: true, message: 'Password changed successfully' });
});

