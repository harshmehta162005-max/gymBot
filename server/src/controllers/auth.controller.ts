import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Owner from '../models/Owner.model.js';
import { ENV } from '../config/env.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * POST /api/auth/register
 * Register a new gym owner.
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, gymName, phone } = req.body;

  const existing = await Owner.findOne({ email });
  if (existing) {
    res.status(400).json({ success: false, message: 'Email already registered', code: 'DUPLICATE' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const owner = await Owner.create({ email, passwordHash, gymName, phone });

  const token = jwt.sign(
    { ownerId: owner._id, gymName: owner.gymName, email: owner.email },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ success: true, token, owner: { id: owner._id, email: owner.email, gymName: owner.gymName } });
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

  res.json({ success: true, token, owner: { id: owner._id, email: owner.email, gymName: owner.gymName } });
});
