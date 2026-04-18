/**
 * Migration: Assign ownerId to all existing records.
 * Run once: npx ts-node src/scripts/migrate-ownerid.ts
 */
import mongoose from 'mongoose';
import { ENV } from '../config/env.js';
import Owner from '../models/Owner.model.js';
import Member from '../models/Member.model.js';
import Attendance from '../models/Attendance.model.js';
import Payment from '../models/Payment.model.js';
import ActivityLog from '../models/ActivityLog.model.js';

async function migrate() {
  await mongoose.connect(ENV.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Drop old unique index on phone (it's now a compound index with ownerId)
  try {
    await Member.collection.dropIndex('phone_1');
    console.log('Dropped old phone_1 unique index');
  } catch (e: any) {
    console.log('phone_1 index not found or already dropped:', e.message);
  }

  // Find the first owner (existing single-tenant data belongs to them)
  const owner = await Owner.findOne();
  if (!owner) {
    console.log('No owner found — nothing to migrate.');
    await mongoose.disconnect();
    return;
  }

  const ownerId = owner._id;
  console.log(`Migrating all data to owner: ${owner.gymName} (${ownerId})`);

  // Update all Members without ownerId
  const memberResult = await Member.updateMany(
    { ownerId: { $exists: false } },
    { $set: { ownerId } }
  );
  console.log(`Members updated: ${memberResult.modifiedCount}`);

  // Update all Attendance without ownerId
  const attendanceResult = await Attendance.updateMany(
    { ownerId: { $exists: false } },
    { $set: { ownerId } }
  );
  console.log(`Attendance records updated: ${attendanceResult.modifiedCount}`);

  // Update all Payments without ownerId
  const paymentResult = await Payment.updateMany(
    { ownerId: { $exists: false } },
    { $set: { ownerId } }
  );
  console.log(`Payments updated: ${paymentResult.modifiedCount}`);

  // Update all ActivityLogs without ownerId
  const activityResult = await ActivityLog.updateMany(
    { ownerId: { $exists: false } },
    { $set: { ownerId } }
  );
  console.log(`Activity logs updated: ${activityResult.modifiedCount}`);

  console.log('Migration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
