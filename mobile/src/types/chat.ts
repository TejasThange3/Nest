import { IMessage } from 'react-native-gifted-chat';

export interface CustomMessage extends IMessage {
  customView?: React.ReactNode;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  sender: User;
  messageType: 'text' | 'image' | 'video' | 'suku';
  status?: 'sent' | 'delivered' | 'read';
  sukuEmotion?: 'happy' | 'sad' | 'excited' | 'thinking' | 'love' | 'angry';
  sukuAnimation?: string;
}
