import { Request, Response } from 'express';
import { ENV } from '../config/env.js';
import { extractMessages, sendTextMessage, sendButtonMessage } from '../services/whatsapp.service.js';
import Member from '../models/Member.model.js';
import Attendance from '../models/Attendance.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logger } from '../utils/logger.js';

// Track processed message IDs to prevent duplicates (per skill spec)
const processedMessageIds = new Set<string>();

/**
 * GET /webhook
 * WhatsApp webhook verification — respond 200 with hub.challenge immediately.
 */
export const verifyWebhook = (req: Request, res: Response): void => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === ENV.WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

/**
 * POST /webhook
 * Handle incoming WhatsApp messages. Processes text and button_reply types.
 */
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  // Always respond 200 quickly to Meta
  res.sendStatus(200);

  const messages = extractMessages(req.body);

  for (const msg of messages) {
    // Prevent duplicate processing (per skill spec)
    if (processedMessageIds.has(msg.id)) continue;
    processedMessageIds.add(msg.id);

    // Clean up old IDs periodically (keep last 1000)
    if (processedMessageIds.size > 1000) {
      const ids = Array.from(processedMessageIds);
      ids.slice(0, 500).forEach((id) => processedMessageIds.delete(id));
    }

    const from = msg.from; // phone number
    let text = '';

    if (msg.type === 'text') {
      text = msg.text.body.trim().toLowerCase();
    } else if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
      text = msg.interactive.button_reply.id.toLowerCase();
    } else {
      continue;
    }

    try {
      await handleCommand(from, text);
    } catch (err) {
      logger.error(`Error handling command "${text}" from ${from}`, err);
    }
  }
});

/**
 * Route text commands to the correct handler.
 */
async function handleCommand(phone: string, text: string): Promise<void> {
  const member = await Member.findOne({ phone });

  switch (true) {
    case text === 'hi' || text === 'hello' || text === 'menu':
      await sendButtonMessage(phone, '👋 Welcome to GymWaBot! What would you like to do?', [
        { id: 'attendance', title: '✅ Mark Attendance' },
        { id: 'pay', title: '💰 Pay Dues' },
        { id: 'status', title: '📊 My Status' },
      ]);
      break;

    case text === 'attendance':
      if (!member) {
        await sendTextMessage(phone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      // Check if already marked today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const existing = await Attendance.findOne({
        memberId: member._id,
        date: { $gte: today, $lt: tomorrow },
      });

      if (existing) {
        await sendTextMessage(phone, '✅ Already marked today! See you tomorrow 💪');
      } else {
        await Attendance.create({ memberId: member._id, date: new Date(), method: 'whatsapp-reply' });
        await sendTextMessage(phone, '✅ Attendance marked! Keep grinding 💪');
      }
      break;

    case text === 'pay':
      if (!member) {
        await sendTextMessage(phone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      // Payment link creation is triggered from the dashboard (owner action)
      await sendTextMessage(phone, '💰 Please ask your gym owner to generate a payment link for you, or check if you already have one!');
      break;

    case text === 'status':
      if (!member) {
        await sendTextMessage(phone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      const daysLeft = Math.ceil(
        (member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      const statusMsg = daysLeft > 0
        ? `📊 *${member.name}*\nPlan: ${member.planType}\nStatus: ${member.status}\nExpires in: ${daysLeft} days`
        : `📊 *${member.name}*\nPlan: ${member.planType}\nStatus: ❌ EXPIRED\nPlease renew your plan!`;
      await sendTextMessage(phone, statusMsg);
      break;

    default:
      await sendTextMessage(phone, '🤔 I didn\'t understand that. Send "hi" to see the menu!');
  }
}
