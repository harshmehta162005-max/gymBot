import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  memberId: Types.ObjectId | null;
  memberName: string;
  action:
    | 'member_added'
    | 'member_deleted'
    | 'payment_created'
    | 'payment_received'
    | 'payment_cancelled'
    | 'payment_deleted'
    | 'mute_changed'
    | 'due_date_changed'
    | 'reminder_sent'
    | 'note_added';
  amount?: number;
  note?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      default: null,
      index: true,
    },
    memberName: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'member_added',
        'member_deleted',
        'payment_created',
        'payment_received',
        'payment_cancelled',
        'payment_deleted',
        'mute_changed',
        'due_date_changed',
        'reminder_sent',
        'note_added',
      ],
      index: true,
    },
    amount: {
      type: Number,
      default: null,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
