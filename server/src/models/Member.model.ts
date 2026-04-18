import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Note entry — timestamped text from the owner.
 */
export interface INote {
  text: string;
  createdAt: Date;
  context?: string; // e.g. "payment", "mute", "attendance", "manual"
}

const NoteSchema = new Schema<INote>(
  {
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    context: { type: String, default: 'manual' },
  },
  { _id: true }
);

export interface IMember extends Document {
  name: string;
  phone: string;
  planType: string;
  monthlyAmount: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'frozen' | 'expired';
  whatsappOptIn: boolean;

  // Enhancement 1: Mute alerts
  mutedUntil: Date | null;

  // Enhancement 2: Custom reminder pattern
  customReminderDays: number[]; // e.g. [1, 3, 7] — empty = use global default

  // Enhancement 3: Partial payments & carry-over
  outstandingBalance: number;
  lastPartialPaymentDate: Date | null;

  // Enhancement 5: Notes (timestamped history log)
  notes: INote[];
}

const MemberSchema = new Schema<IMember>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    planType: {
      type: String,
      required: true,
      trim: true,
    },
    // Enhancement 4: Flexible monthly fee per member
    monthlyAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'frozen', 'expired'],
      default: 'active',
      index: true,
    },
    whatsappOptIn: {
      type: Boolean,
      default: true,
    },

    // Enhancement 1: Mute alerts until a specific date
    mutedUntil: {
      type: Date,
      default: null,
    },

    // Enhancement 2: Custom reminder days (default → [1, 3, 7])
    customReminderDays: {
      type: [Number],
      default: [],
    },

    // Enhancement 3: Outstanding balance tracking
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastPartialPaymentDate: {
      type: Date,
      default: null,
    },

    // Enhancement 5: Timestamped notes history
    notes: {
      type: [NoteSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Pre-save hook: auto-set status based on endDate
MemberSchema.pre('save', function (next) {
  if (this.status !== 'frozen') {
    this.status = this.endDate < new Date() ? 'expired' : 'active';
  }
  next();
});

// Compound indexes for production query performance
MemberSchema.index({ status: 1, endDate: 1 });
MemberSchema.index({ outstandingBalance: 1 });
MemberSchema.index({ mutedUntil: 1 });

export default mongoose.model<IMember>('Member', MemberSchema);
