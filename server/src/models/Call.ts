import mongoose, { Document, Schema } from 'mongoose';

export interface ICall extends Document {
  caller: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  callType: 'voice' | 'video';
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'declined';
  startTime?: Date;
  endTime?: Date;
  duration?: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
}

const callSchema = new Schema<ICall>({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['initiated', 'ringing', 'connected', 'ended', 'declined'],
    default: 'initiated'
  },
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  versionKey: false
});

// Indexes
callSchema.index({ caller: 1, createdAt: -1 });
callSchema.index({ recipient: 1, createdAt: -1 });
callSchema.index({ status: 1 });
callSchema.index({ createdAt: -1 });

// Calculate duration before saving
callSchema.pre('save', function(this: ICall, next: any) {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime.getTime() - this.startTime.getTime()) / 1000);
  }
  next();
});

export const Call = mongoose.model<ICall>('Call', callSchema);
