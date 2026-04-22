import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack Types
export type AuthStackParamList = {
  Phone: undefined;
  Email: {
    phoneNumber: string;
  };
};

// Main Tab Types
export type MainTabParamList = {
  Chat: undefined;
  Camera: undefined;
  Profile: undefined;
};

// Root Stack Types (including nested navigators)
export type RootStackParamList = {
  Main: undefined;
  Call: {
    isIncoming: boolean;
    partnerId: string;
    partnerName: string;
    callType: 'audio' | 'video';
  };
};

// Helper types for nested navigation
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = 
  CompositeScreenProps<
    NativeStackScreenProps<AuthStackParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type MainTabScreenProps<T extends keyof MainTabParamList> = 
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

export type RootStackScreenProps<T extends keyof RootStackParamList> = 
  NativeStackScreenProps<RootStackParamList, T>;
