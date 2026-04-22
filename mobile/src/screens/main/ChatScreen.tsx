import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Alert, Text, Image } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import io from 'socket.io-client';
import { TypedSocket } from '../../types/socket';
import { Message, User, CustomMessage } from '../../types/chat';
import { MainTabScreenProps } from '../../types/navigation';
import { SukuBubble } from '../../components/SukuBubble';
import { CallButton } from '../../components/CallButton';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/api';

interface Contact {
  id: string;
  name: string;
}

const THOUGHTS = [
  'Love grows through small daily kindness.',
  'Send one sweet message today and make them smile.',
  'A calm heart understands better than an angry one.',
  'Your person is your safe place. Protect it.',
  'Tiny moments become beautiful memories.',
];

export default function ChatScreen({ navigation }: MainTabScreenProps<'Chat'>) {
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [socket, setSocket] = useState<TypedSocket | null>(null);
  const [activePartner, setActivePartner] = useState<Contact | null>(null);
  const [sukuMood, setSukuMood] = useState<Message['sukuEmotion']>('happy');
  const [smartNudge, setSmartNudge] = useState<string | null>(null);
  const { token, user: currentUser } = useAuth();
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thoughtOfTheDay = useMemo(() => {
    const day = new Date().getDate();
    return THOUGHTS[day % THOUGHTS.length];
  }, []);

  const getSukuGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return `Good morning ${currentUser?.name || 'dear'}! 🌞`;
    if (hour < 18) return `Good afternoon ${currentUser?.name || 'dear'}! ✨`;
    return `Good night ${currentUser?.name || 'dear'}! 🌙`;
  }, [currentUser?.name]);

  const detectSukuEmotion = (text: string): Message['sukuEmotion'] => {
    const normalized = text.toLowerCase();
    if (normalized.includes('love') || normalized.includes('miss')) return 'love';
    if (normalized.includes('angry') || normalized.includes('mad')) return 'angry';
    if (normalized.includes('sad') || normalized.includes('cry')) return 'sad';
    return 'happy';
  };

  const getMoodTheme = useMemo(() => {
    if (sukuMood === 'love') {
      return {
        background: '#FFF0F7',
        sukuCard: '#FFE2EF',
        sukuAccent: '#B43673',
      };
    }
    if (sukuMood === 'angry') {
      return {
        background: '#FFF4F2',
        sukuCard: '#FFDCD6',
        sukuAccent: '#A7341D',
      };
    }
    if (sukuMood === 'sad') {
      return {
        background: '#F3F8FF',
        sukuCard: '#DEEBFF',
        sukuAccent: '#2A5E99',
      };
    }
    return {
      background: '#FFF7FB',
      sukuCard: '#FDE9F3',
      sukuAccent: '#833B63',
    };
  }, [sukuMood]);

  const getSukuMoodText = () => {
    if (sukuMood === 'love') return 'Feeling lovely and cuddly 💖';
    if (sukuMood === 'angry') return 'Mood alert: dramatic and puffy 😤';
    if (sukuMood === 'sad') return 'Soft mode on. Needs hugs 🫶';
    return 'Cheerful mode active 🌟';
  };

  const getMoodEmoji = () => {
    if (sukuMood === 'love') return '💖';
    if (sukuMood === 'angry') return '😠';
    if (sukuMood === 'sad') return '😢';
    return '✨';
  };

  const triggerSmartNudge = (text: string) => {
    setSmartNudge(text);
    if (nudgeTimerRef.current) {
      clearTimeout(nudgeTimerRef.current);
    }
    nudgeTimerRef.current = setTimeout(() => setSmartNudge(null), 5000);
  };

  const buildSukuReply = (text: string) => {
    const emotion = detectSukuEmotion(text);
    if (emotion === 'love') return { emotion, message: `Aww 💖 ${text} ✨` };
    if (emotion === 'angry') return { emotion, message: `Message delivered with attitude 😠: ${text}` };
    if (emotion === 'sad') return { emotion, message: `Sending this softly 🫶: ${text}` };
    return { emotion, message: `Got it 🌟: ${text}` };
  };

  const handleCall = (callType: 'video' | 'audio') => {
    if (!currentUser || !socket || !activePartner) {
      Alert.alert('Error', 'Unable to initiate call. Please try again.');
      return;
    }

    // Navigate to call screen
    navigation.navigate('Call', {
      isIncoming: false,
      partnerId: activePartner.id,
      partnerName: activePartner.name,
      callType,
    });
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <CallButton
          onVideoCall={() => handleCall('video')}
          onAudioCall={() => handleCall('audio')}
        />
      ),
    });
  }, [navigation, currentUser, socket]);

  useEffect(() => {
    const loadContacts = async () => {
      if (!token) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/user/contacts`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok || !data?.contacts?.length) {
          return;
        }

        setActivePartner({
          id: data.contacts[0].id,
          name: data.contacts[0].name,
        });
      } catch (error) {
        console.error('Failed to load contacts:', error);
      }
    };

    loadContacts();
  }, [token]);

  useEffect(() => {
    if (!currentUser) return;
    const greetingMessage: CustomMessage = {
      _id: `suku-greeting-${Date.now()}`,
      text: getSukuGreeting(),
      createdAt: new Date(),
      user: { _id: 'suku', name: 'Suku' },
      customView: (
        <SukuBubble
          message={getSukuGreeting()}
          emotion="happy"
        />
      ),
    };
    setMessages((prev) => (prev.length === 0 ? [greetingMessage] : prev));
  }, [currentUser, getSukuGreeting]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const newSocket = io(API_BASE_URL, {
      auth: { token },
    });
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (message: Message) => {
      const newMessage: CustomMessage = {
        _id: message.id || (message as any)._id,
        text: message.content,
        createdAt: typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt,
        user: {
          _id: message.sender.id,
          name: message.sender.name,
          avatar: message.sender.profilePicture,
        },
      };

      setMessages(previousMessages => 
        GiftedChat.append(previousMessages, [newMessage])
      );

      if (message.sender.id !== currentUser?.id) {
        triggerSmartNudge(`${message.sender.name} has sent you a message 💌`);
      }
    });

    // Listen for Suku messages
    socket.on('suku-message', (sukuMessage: Message) => {
      const newMessage: CustomMessage = {
        _id: sukuMessage.id,
        text: sukuMessage.content,
        createdAt: typeof sukuMessage.createdAt === 'string' ? new Date(sukuMessage.createdAt) : sukuMessage.createdAt,
        user: {
          _id: 'suku',
          name: 'Suku',
          avatar: undefined,
        },
        customView: (
          <SukuBubble
            message={sukuMessage.content}
            emotion={sukuMessage.sukuEmotion || 'happy'}
            animation={sukuMessage.sukuAnimation}
          />
        ),
      };

      setMessages(previousMessages => 
        GiftedChat.append(previousMessages, [newMessage])
      );
      setSukuMood(sukuMessage.sukuEmotion || 'happy');
    });

    return () => {
      (socket as any).off('new-message');
      (socket as any).off('suku-message');
      if (nudgeTimerRef.current) {
        clearTimeout(nudgeTimerRef.current);
      }
    };
  }, [socket, currentUser?.id]);

  const onSend = useCallback((newMessages: CustomMessage[] = []) => {
    if (!socket || !currentUser) return;

    const message = newMessages[0];
    if (!message) return;
    
    // Check if it's a message for Suku
    if (message.text.toLowerCase().startsWith('/suku')) {
      const cleaned = message.text.slice(6).trim();
      const sukuReply = buildSukuReply(cleaned);
      setSukuMood(sukuReply.emotion || 'happy');

      socket.emit('suku-message', {
        id: message._id.toString(),
        content: cleaned, // Remove "/suku " prefix
        sender: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email || '',
          phoneNumber: currentUser.phoneNumber || '',
          profilePicture: currentUser.profilePicture,
        },
        createdAt: new Date(),
        messageType: 'suku',
      });

      const sukuLocalMessage: CustomMessage = {
        _id: `suku-local-${Date.now()}`,
        text: sukuReply.message,
        createdAt: new Date(),
        user: {
          _id: 'suku',
          name: 'Suku',
        },
        customView: (
          <SukuBubble
            message={sukuReply.message}
            emotion={sukuReply.emotion || 'happy'}
          />
        ),
      };
      setMessages(previousMessages =>
        GiftedChat.append(previousMessages, [sukuLocalMessage])
      );
    } else {
      if (!activePartner) {
        Alert.alert('No contact', 'Add a contact first to start chatting.');
        return;
      }

      socket.emit('send-message', {
        recipient: activePartner.id,
        content: message.text,
        messageType: 'text',
      });
    }

    setMessages(previousMessages => 
      GiftedChat.append(previousMessages, newMessages)
    );
  }, [socket, currentUser, activePartner]);

  return (
    <View style={[styles.container, { backgroundColor: getMoodTheme.background }]}>
      <View style={styles.sukuPanel}>
        <View style={[styles.sukuAvatarOuter, { backgroundColor: getMoodTheme.sukuCard }]}>
          <View style={styles.sukuGlow} />
          <View style={styles.sukuAvatar}>
          <Image source={require('../../../assets/suku-figurine.png')} style={styles.sukuAvatarImage} />
          </View>
        </View>
        <View style={styles.sukuInfo}>
          <Text style={[styles.sukuName, { color: getMoodTheme.sukuAccent }]}>Suku</Text>
          <Text style={styles.sukuMoodText}>{getSukuMoodText()}</Text>
        </View>
        <View style={styles.moodChip}>
          <Text style={styles.moodChipText}>{getMoodEmoji()} {String(sukuMood || 'happy').toUpperCase()}</Text>
        </View>
      </View>
      {smartNudge ? (
        <View style={styles.nudgeCard}>
          <Text style={styles.nudgeText}>{smartNudge}</Text>
        </View>
      ) : null}
      <View style={styles.topCard}>
        <Text style={styles.topTitle}>Nest ✨</Text>
        <Text style={styles.topSubtitle}>
          {activePartner ? `Chatting with ${activePartner.name}` : 'No contacts found yet'}
        </Text>
        <View style={styles.greetingChipRow}>
          <Text style={styles.greetingChip}>Good vibes only</Text>
          <Text style={styles.greetingChip}>Send love</Text>
        </View>
      </View>
      <View style={styles.thoughtCard}>
        <Text style={styles.thoughtTitle}>Thought of the day</Text>
        <Text style={styles.thoughtText}>{thoughtOfTheDay}</Text>
        <Text style={styles.sparkleText}>✦ ✧ ✦</Text>
      </View>
      <GiftedChat
        messages={messages}
        onSend={messages => onSend(messages)}
        user={{
          _id: currentUser?.id || 1,
          name: currentUser?.name || 'User',
          avatar: currentUser?.profilePicture,
        }}
        renderCustomView={props => {
          const message = props.currentMessage as CustomMessage;
          if (message?.user._id === 'suku' && message.customView) {
            return message.customView;
          }
          return null;
        }}
        renderBubble={props => {
          const message = props.currentMessage as CustomMessage;
          if (message?.user._id === 'suku' && message.customView) {
            return message.customView;
          }
          return undefined;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sukuPanel: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1D7E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sukuAvatarOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sukuGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFFAA',
  },
  sukuAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#F6F2FA',
  },
  sukuAvatarImage: {
    width: '100%',
    height: '100%',
  },
  sukuInfo: {
    flex: 1,
  },
  moodChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFD7E4',
  },
  moodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7B3A61',
  },
  sukuName: {
    fontSize: 15,
    fontWeight: '700',
  },
  sukuMoodText: {
    fontSize: 12,
    color: '#6D6D6D',
    marginTop: 2,
  },
  nudgeCard: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFF2C9',
    borderWidth: 1,
    borderColor: '#F2D98B',
  },
  nudgeText: {
    color: '#785A00',
    fontSize: 13,
    fontWeight: '600',
  },
  topCard: {
    marginHorizontal: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FDE9F3',
    borderWidth: 1,
    borderColor: '#F7BCD8',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#833B63',
  },
  topSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B4B5B',
  },
  greetingChipRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  greetingChip: {
    fontSize: 11,
    color: '#7B2F5E',
    backgroundColor: '#FFE3F1',
    borderWidth: 1,
    borderColor: '#F6B8D7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thoughtCard: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#E8F4FF',
    borderWidth: 1,
    borderColor: '#CDE8FF',
  },
  thoughtTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F5B8D',
    marginBottom: 4,
  },
  thoughtText: {
    fontSize: 13,
    color: '#2C3A4A',
  },
  sparkleText: {
    marginTop: 8,
    color: '#3A76A8',
    fontSize: 12,
    letterSpacing: 2,
  },
});
