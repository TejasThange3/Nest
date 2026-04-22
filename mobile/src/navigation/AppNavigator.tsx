import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AuthStackParamList, MainTabParamList, RootStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();

// Import your screens here
import PhoneAuthScreen from '../screens/auth/PhoneAuthScreen';
import EmailAuthScreen from '../screens/auth/EmailAuthScreen';
import ChatScreen from '../screens/main/ChatScreen';
import CameraScreen from '../screens/main/CameraScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CallScreen from '../screens/main/CallScreen';

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Phone" component={PhoneAuthScreen} />
    <AuthStack.Screen name="Email" component={EmailAuthScreen} />
  </AuthStack.Navigator>
);

const MainNavigator = () => (
  <MainTab.Navigator
    screenOptions={({ route }) => ({
      headerStyle: { backgroundColor: '#FFF5FA' },
      headerTitleStyle: { fontWeight: '700' },
      tabBarActiveTintColor: '#D63384',
      tabBarInactiveTintColor: '#8A8A8A',
      tabBarStyle: { backgroundColor: '#FFF', borderTopColor: '#F0DCE8' },
      tabBarIcon: ({ color, size }) => {
        const icon =
          route.name === 'Chat'
            ? 'chat'
            : route.name === 'Camera'
              ? 'photo-camera'
              : 'person';
        return <MaterialIcons name={icon as any} size={size} color={color} />;
      },
    })}
  >
    <MainTab.Screen name="Chat" component={ChatScreen} />
    <MainTab.Screen name="Camera" component={CameraScreen} />
    <MainTab.Screen name="Profile" component={ProfileScreen} />
  </MainTab.Navigator>
);

export const AppNavigator = () => {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Main" component={MainNavigator} />
          <RootStack.Screen name="Call" component={CallScreen} options={{ presentation: 'modal' }} />
        </RootStack.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
