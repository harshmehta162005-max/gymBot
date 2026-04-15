import mongoose, { Schema, Document } from 'mongoose';

export interface IMember extends Document {
  name: string;
  phone: string;
  planType: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'frozen' | 'expired';
  whatsappOptIn: boolean;
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
    },
    whatsappOptIn: {
      type: Boolean,
      default: true,
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

export default mongoose.model<IMember>('Member', MemberSchema);
