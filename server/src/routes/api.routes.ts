import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { login, register } from '../controllers/auth.controller.js';
import { getMembers, getMember, createMember, updateMember, deleteMember } from '../controllers/member.controller.js';
import { getPayments, createPayment, paymentCallback } from '../controllers/payment.controller.js';
import { getAttendance, markAttendance, scanAttendance } from '../controllers/attendance.controller.js';

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

router.get('/members', getMembers);
router.get('/members/:id', getMember);
router.post('/members', createMember);
router.put('/members/:id', updateMember);
router.delete('/members/:id', deleteMember);

router.get('/payments', getPayments);
router.post('/payments', createPayment);

router.get('/attendance', getAttendance);
router.post('/attendance', markAttendance);

export default router;
