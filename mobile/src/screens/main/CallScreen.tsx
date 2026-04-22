import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RootStackScreenProps } from '../../types/navigation';

type CallScreenProps = RootStackScreenProps<'Call'>;

export default function CallScreen({ navigation, route }: CallScreenProps) {
  const { partnerName, callType } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{callType === 'video' ? 'Video Call' : 'Audio Call'}</Text>
      <Text style={styles.subtitle}>Calling {partnerName}</Text>
      <Text style={styles.note}>
        Live call is disabled in Expo Go preview build. Use EAS dev build to enable WebRTC.
      </Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#121212',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ddd',
    fontSize: 18,
    marginBottom: 20,
  },
  note: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#2B7FFF',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
