import cron from 'node-cron';
import Member from '../models/Member.model.js';
import { createPaymentLink } from './razorpay.service.js';
import { generateReminder } from './gemini.service.js';
import { sendTextMessage } from './whatsapp.service.js';
import { logger } from '../utils/logger.js';
import { ENV } from '../config/env.js';
import { DEFAULT_REMINDER_DAYS } from '../controllers/member.controller.js';

/**
 * Process a batch of members — generate reminder via Gemini & send via WhatsApp.
 * Now uses per-member monthlyAmount and includes outstandingBalance in the message.
 */
async function processBatch(members: any[], gymName: string): Promise<void> {
  for (const member of members) {
    const daysLeft = Math.ceil(
      (member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    try {
      // Calculate total due: current month + any outstanding balance
      const currentDue = member.monthlyAmount;
      const totalDue = currentDue + (member.outstandingBalance || 0);

      // Generate Razorpay payment link with TOTAL due (current + outstanding)
      const expireByDate = new Date(member.endDate);
      expireByDate.setDate(expireByDate.getDate() + 3);

      const callbackUrl = `${ENV.APP_URL}/api/payments/callback`;

      const { razorpayLinkUrl } = await createPaymentLink({
        amount: totalDue,
        memberName: member.name,
        memberPhone: member.phone,
        description: `Gym plan renewal for ${member.name}${member.outstandingBalance > 0 ? ' (includes ₹' + member.outstandingBalance + ' previous dues)' : ''}`,
        callbackUrl,
        expireByDate,
        referenceId: `${member._id.toString()}_${Date.now()}`,
      });

      // Generate polite reminder via Gemini — now includes outstanding balance context
      const message = await generateReminder({
        memberName: member.name,
        gymName,
        daysRemaining: daysLeft,
        planAmount: totalDue,
        paymentLink: razorpayLinkUrl,
        language: 'hinglish', // default for Delhi/NCR
        outstandingBalance: member.outstandingBalance || 0,
      });

      // Send via WhatsApp
      await sendTextMessage(member.phone, message);
      logger.info(`Reminder sent to ${member.name} (${member.phone}) — ${daysLeft} days left, total due ₹${totalDue}`);
    } catch (error) {
      logger.error(`Failed to send reminder to ${member.name} (${member.phone})`, error);

      // Retry once after 5 minutes (per skill spec — use setTimeout, not new cron)
      setTimeout(async () => {
        try {
          const totalDue = member.monthlyAmount + (member.outstandingBalance || 0);
          const fallbackMsg = `Hi ${member.name}, your gym plan expires in ${daysLeft} day(s). Total due: ₹${totalDue}. Please visit the gym to renew.`;
          await sendTextMessage(member.phone, fallbackMsg);
          logger.info(`Retry reminder sent to ${member.name} (${member.phone})`);
        } catch (retryErr) {
          logger.error(`Retry also failed for ${member.name} (${member.phone})`, retryErr);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
  }
}

/**
 * Run the reminder job.
 * Enhanced: respects mutedUntil + customReminderDays per member + outstanding balance.
 */
export async function runReminderJob(): Promise<void> {
  logger.info('Reminder job started');

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Step 1: Find all active members who are NOT muted and have opted in
  const eligibleMembers = await Member.find({
    status: 'active',
    whatsappOptIn: true,
    $or: [
      { mutedUntil: null },
      { mutedUntil: { $lte: new Date() } }, // mute has expired
    ],
  });

  // Step 2: For each member, check if today matches their reminder schedule
  const membersToRemind = eligibleMembers.filter((member) => {
    const daysLeft = Math.ceil(
      (member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Use custom pattern if set, otherwise fall back to global default
    const reminderDays =
      member.customReminderDays && member.customReminderDays.length > 0
        ? member.customReminderDays
        : DEFAULT_REMINDER_DAYS;

    return reminderDays.includes(daysLeft);
  });

  logger.info(`Found ${membersToRemind.length} members due for reminders (out of ${eligibleMembers.length} eligible)`);

  if (membersToRemind.length === 0) return;

  // Process in batches of 10 (per skill spec — never fire 50 simultaneously)
  const BATCH_SIZE = 10;
  const gymName = 'GymWaBot'; // TODO: fetch from Owner model when multi-tenant

  for (let i = 0; i < membersToRemind.length; i += BATCH_SIZE) {
    const batch = membersToRemind.slice(i, i + BATCH_SIZE);
    await processBatch(batch, gymName);
  }

  logger.info('Reminder job completed');
}

/**
 * Start the cron scheduler.
 * MUST be called only after MongoDB connection is confirmed (per skill spec).
 * Fires at 8:00 AM IST daily.
 */
export function startCronJobs(): void {
  // '0 8 * * *' = every day at 8:00 AM
  // timezone: Asia/Kolkata (per skill spec — never UTC)
  cron.schedule(
    '0 8 * * *',
    async () => {
      try {
        await runReminderJob();
      } catch (error) {
        logger.error('Cron reminder job crashed', error);
      }
    },
    {
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('Cron scheduler started — reminders at 8:00 AM IST daily');
}
