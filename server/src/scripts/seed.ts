import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Owner from '../models/Owner.model.js';
import Member from '../models/Member.model.js';
import Payment from '../models/Payment.model.js';
import Attendance from '../models/Attendance.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const seedDatabase = async () => {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Database. Purging old data...');

    await Owner.deleteMany({});
    await Member.deleteMany({});
    await Payment.deleteMany({});
    await Attendance.deleteMany({});

    console.log('Old data cleared. Scaffolding new data...');

    // 1. Create Test Owner
    const passwordHash = await bcrypt.hash('password123', 10);
    const owner = await Owner.create({
      email: 'owner@gym.com',
      passwordHash,
      gymName: 'FitZone Alpha',
      phone: '9876543210'
    });

    console.log(`Created Owner: ${owner.email} / password123`);

    // 2. Create Members (with new fields: monthlyAmount, outstandingBalance, etc.)
    const now = new Date();
    const activeMemberEnd = new Date(now);
    activeMemberEnd.setMonth(activeMemberEnd.getMonth() + 3);

    const dueMemberEnd = new Date(now);
    dueMemberEnd.setDate(dueMemberEnd.getDate() + 2);

    const expiredMemberEnd = new Date(now);
    expiredMemberEnd.setDate(expiredMemberEnd.getDate() - 5);

    const mutedUntil = new Date(now);
    mutedUntil.setDate(mutedUntil.getDate() + 14); // Muted for 2 weeks

    const members = await Member.insertMany([
      {
        name: 'Rahul Kumar', phone: '9000000001', planType: 'Quarterly', monthlyAmount: 2999,
        startDate: now, endDate: activeMemberEnd, status: 'active',
        notes: [{ text: 'Joined via referral from Amit', createdAt: now, context: 'registration' }],
      },
      {
        name: 'Priya Sharma', phone: '9000000002', planType: 'Monthly', monthlyAmount: 999,
        startDate: now, endDate: dueMemberEnd, status: 'active',
        outstandingBalance: 500, lastPartialPaymentDate: new Date(now.getTime() - 5 * 86400000),
        notes: [
          { text: 'Paid ₹499 partial', createdAt: new Date(now.getTime() - 5 * 86400000), context: 'payment' },
          { text: 'Will pay remaining next week', createdAt: new Date(now.getTime() - 4 * 86400000), context: 'manual' },
        ],
      },
      {
        name: 'Amit Singh', phone: '9000000003', planType: 'Annual', monthlyAmount: 1499,
        startDate: now, endDate: expiredMemberEnd, status: 'expired',
        outstandingBalance: 1499,
      },
      {
        name: 'Neha Gupta', phone: '9000000004', planType: 'Monthly', monthlyAmount: 1200,
        startDate: now, endDate: activeMemberEnd, status: 'active',
        mutedUntil, // Muted for 2 weeks
        notes: [{ text: 'Muted until ' + mutedUntil.toLocaleDateString('en-IN') + '. Reason: vacation', createdAt: now, context: 'mute' }],
      },
      {
        name: 'Ravi Verma', phone: '9000000005', planType: 'Monthly', monthlyAmount: 800,
        startDate: now, endDate: dueMemberEnd, status: 'active',
        customReminderDays: [1, 4, 10], // Custom reminder pattern
      },
    ]);

    console.log(`Created ${members.length} Members (with monthlyAmount, outstanding, mute, custom reminders)`);

    // 3. Create Payments (with paymentType)
    await Payment.insertMany([
      { memberId: members[0]._id, amount: 2999, razorpayLinkId: 'plink_test1', razorpayLinkUrl: 'https://rzp.io/i/test1', status: 'paid', paidAt: new Date(now.getTime() - 5 * 86400000), paymentType: 'razorpay' },
      { memberId: members[1]._id, amount: 499, status: 'paid', paidAt: new Date(now.getTime() - 5 * 86400000), paymentType: 'partial', note: 'Cash payment' },
      { memberId: members[1]._id, amount: 999, razorpayLinkId: 'plink_test2', razorpayLinkUrl: 'https://rzp.io/i/test2', status: 'pending', paymentType: 'razorpay' },
      { memberId: members[3]._id, amount: 1200, status: 'paid', paidAt: new Date(now.getTime() - 2 * 86400000), paymentType: 'full', note: 'UPI payment' },
    ]);

    console.log(`Created 4 Payments (razorpay + partial + full)`);

    // 4. Create Attendance
    const today = new Date();
    today.setHours(9, 30, 0, 0);
    await Attendance.insertMany([
      { memberId: members[0]._id, date: today, method: 'qr-scan' },
      { memberId: members[1]._id, date: today, method: 'whatsapp-reply' },
      { memberId: members[3]._id, date: today, method: 'qr-scan' },
    ]);

    console.log(`Created 3 Attendance records`);
    console.log('✅ DB Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
