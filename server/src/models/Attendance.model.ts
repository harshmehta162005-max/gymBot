import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  memberId: Types.ObjectId;
  date: Date;
  method: 'whatsapp-location' | 'whatsapp-reply' | 'qr-scan' | 'manual';

  // Location data (populated for whatsapp-location method)
  lat: number | null;
  lon: number | null;
  distance_m: number | null;
  status: 'success' | 'outside' | 'manual';
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    memberId: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    method: {
      type: String,
      enum: ['whatsapp-location', 'whatsapp-reply', 'qr-scan', 'manual'],
      required: true,
    },
    lat: {
      type: Number,
      default: null,
    },
    lon: {
      type: Number,
      default: null,
    },
    distance_m: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'outside', 'manual'],
      default: 'success',
    },
  },
  { timestamps: true }
);

// Compound index for duplicate prevention
AttendanceSchema.index({ memberId: 1, date: -1 });

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
