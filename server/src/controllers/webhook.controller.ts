import { Request, Response } from 'express';
import { ENV } from '../config/env.js';
import { extractMessages, sendTextMessage, sendButtonMessage, sendLocationRequest } from '../services/whatsapp.service.js';
import Member from '../models/Member.model.js';
import Owner from '../models/Owner.model.js';
import Attendance from '../models/Attendance.model.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { haversine, todayIST, yesterdayIST } from '../utils/geo.js';
import { logActivity } from '../controllers/activity.controller.js';

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
 * Update member streak after marking attendance.
 */
async function updateStreak(member: any): Promise<void> {
  const today = todayIST();
  const yesterday = yesterdayIST();

  if (member.lastAttendanceDate === today) {
    // Already marked today — no streak change
    return;
  }

  if (member.lastAttendanceDate === yesterday) {
    // Consecutive day — increment streak
    member.currentStreak = (member.currentStreak || 0) + 1;
  } else {
    // Streak broken — reset to 1
    member.currentStreak = 1;
  }

  if (member.currentStreak > (member.longestStreak || 0)) {
    member.longestStreak = member.currentStreak;
  }

  member.lastAttendanceDate = today;
  await member.save();
}

/**
 * Get the gym owner's location config. Caches for the session.
 */
async function getGymLocation(): Promise<{
  lat: number;
  lon: number;
  radius: number;
  gymName: string;
} | null> {
  // Get the first owner (single-tenant)
  const owner = await Owner.findOne();
  if (!owner || owner.gymLat === null || owner.gymLon === null) {
    return null;
  }
  return {
    lat: owner.gymLat,
    lon: owner.gymLon,
    radius: owner.gymRadius || 75,
    gymName: owner.gymName,
  };
}

/**
 * POST /webhook
 * Handle incoming WhatsApp messages. Processes text, button_reply, and location types.
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

    const from = msg.from; // phone number (with country code, e.g. "918810592825")
    // Normalize phone: strip leading "91" for DB lookup since members stored without prefix
    const normalizedPhone = from.startsWith('91') ? from.substring(2) : from;

    try {
      // === LOCATION MESSAGE — Attendance via geofence ===
      if (msg.type === 'location') {
        await handleLocationAttendance(from, normalizedPhone, msg.location);
        continue;
      }

      // === TEXT or BUTTON REPLY ===
      let text = '';
      if (msg.type === 'text') {
        text = msg.text.body.trim().toLowerCase();
      } else if (msg.type === 'interactive' && msg.interactive?.type === 'button_reply') {
        text = msg.interactive.button_reply.id.toLowerCase();
      } else {
        continue;
      }

      await handleCommand(from, normalizedPhone, text);
    } catch (err) {
      logger.error(`Error handling message from ${from}`, err);
    }
  }
});

/**
 * Handle incoming location message — check distance, mark attendance, update streak.
 */
async function handleLocationAttendance(
  whatsappPhone: string,
  normalizedPhone: string,
  location: { latitude: number; longitude: number }
): Promise<void> {
  const member = await Member.findOne({ phone: normalizedPhone });
  if (!member) {
    await sendTextMessage(whatsappPhone, '❌ You are not registered. Please contact the gym owner.');
    return;
  }

  const gymLocation = await getGymLocation();
  if (!gymLocation) {
    await sendTextMessage(
      whatsappPhone,
      '⚠️ Gym location not configured yet. Please ask your gym owner to set it up.'
    );
    return;
  }

  const lat = location.latitude;
  const lon = location.longitude;
  const distance = haversine(lat, lon, gymLocation.lat, gymLocation.lon);
  const distanceRounded = Math.round(distance);
  const isInside = distance <= gymLocation.radius;

  // Check duplicate today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingSuccess = await Attendance.findOne({
    memberId: member._id,
    date: { $gte: today, $lt: tomorrow },
    status: 'success',
  });

  if (existingSuccess) {
    const streakEmoji = member.currentStreak >= 7 ? '🔥🔥' : member.currentStreak >= 3 ? '🔥' : '💪';
    await sendTextMessage(
      whatsappPhone,
      [
        `✅ *Already Marked Today!*`,
        ``,
        `You've already checked in today.`,
        `${streakEmoji} *Streak:* ${member.currentStreak} day(s)`,
        `🏆 *Best:* ${member.longestStreak} day(s)`,
        ``,
        `See you tomorrow! 💪`,
      ].join('\n')
    );
    return;
  }

  // Create attendance record
  await Attendance.create({
    memberId: member._id,
    date: new Date(),
    method: 'whatsapp-location',
    lat,
    lon,
    distance_m: distanceRounded,
    status: isInside ? 'success' : 'outside',
  });

  if (isInside) {
    // Update streak
    await updateStreak(member);

    const streakEmoji = member.currentStreak >= 7 ? '🔥🔥' : member.currentStreak >= 3 ? '🔥' : '💪';
    const milestoneMsg =
      member.currentStreak === 7
        ? `\n🎉 *1 Week Streak!* You're on fire!`
        : member.currentStreak === 30
          ? `\n🏆 *30 Day Streak!* Incredible dedication!`
          : member.currentStreak === 100
            ? `\n👑 *100 Day Streak!* Legendary!`
            : '';

    await sendTextMessage(
      whatsappPhone,
      [
        `✅ *Attendance Marked!*`,
        ``,
        `Welcome to *${gymLocation.gymName}* 🏋️`,
        ``,
        `📍 *Distance:* ${distanceRounded}m from gym`,
        `${streakEmoji} *Streak:* ${member.currentStreak} day(s)`,
        `🏆 *Best:* ${member.longestStreak} day(s)`,
        milestoneMsg,
        ``,
        `Keep pushing! 💪`,
      ]
        .filter(Boolean)
        .join('\n')
    );

    await logActivity({
      memberId: member._id.toString(),
      memberName: member.name,
      action: 'note_added',
      note: `Attendance via location (${distanceRounded}m) — Streak: ${member.currentStreak}`,
    });
  } else {
    await sendTextMessage(
      whatsappPhone,
      [
        `❌ *Too Far From Gym*`,
        ``,
        `You are *${distanceRounded}m* away from ${gymLocation.gymName}.`,
        `Allowed radius: ${gymLocation.radius}m`,
        ``,
        `Please come inside the gym and try again! 🏋️`,
      ].join('\n')
    );
  }
}

/**
 * Route text commands to the correct handler.
 */
async function handleCommand(whatsappPhone: string, normalizedPhone: string, text: string): Promise<void> {
  const member = await Member.findOne({ phone: normalizedPhone });

  // Attendance keywords → send location request
  const attendanceKeywords = ['attendance', 'check in', 'checkin', 'mark attendance', 'present', "i'm here", 'hajri', 'haazri'];
  if (attendanceKeywords.some((kw) => text.includes(kw))) {
    if (!member) {
      await sendTextMessage(whatsappPhone, '❌ You are not registered. Please contact the gym owner.');
      return;
    }
    await sendLocationRequest(whatsappPhone);
    return;
  }

  switch (true) {
    case text === 'hi' || text === 'hello' || text === 'menu': {
      const owner = await Owner.findOne();
      const gName = owner?.gymName || 'GymWaBot';

      // If owner has a custom welcome message, send that first
      if (owner?.welcomeMessage) {
        const customMsg = owner.welcomeMessage
          .replace(/\{gymName\}/g, gName)
          .replace(/\{memberName\}/g, member?.name || 'there');
        await sendTextMessage(whatsappPhone, customMsg);
      }

      await sendButtonMessage(whatsappPhone, `👋 Welcome to *${gName}*! What would you like to do?`, [
        { id: 'attendance', title: '✅ Mark Attendance' },
        { id: 'pay', title: '💰 Pay Dues' },
        { id: 'status', title: '📊 My Status' },
      ]);
      break;
    }

    case text === 'streak':
      if (!member) {
        await sendTextMessage(whatsappPhone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      const streakEmoji = member.currentStreak >= 7 ? '🔥🔥' : member.currentStreak >= 3 ? '🔥' : '💪';
      await sendTextMessage(
        whatsappPhone,
        [
          `${streakEmoji} *Your Attendance Streak*`,
          ``,
          `📅 *Current Streak:* ${member.currentStreak} day(s)`,
          `🏆 *Longest Streak:* ${member.longestStreak} day(s)`,
          `📍 *Last Check-in:* ${member.lastAttendanceDate || 'Never'}`,
          ``,
          `Keep it up! 💪`,
        ].join('\n')
      );
      break;

    case text === 'pay':
      if (!member) {
        await sendTextMessage(whatsappPhone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      if (member.outstandingBalance > 0) {
        await sendTextMessage(
          whatsappPhone,
          `💰 You have ₹${member.outstandingBalance} pending.\nPlease ask your gym owner to generate a payment link, or pay directly at the gym.`
        );
      } else {
        await sendTextMessage(whatsappPhone, '✅ No pending dues! Your payments are up to date.');
      }
      break;

    case text === 'status': {
      if (!member) {
        await sendTextMessage(whatsappPhone, '❌ You are not registered. Please contact the gym owner.');
        return;
      }
      const daysLeft = Math.ceil((member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const endDateStr = member.endDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const statusIcon = daysLeft > 0 ? '🟢' : '🔴';
      const streakIcon = member.currentStreak >= 3 ? '🔥' : '💪';

      await sendTextMessage(
        whatsappPhone,
        [
          `📊 *${member.name} — Status*`,
          ``,
          `${statusIcon} *Status:* ${daysLeft > 0 ? 'Active' : 'Expired'}`,
          `📋 *Plan:* ${member.planType}`,
          `📆 *Valid Till:* ${endDateStr}${daysLeft > 0 ? ` (${daysLeft} days left)` : ''}`,
          member.outstandingBalance > 0 ? `💰 *Dues:* ₹${member.outstandingBalance}` : `💰 *Dues:* None ✅`,
          `${streakIcon} *Streak:* ${member.currentStreak} day(s) (Best: ${member.longestStreak})`,
        ].join('\n')
      );
      break;
    }

    default: {
      // Respect autoReply setting
      const ownerCfg = await Owner.findOne();
      if (ownerCfg?.autoReplyEnabled === false) break; // silent skip
      await sendTextMessage(
        whatsappPhone,
        '🤔 I didn\'t understand that. Send *"hi"* for the menu, or *"attendance"* to check in!'
      );
    }
  }
}
