import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { login, register, getOwnerSettings, updateOwnerSettings, changePassword } from '../controllers/auth.controller.js';
import {
  getMembers,
  getMember,
  getMemberStats,
  createMember,
  updateMember,
  deleteMember,
  muteMember,
  recordPartialPayment,
  addNote,
  updateDueDate,
} from '../controllers/member.controller.js';
import { getPayments, createPayment, paymentCallback, resendPayment, cancelPayment, deletePayment } from '../controllers/payment.controller.js';
import { getAttendance, markAttendance, scanAttendance, getAttendanceStats } from '../controllers/attendance.controller.js';
import { getActivityLogs, clearActivityLogs } from '../controllers/activity.controller.js';
import { runReminderJob } from '../services/cron.service.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// --- Auth (no JWT required) ---
router.post('/auth/register', register);
router.post('/auth/login', login);

// --- Payment callback (public — Razorpay calls this) ---
router.get('/payments/callback', paymentCallback);

// --- Attendance QR scan (public) ---
router.get('/attendance/scan', scanAttendance);

// --- Protected routes (JWT required) ---
router.use(auth);

// Members CRUD
router.get('/members/stats', getMemberStats);     // Must be BEFORE /:id
router.get('/members', getMembers);
router.get('/members/:id', getMember);
router.post('/members', createMember);
router.put('/members/:id', updateMember);
router.delete('/members/:id', deleteMember);

// Member actions (Enhancement 1-5)
router.put('/members/:id/mute', muteMember);
router.post('/members/:id/partial-payment', recordPartialPayment);
router.post('/members/:id/notes', addNote);
router.put('/members/:id/due-date', updateDueDate);

// Payments
router.get('/payments', getPayments);
router.post('/payments', createPayment);
router.post('/payments/:id/resend', resendPayment);
router.put('/payments/:id/cancel', cancelPayment);
router.delete('/payments/:id', deletePayment);

// Activity / History
router.get('/activity', getActivityLogs);
router.delete('/activity', clearActivityLogs);

// Attendance
router.get('/attendance/stats', getAttendanceStats);
router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);

// Owner settings
router.get('/owner/settings', getOwnerSettings);
router.put('/owner/settings', updateOwnerSettings);
router.put('/owner/change-password', changePassword);

// --- Admin: manual trigger for reminders (per cron-scheduler skill spec) ---
router.post('/admin/trigger-reminders', asyncHandler(async (_req, res) => {
  await runReminderJob();
  res.json({ success: true, message: 'Reminder job executed manually' });
}));

export default router;
