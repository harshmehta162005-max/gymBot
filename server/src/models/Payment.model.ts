import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  memberId: Types.ObjectId;
  amount: number;
  razorpayLinkId: string;
  razorpayLinkUrl: string;
  status: 'pending' | 'paid' | 'expired';
  paidAt?: Date;
  // Enhancement 3: Partial vs Full payment tracking
  paymentType: 'full' | 'partial' | 'razorpay';
  note?: string;
}

const PaymentSchema = new Schema<IPayment>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    razorpayLinkId: {
      type: String,
      default: '',
    },
    razorpayLinkUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'expired'],
      default: 'pending',
    },
    paidAt: {
      type: Date,
      default: null,
    },
    // Enhancement 3: Track payment type
    paymentType: {
      type: String,
      enum: ['full', 'partial', 'razorpay'],
      default: 'razorpay',
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
