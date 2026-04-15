import { Request, Response } from 'express';
import Member from '../models/Member.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

/**
 * GET /api/members
 * List all members.
 */
export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const members = await Member.find().sort({ createdAt: -1 });
  res.json({ success: true, data: members });
});

/**
 * GET /api/members/:id
 * Get a single member by ID.
 */
export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findById(req.params.id);
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, data: member });
});

/**
 * POST /api/members
 * Create a new member.
 */
export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const { name, phone, planType, startDate, endDate, whatsappOptIn } = req.body;

  const existing = await Member.findOne({ phone });
  if (existing) {
    res.status(400).json({ success: false, message: 'Phone number already registered', code: 'DUPLICATE' });
    return;
  }

  const member = await Member.create({
    name,
    phone,
    planType,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    whatsappOptIn: whatsappOptIn ?? true,
  });

  res.status(201).json({ success: true, data: member });
});

/**
 * PUT /api/members/:id
 * Update a member.
 */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  res.json({ success: true, data: member });
});

/**
 * DELETE /api/members/:id
 * Delete a member.
 */
export const deleteMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findByIdAndDelete(req.params.id);
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, message: 'Member deleted' });
});
