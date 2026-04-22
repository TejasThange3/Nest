import mongoose, { Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  email: string;
  name: string;
  countryCode: string;
  profilePicture?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  lastActive: Date;
}

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  countryCode: {
    type: String,
    required: true,
  },
  profilePicture: {
    type: String,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

export default mongoose.model<IUser>('User', userSchema);
