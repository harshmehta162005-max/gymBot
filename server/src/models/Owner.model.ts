import mongoose, { Schema, Document } from 'mongoose';

export interface IBusinessShift {
  open: string; // "06:00"
  close: string; // "12:00"
  label: string; // "Morning", "Evening"
}

export interface IOwner extends Document {
  email: string;
  passwordHash: string;
  gymName: string;
  phone: string;

  // Gym location for attendance geofencing
  gymLat: number | null;
  gymLon: number | null;
  gymRadius: number; // meters — default 75
  gymAddress: string;

  // Business info
  ownerName: string;
  businessShifts: IBusinessShift[]; // multiple shifts
  businessDays: number[]; // 0=Sun, 1=Mon ... 6=Sat

  // Payment defaults
  defaultMonthlyFee: number;
  currency: string;
  gracePeriodDays: number;

  // Reminder settings
  reminderEnabled: boolean;
  defaultReminderDays: number[]; // days BEFORE due date, e.g. [1, 3, 7]
  afterDueReminderDays: number[]; // days AFTER due date, e.g. [1, 3, 7]
  reminderTime: string; // "08:00"
  reminderLanguage: string; // "hinglish", "english", "hindi"

  // Attendance settings
  attendanceMethods: string[];
  duplicateWindowHours: number;
  streakMilestones: number[];

  // WhatsApp settings
  welcomeMessage: string;
  autoReplyEnabled: boolean;
}

const BusinessShiftSchema = new Schema(
  {
    open: { type: String, default: '06:00' },
    close: { type: String, default: '22:00' },
    label: { type: String, default: 'Full Day' },
  },
  { _id: false }
);

const OwnerSchema = new Schema<IOwner>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    gymName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    gymLat: { type: Number, default: null },
    gymLon: { type: Number, default: null },
    gymRadius: { type: Number, default: 75, min: 10, max: 500 },
    gymAddress: { type: String, default: '', trim: true },

    // Business info
    ownerName: { type: String, default: '', trim: true },
    businessShifts: {
      type: [BusinessShiftSchema],
      default: [{ open: '06:00', close: '22:00', label: 'Full Day' }],
    },
    businessDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5, 6],
    },

    // Payment defaults
    defaultMonthlyFee: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    gracePeriodDays: { type: Number, default: 3, min: 0, max: 30 },

    // Reminder settings
    reminderEnabled: { type: Boolean, default: true },
    defaultReminderDays: { type: [Number], default: [1, 3, 7] },
    afterDueReminderDays: { type: [Number], default: [1, 3, 7] },
    reminderTime: { type: String, default: '08:00' },
    reminderLanguage: { type: String, default: 'hinglish', enum: ['english', 'hindi', 'hinglish'] },

    // Attendance settings
    attendanceMethods: { type: [String], default: ['manual', 'qr-scan', 'whatsapp-location'] },
    duplicateWindowHours: { type: Number, default: 18, min: 1, max: 24 },
    streakMilestones: { type: [Number], default: [7, 30, 100] },

    // WhatsApp settings
    welcomeMessage: { type: String, default: '' },
    autoReplyEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IOwner>('Owner', OwnerSchema);
