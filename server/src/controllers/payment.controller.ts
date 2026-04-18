import { Request, Response } from 'express';
import Payment from '../models/Payment.model.js';
import Member from '../models/Member.model.js';
import { createPaymentLink, verifyPaymentSignature } from '../services/razorpay.service.js';
import { sendTextMessage } from '../services/whatsapp.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { ENV } from '../config/env.js';

/**
 * GET /api/payments
 * List all payments, populated with member name.
 */
export const getPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await Payment.find().populate('memberId', 'name phone').sort({ createdAt: -1 });
  res.json({ success: true, data: payments });
});

/**
 * POST /api/payments
 * Create a Razorpay UPI payment link for a member and store it.
 */
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const { memberId, amount, description } = req.body;

  const member = await Member.findById(memberId);
  if (!member) {
    res.status(404).json({ success: false, message: 'Member not found', code: 'NOT_FOUND' });
    return;
  }

  // expire_by = member endDate + 3 days (per skill spec)
  const expireByDate = new Date(member.endDate);
  expireByDate.setDate(expireByDate.getDate() + 3);

  const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/callback`;

  const { razorpayLinkId, razorpayLinkUrl } = await createPaymentLink({
    amount,
    memberName: member.name,
    memberPhone: member.phone,
    description: description || `Gym plan renewal for ${member.name}`,
    callbackUrl,
    expireByDate,
    referenceId: `${memberId}_${Date.now()}`,
  });

  const payment = await Payment.create({
    memberId,
    amount,
    razorpayLinkId,
    razorpayLinkUrl,
    status: 'pending',
  });

  // Send UPI link via WhatsApp
  try {
    await sendTextMessage(
      member.phone,
      `Hi ${member.name}! Your gym payment of ₹${amount} is due.\nPay here: ${razorpayLinkUrl}`
    );
  } catch (err) {
    // Don't fail the whole request if WhatsApp fails
    logger.error(`[Payment] WhatsApp send failed for ${member.phone}: ${err}`);
  }

  res.status(201).json({ success: true, data: payment });
});

/**
 * GET /api/payments/callback
 * Razorpay calls this after successful payment.
 * Verifies signature, updates Payment to 'paid', extends Member endDate.
 */
export const paymentCallback = asyncHandler(async (req: Request, res: Response) => {
  const {
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_payment_id,
    razorpay_signature,
  } = req.query as Record<string, string>;

  const isValid = verifyPaymentSignature({
    razorpay_payment_link_id,
    razorpay_payment_link_reference_id,
    razorpay_payment_link_status,
    razorpay_payment_id,
    razorpay_signature,
  });

  if (!isValid) {
    logger.warn('Invalid Razorpay callback signature');
    res.status(400).json({ success: false, message: 'Invalid signature', code: 'BAD_REQUEST' });
    return;
  }

  // Update payment status (idempotent — only update if not already paid)
  const payment = await Payment.findOneAndUpdate(
    { razorpayLinkId: razorpay_payment_link_id, status: { $ne: 'paid' } },
    { status: 'paid', paidAt: new Date() },
    { new: true }
  );

  if (payment) {
    // Extend member plan by 30 days from today
    const member = await Member.findById(payment.memberId);
    if (member) {
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 30);
      member.endDate = newEnd;
      member.status = 'active';
      await member.save();

      if (member.whatsappOptIn) {
        await sendTextMessage(member.phone, `✅ Payment received! Your plan is now active until ${newEnd.toLocaleDateString('en-IN')}.`);
      }
    }
  }

  res.json({ success: true, message: 'Payment confirmed' });
});

/**
 * POST /api/payments/:id/resend
 * Resend existing payment link via WhatsApp.
 */
export const resendPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id).populate('memberId');
  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found', code: 'NOT_FOUND' });
    return;
  }
  if (payment.status !== 'pending') {
    res.status(400).json({ success: false, message: 'Can only resend pending payments', code: 'BAD_REQUEST' });
    return;
  }
  const member = payment.memberId as any;
  if (!member || !payment.razorpayLinkUrl) {
    res.status(400).json({ success: false, message: 'Member or link not found', code: 'BAD_REQUEST' });
    return;
  }

  try {
    await sendTextMessage(
      member.phone,
      `Hi ${member.name}! Reminder — your gym payment of ₹${payment.amount} is pending.\nPay here: ${payment.razorpayLinkUrl}`
    );
  } catch (err) {
    logger.error(`[Payment] Resend WhatsApp failed for ${member.phone}: ${err}`);
  }

  res.json({ success: true, message: 'Payment link resent' });
});

/**
 * PUT /api/payments/:id/cancel
 * Cancel a pending payment link.
 */
export const cancelPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found', code: 'NOT_FOUND' });
    return;
  }
  if (payment.status === 'paid') {
    res.status(400).json({ success: false, message: 'Cannot cancel a paid payment', code: 'BAD_REQUEST' });
    return;
  }

  payment.status = 'expired';
  await payment.save();

  res.json({ success: true, data: payment });
});

/**
 * DELETE /api/payments/:id
 * Delete a payment record.
 */
export const deletePayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) {
    res.status(404).json({ success: false, message: 'Payment not found', code: 'NOT_FOUND' });
    return;
  }
  res.json({ success: true, message: 'Payment deleted' });
});
