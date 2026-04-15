import mongoose, { Schema, Document } from 'mongoose';

export interface IOwner extends Document {
  email: string;
  passwordHash: string;
  gymName: string;
  phone: string;
}

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
  },
  { timestamps: true }
);

export default mongoose.model<IOwner>('Owner', OwnerSchema);
