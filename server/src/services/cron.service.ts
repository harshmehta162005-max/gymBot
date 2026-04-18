import cron from 'node-cron';
import Member from '../models/Member.model.js';
import Owner from '../models/Owner.model.js';
import { createPaymentLink } from './razorpay.service.js';
import { generateReminder } from './gemini.service.js';
import { sendTextMessage } from './whatsapp.service.js';
import { logger } from '../utils/logger.js';
import { ENV } from '../config/env.js';

/** Default fallback reminder days if owner hasn't configured */
const FALLBACK_REMINDER_DAYS = [1, 3, 7];

/**
 * Process a batch of members — generate reminder via Gemini & send via WhatsApp.
 */
async function processBatch(
  members: any[],
  gymName: string,
  language: 'en' | 'hi' | 'hinglish'
): Promise<void> {
  for (const member of members) {
    const daysLeft = Math.ceil(
      (member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    try {
      const currentDue = member.monthlyAmount;
      const totalDue = currentDue + (member.outstandingBalance || 0);

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

      const message = await generateReminder({
        memberName: member.name,
        gymName,
        daysRemaining: daysLeft,
        planAmount: totalDue,
        paymentLink: razorpayLinkUrl,
        language, // uses owner's configured language
        outstandingBalance: member.outstandingBalance || 0,
      });

      await sendTextMessage(member.phone, message);
      logger.info(`Reminder sent to ${member.name} (${member.phone}) — ${daysLeft} days ${daysLeft >= 0 ? 'left' : 'overdue'}, total due ₹${totalDue}`);
    } catch (error) {
      logger.error(`Failed to send reminder to ${member.name} (${member.phone})`, error);

      // Retry once after 5 minutes
      setTimeout(async () => {
        try {
          const totalDue = member.monthlyAmount + (member.outstandingBalance || 0);
          const fallbackMsg = `Hi ${member.name}, your gym plan ${daysLeft > 0 ? `expires in ${daysLeft} day(s)` : `expired ${Math.abs(daysLeft)} day(s) ago`}. Total due: ₹${totalDue}. Please visit the gym to renew.`;
          await sendTextMessage(member.phone, fallbackMsg);
          logger.info(`Retry reminder sent to ${member.name} (${member.phone})`);
        } catch (retryErr) {
          logger.error(`Retry also failed for ${member.name} (${member.phone})`, retryErr);
        }
      }, 5 * 60 * 1000);
    }
  }
}

/**
 * Run the reminder job.
 * Reads owner settings for: reminderEnabled, defaultReminderDays, afterDueReminderDays, reminderLanguage, gymName.
 */
export async function runReminderJob(): Promise<void> {
  logger.info('Reminder job started');

  // Fetch all owners
  const owners = await Owner.find();
  if (!owners.length) {
    logger.info('No owners found — skipping reminders');
    return;
  }

  for (const owner of owners) {
    // Check if reminders are enabled
    if (owner.reminderEnabled === false) {
      continue;
    }

    const gymName = owner.gymName || 'GymWaBot';
    const langMap: Record<string, 'en' | 'hi' | 'hinglish'> = { english: 'en', hindi: 'hi', hinglish: 'hinglish' };
    const language = langMap[owner.reminderLanguage] || 'hinglish';
    const beforeDueDays = owner.defaultReminderDays?.length ? owner.defaultReminderDays : FALLBACK_REMINDER_DAYS;
    const afterDueDays = owner.afterDueReminderDays?.length ? owner.afterDueReminderDays : FALLBACK_REMINDER_DAYS;

    // Find eligible members for THIS owner
    const eligibleMembers = await Member.find({
      ownerId: owner._id,
      status: { $in: ['active', 'expired'] },
      whatsappOptIn: true,
      $or: [
        { mutedUntil: null },
        { mutedUntil: { $lte: new Date() } },
      ],
    });

    const membersToRemind = eligibleMembers.filter((member) => {
      const daysLeft = Math.ceil(
        (member.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft > 0) {
        const reminderDays =
          member.customReminderDays && member.customReminderDays.length > 0
            ? member.customReminderDays
            : beforeDueDays;
        return reminderDays.includes(daysLeft);
      } else {
        const daysOverdue = Math.abs(daysLeft);
        return afterDueDays.includes(daysOverdue);
      }
    });

    logger.info(`[${gymName}] Found ${membersToRemind.length} members due for reminders (out of ${eligibleMembers.length} eligible)`);

    if (membersToRemind.length === 0) continue;

    // Process in batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < membersToRemind.length; i += BATCH_SIZE) {
      const batch = membersToRemind.slice(i, i + BATCH_SIZE);
      await processBatch(batch, gymName, language);
    }
  }

  logger.info('Reminder job completed');
}

/**
 * Start the cron scheduler to run every minute and check if the current time matches owner.reminderTime.
 */
export function startCronJobs(): void {
  // Run every minute
  cron.schedule(
    '* * * * *',
    async () => {
      try {
        const owners = await Owner.find({ reminderEnabled: true, reminderTime: { $exists: true, $ne: null } });
        if (!owners.length) return;

        // Get current time in Asia/Kolkata
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { 
          timeZone: 'Asia/Kolkata', 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit' 
        };
        const currentIST = now.toLocaleTimeString('en-IN', options);

        const matchingOwners = owners.filter(o => o.reminderTime === currentIST);
        if (matchingOwners.length > 0) {
          logger.info(`Scheduled time matched (${currentIST} IST) for ${matchingOwners.length} owner(s) — running reminder job`);
          await runReminderJob();
        }
      } catch (error) {
        logger.error('Cron reminder job crashed', error);
      }
    },
    { timezone: 'Asia/Kolkata' }
  );

  logger.info('Cron scheduler started — checks reminder time dynamically every minute in IST');
}
