import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Member from '../models/Member.model.js';
import Payment from '../models/Payment.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { sendTextMessage } from '../services/whatsapp.service.js';
import { logActivity } from './activity.controller.js';

// Default global reminder days (used when member has no custom pattern)
export const DEFAULT_REMINDER_DAYS = [1, 3, 7];

/**
 * GET /api/members
 * List all members with filters, search, sort, and pagination.
 * Query params: ?status=active&payment=overdue&muted=true&search=rahul&sort=endDate&order=asc&page=1&limit=20
 */
export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner!.ownerId;
  const {
    status,
    payment,
    muted,
    search,
    sort = 'createdAt',
    order = 'desc',
    page = '1',
    limit = '20',
  } = req.query as Record<string, string>;

  const filter: any = { ownerId };
  const andConditions: any[] = [];

  // Status filter
  if (status && ['active', 'frozen', 'expired'].includes(status)) {
    filter.status = status;
  }

  // Payment status filter
  if (payment === 'overdue') {
    filter.outstandingBalance = { $gt: 0 };
    filter.endDate = { $lt: new Date() };
  } else if (payment === 'partial') {
    filter.outstandingBalance = { $gt: 0 };
  } else if (payment === 'full') {
    filter.outstandingBalance = 0;
  }

  // Muted filter (uses $and to avoid $or overwrite)
  if (muted === 'true') {
    filter.mutedUntil = { $gt: new Date() };
  } else if (muted === 'false') {
    andConditions.push({ $or: [{ mutedUntil: null }, { mutedUntil: { $lte: new Date() } }] });
  }

  // Search (name or phone) — uses $and to avoid $or overwrite
  if (search) {
    const searchRegex = new RegExp(search, 'i');
    andConditions.push({ $or: [{ name: searchRegex }, { phone: searchRegex }] });
  }

  if (andConditions.length > 0) {
    filter.$and = andConditions;
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;
  const sortOrder = order === 'asc' ? 1 : -1;

  const [members, total] = await Promise.all([
    Member.find(filter)
      .sort({ [sort]: sortOrder })
      .skip(skip)
      .limit(limitNum),
    Member.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: members,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/members/:id
 * Get a single member by ID.
 */
export const getMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await Member.findOne({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, data: member });
});

/**
 * POST /api/members
 * Create a new member (with monthlyAmount, optional notes).
 */
export const createMember = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner!.ownerId;
  const { name, phone, planType, monthlyAmount, startDate, endDate, whatsappOptIn, note, outstandingBalance } = req.body;

  if (!monthlyAmount || monthlyAmount <= 0) {
    res.status(400).json({ success: false, message: 'Monthly amount is required and must be > 0', code: 'VALIDATION' });
    return;
  }

  const existing = await Member.findOne({ phone, ownerId });
  if (existing) {
    res.status(400).json({ success: false, message: 'Phone number already registered', code: 'DUPLICATE' });
    return;
  }

  // 1 week trial — mute reminders for the first week
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);

  const member = await Member.create({
    ownerId,
    name,
    phone,
    planType,
    monthlyAmount,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    whatsappOptIn: whatsappOptIn ?? true,
    outstandingBalance: outstandingBalance ?? 0,
    mutedUntil: trialEnd,
    notes: note ? [{ text: note, context: 'registration' }] : [],
  });

  await logActivity({ ownerId, memberId: member._id.toString(), memberName: name, action: 'member_added', amount: outstandingBalance ?? 0, note: note || `Plan: ${planType}, ₹${monthlyAmount}/mo` });

  res.status(201).json({ success: true, data: member });
});

/**
 * PUT /api/members/:id
 * Update a member. Supports all fields including endDate, monthlyAmount, customReminderDays.
 */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  // Don't allow direct manipulation of notes via generic update — use dedicated endpoint
  const { notes, ...updateData } = req.body;

  const member = await Member.findOneAndUpdate({ _id: req.params.id, ownerId: req.owner!.ownerId }, updateData, {
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
  const member = await Member.findOneAndDelete({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }
  await logActivity({ ownerId: req.owner!.ownerId, memberId: null, memberName: member.name, action: 'member_deleted', note: `Phone: ${member.phone}` });
  res.json({ success: true, message: 'Member deleted' });
});

/**
 * PUT /api/members/:id/mute
 * Mute a member's WhatsApp reminders until a specific date (or indefinitely).
 * Body: { mutedUntil: "2026-05-01" | null, note?: "Going on vacation" }
 */
export const muteMember = asyncHandler(async (req: Request, res: Response) => {
  const { mutedUntil, note } = req.body;

  const member = await Member.findOne({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  member.mutedUntil = mutedUntil ? new Date(mutedUntil) : null;

  // Add a note about the mute action
  const muteText = mutedUntil
    ? `Muted until ${new Date(mutedUntil).toLocaleDateString('en-IN')}`
    : 'Unmuted — reminders resumed';
  member.notes.push({
    text: note ? `${muteText}. Note: ${note}` : muteText,
    createdAt: new Date(),
    context: 'mute',
  });

  await member.save();

  await logActivity({ ownerId: req.owner!.ownerId, memberId: member._id.toString(), memberName: member.name, action: 'mute_changed', note: muteText });

  res.json({ success: true, data: member });
});

/**
 * POST /api/members/:id/partial-payment
 * Record a manual partial or full payment (cash / UPI done outside Razorpay).
 * Body: { amount: 500, note?: "Paid cash" }
 */
export const recordPartialPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, note } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, message: 'Amount must be > 0', code: 'VALIDATION' });
    return;
  }

  const member = await Member.findOne({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  // outstandingBalance already includes all dues (set at creation or carried over)
  const totalDue = member.outstandingBalance;
  const isFullPayment = totalDue <= 0 || amount >= totalDue;

  // Create payment record
  await Payment.create({
    memberId: member._id,
    amount,
    status: 'paid',
    paidAt: new Date(),
    paymentType: isFullPayment ? 'full' : 'partial',
    note: note || '',
  });

  if (isFullPayment) {
    // Clear outstanding balance, extend plan
    member.outstandingBalance = 0;
    const newEnd = new Date();
    newEnd.setDate(newEnd.getDate() + 30);
    member.endDate = newEnd;
    member.status = 'active';
  } else {
    // Partial: reduce outstanding, track remaining
    const remaining = totalDue - amount;
    member.outstandingBalance = remaining;
    member.lastPartialPaymentDate = new Date();
  }

  // Add note
  member.notes.push({
    text: `₹${amount} received (${isFullPayment ? 'Full' : 'Partial'}). ${note || ''}`.trim(),
    createdAt: new Date(),
    context: 'payment',
  });

  await member.save();

  const logNote = isFullPayment
    ? `Full payment — balance cleared. ${note || ''}`.trim()
    : `Partial payment — ₹${member.outstandingBalance} remaining. ${note || ''}`.trim();

  await logActivity({ ownerId: req.owner!.ownerId, memberId: member._id.toString(), memberName: member.name, action: 'payment_received', amount, note: logNote });

  // Send WhatsApp receipt
  try {
    const paidDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueDate = member.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    let receiptMsg: string;
    if (isFullPayment) {
      receiptMsg = [
        `✅ *Payment Received*`,
        ``,
        `Hi ${member.name},`,
        `Your payment has been received successfully.`,
        ``,
        `💰 *Amount Paid:* ₹${amount}`,
        `📅 *Paid On:* ${paidDate}`,
        `📆 *Plan Valid Till:* ${dueDate}`,
        `🏋️ *Status:* Active — All Clear`,
        ``,
        `Thank you for the payment! 💪`,
      ].join('\n');
    } else {
      receiptMsg = [
        `💰 *Partial Payment Received*`,
        ``,
        `Hi ${member.name},`,
        `We've received a partial payment from you.`,
        ``,
        `💰 *Amount Paid:* ₹${amount}`,
        `📅 *Paid On:* ${paidDate}`,
        `⚠️ *Pending Balance:* ₹${member.outstandingBalance}`,
        `📆 *Next Due Date:* ${dueDate}`,
        ``,
        `Please clear the remaining balance of ₹${member.outstandingBalance} at the earliest. 🙏`,
      ].join('\n');
    }
    await sendTextMessage(member.phone, receiptMsg);
  } catch {
    // WhatsApp failure is non-blocking
  }

  res.json({ success: true, data: member });
});

/**
 * POST /api/members/:id/notes
 * Add a timestamped note to a member.
 * Body: { text: "Called him, will pay tomorrow", context?: "manual" }
 */
export const addNote = asyncHandler(async (req: Request, res: Response) => {
  const { text, context } = req.body;

  if (!text || !text.trim()) {
    res.status(400).json({ success: false, message: 'Note text is required', code: 'VALIDATION' });
    return;
  }

  const member = await Member.findOne({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  member.notes.push({
    text: text.trim(),
    createdAt: new Date(),
    context: context || 'manual',
  });

  await member.save();

  await logActivity({ ownerId: req.owner!.ownerId, memberId: member._id.toString(), memberName: member.name, action: 'note_added', note: text.trim() });

  res.json({ success: true, data: member });
});

/**
 * PUT /api/members/:id/due-date
 * Edit the member's next due date. Recalculates status automatically.
 * Body: { endDate: "2026-06-15", note?: "Extended 1 week" }
 */
export const updateDueDate = asyncHandler(async (req: Request, res: Response) => {
  const { endDate, note } = req.body;

  if (!endDate) {
    res.status(400).json({ success: false, message: 'endDate is required', code: 'VALIDATION' });
    return;
  }

  const member = await Member.findOne({ _id: req.params.id, ownerId: req.owner!.ownerId });
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  const oldDate = member.endDate.toLocaleDateString('en-IN');
  member.endDate = new Date(endDate);

  member.notes.push({
    text: `Due date changed from ${oldDate} to ${new Date(endDate).toLocaleDateString('en-IN')}. ${note || ''}`.trim(),
    createdAt: new Date(),
    context: 'due-date',
  });

  await member.save(); // pre-save hook will recalculate status

  await logActivity({ ownerId: req.owner!.ownerId, memberId: member._id.toString(), memberName: member.name, action: 'due_date_changed', note: `${oldDate} → ${new Date(endDate).toLocaleDateString('en-IN')}. ${note || ''}`.trim() });

  res.json({ success: true, data: member });
});

/**
 * GET /api/members/stats
 * Dashboard-ready aggregate stats.
 */
export const getMemberStats = asyncHandler(async (req: Request, res: Response) => {
  const ownerId = req.owner!.ownerId;
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [total, active, dueThisWeek, withBalance, totalOutstanding] = await Promise.all([
    Member.countDocuments({ ownerId }),
    Member.countDocuments({ ownerId, status: 'active' }),
    Member.countDocuments({ ownerId, endDate: { $gte: now, $lte: weekFromNow }, status: 'active' }),
    Member.countDocuments({ ownerId, outstandingBalance: { $gt: 0 } }),
    Member.aggregate([{ $match: { ownerId: new mongoose.Types.ObjectId(ownerId) } }, { $group: { _id: null, total: { $sum: '$outstandingBalance' } } }]),
  ]);

  res.json({
    success: true,
    data: {
      total,
      active,
      dueThisWeek,
      withBalance,
      totalOutstanding: totalOutstanding[0]?.total || 0,
    },
  });
});
