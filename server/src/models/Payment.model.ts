import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  memberId: Types.ObjectId;
  amount: number;
  razorpayLinkId: string;
  razorpayLinkUrl: string;
  status: 'pending' | 'paid' | 'expired';
  paidAt?: Date;
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
      required: true,
    },
    razorpayLinkUrl: {
      type: String,
      required: true,
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
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
