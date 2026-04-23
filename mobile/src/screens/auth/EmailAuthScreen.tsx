import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { AuthStackScreenProps } from '../../types/navigation';
import { apiRequest } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types/chat';

interface AuthApiResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    profilePicture?: string;
  };
  message?: string;
}

export default function EmailAuthScreen({ route }: AuthStackScreenProps<'Email'>) {
  const phoneNumber = route.params?.phoneNumber;
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(true);
  const [canSignIn, setCanSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isExistingAccountError = (message: string) =>
    /already registered|already exists|please sign in/i.test(message);

  const saveSession = async (payload: AuthApiResponse) => {
    const normalizedUser: User = {
      id: payload.user.id,
      name: payload.user.name,
      email: payload.user.email,
      phoneNumber: payload.user.phoneNumber,
      profilePicture: payload.user.profilePicture,
    };
    await signIn(payload.token, normalizedUser);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        if (!phoneNumber) {
          throw new Error('Phone verification is required. Start from phone login.');
        }
        const response = await apiRequest<AuthApiResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            phoneNumber,
            email: email.trim().toLowerCase(),
            username: username.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            password: password.trim(),
          }),
        });
        await saveSession(response);
        return;
      }

      const response = await apiRequest<AuthApiResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          login: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });
      await saveSession(response);
    } catch (error: any) {
      const errorMessage = String(error?.message || 'Authentication failed');
      if (isSignUp && isExistingAccountError(errorMessage)) {
        setCanSignIn(true);
        setIsSignUp(false);
        Alert.alert('Account already exists', `${errorMessage}\nPlease sign in.`);
      } else {
        Alert.alert('Authentication failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{isSignUp ? 'Create Your Nest' : 'Welcome Back'}</Text>
      <Text style={styles.subtitle}>
        {isSignUp
          ? 'Sign up is mandatory for new users'
          : 'Sign in to open your chats'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      {isSignUp && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={lastName}
            onChangeText={setLastName}
          />
        </>
      )}
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      {canSignIn ? (
        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsSignUp(!isSignUp)}
        >
          <Text style={styles.switchText}>
            {isSignUp
              ? 'Already have an account? Sign in'
              : 'Need to create another account? Sign up'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
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
  switchButton: {
    marginTop: 15,
  },
  switchText: {
    color: '#A13772',
    textAlign: 'center',
  },
});
