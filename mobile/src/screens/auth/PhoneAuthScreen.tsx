import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AuthStackScreenProps } from '../../types/navigation';
import { apiRequest } from '../../utils/api';

interface ApiResponse {
  success: boolean;
  message?: string;
}

export default function PhoneAuthScreen({ navigation }: AuthStackScreenProps<'Phone'>) {
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');

  const handlePhoneChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(onlyDigits);
  };

  const handleCodeChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '').slice(0, 4);
    setVerificationCode(onlyDigits);
  };
  const handleCountryCodeChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setCountryCode(`+${digitsOnly}`);
  };


  const getFormattedPhoneNumber = () => `${countryCode}${phoneNumber.replace(/\D/g, '')}`;

  const handleSendCode = async () => {
    if (phoneNumber.trim().length !== 10) {
      setStatusType('error');
      setStatusMessage('Please enter exactly 10 digits.');
      Alert.alert('Invalid phone number', 'Please enter exactly 10 digits.');
      return;
    }

    setIsLoading(true);
    setStatusType('');
    setStatusMessage('');
    try {
      await apiRequest<ApiResponse>('/api/auth/send-phone-code', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: getFormattedPhoneNumber() }),
      });

      setIsVerifying(true);
      setStatusType('success');
      setStatusMessage('OTP sent successfully.');
      Alert.alert('Code sent', 'OTP was sent to your phone number.');
    } catch (error: any) {
      setStatusType('error');
      setStatusMessage(error.message || 'Failed to send OTP.');
      Alert.alert('Failed to send OTP', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setStatusType('error');
      setStatusMessage('Please enter the OTP code.');
      Alert.alert('OTP required', 'Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setStatusType('');
    setStatusMessage('');
    try {
      await apiRequest<ApiResponse>('/api/auth/verify-phone', {
        method: 'POST',
        body: JSON.stringify({
          phoneNumber: getFormattedPhoneNumber(),
          code: verificationCode.trim(),
        }),
      });

      navigation.navigate('Email', {
        phoneNumber: getFormattedPhoneNumber(),
      });
    } catch (error: any) {
      setStatusType('error');
      setStatusMessage(error.message || 'Phone verification failed.');
      Alert.alert('Phone verification failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Nest</Text>
      <Text style={styles.subtitle}>Enter your phone number to receive OTP</Text>
      {!isVerifying ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="+91"
            value={countryCode}
            onChangeText={handleCountryCodeChange}
            keyboardType="phone-pad"
            maxLength={5}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter phone number"
            value={phoneNumber}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={10}
          />
          <TouchableOpacity style={styles.button} onPress={handleSendCode}>
            <Text style={styles.buttonText}>{isLoading ? 'Sending...' : 'Send Code'}</Text>
          </TouchableOpacity>
          {statusMessage ? (
            <Text style={[styles.statusText, statusType === 'error' ? styles.errorText : styles.successText]}>
              {statusMessage}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            value={verificationCode}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={4}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyCode}>
            <Text style={styles.buttonText}>{isLoading ? 'Verifying...' : 'Verify Code'}</Text>
          </TouchableOpacity>
          {statusMessage ? (
            <Text style={[styles.statusText, statusType === 'error' ? styles.errorText : styles.successText]}>
              {statusMessage}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#FFF7FB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#7A2554',
  },
  subtitle: {
    textAlign: 'center',
    color: '#805A70',
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#EAC9DA',
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#D63384',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusText: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 14,
  },
  errorText: {
    color: '#C62828',
  },
  successText: {
    color: '#2E7D32',
  },
});
