import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAttendance extends Document {
  memberId: Types.ObjectId;
  date: Date;
  method: 'whatsapp-reply' | 'qr-scan';
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
      enum: ['whatsapp-reply', 'qr-scan'],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAttendance>('Attendance', AttendanceSchema);
