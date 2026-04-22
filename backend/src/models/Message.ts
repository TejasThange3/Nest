import mongoose, { Document } from 'mongoose';

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  content: string;
  messageType: 'text' | 'image' | 'suku';
  sukuEmotion?: string;
  sukuAnimation?: string;
  isRead: boolean;
}

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'suku'],
    default: 'text',
  },
  sukuEmotion: {
    type: String,
    enum: [
      'happy', 'love', 'angry', 'sad', 'excited', 
      'sleepy', 'surprised', 'worried', 'playful',
      'confused', 'celebrating', 'crying', 'winking'
    ],
  },
  sukuAnimation: {
    type: String,
    enum: [
      'hearts', 'stars', 'sparkles', 'rain', 
      'thundercloud', 'rainbow', 'flowers'
    ],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.model<IMessage>('Message', messageSchema);
