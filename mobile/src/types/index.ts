export type AuthStackParamList = {
  PhoneAuth: undefined;
  EmailAuth: {
    phoneNumber: string;
    countryCode: string;
  };
};

export type MainTabParamList = {
  Chat: undefined;
  Camera: undefined;
  Profile: undefined;
};

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  profilePicture?: string;
}

export interface Message {
  id: string;
  sender: User;
  receiver: User;
  content: string;
  messageType: 'text' | 'image' | 'suku';
  sukuEmotion?: string;
  sukuAnimation?: string;
  createdAt: Date;
  isRead: boolean;
}

export interface SukuMessage {
  content: string;
  emotion: string;
  animation?: string;
  recipient: string;
}
