import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';

interface SukuBubbleProps {
  message: string;
  emotion: string;
  animation?: string;
}

export const SukuBubble: React.FC<SukuBubbleProps> = ({
  message,
  emotion,
  animation,
}) => {
  const bounceAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(bounceAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, []);

  const getEmotionStyle = () => {
    switch (emotion) {
      case 'happy':
        return styles.happy;
      case 'love':
        return styles.love;
      case 'angry':
        return styles.angry;
      case 'sad':
        return styles.sad;
      default:
        return styles.default;
    }
  };

  const getEmoji = () => {
    switch (emotion) {
      case 'love':
        return 'Suku: 💖✨';
      case 'angry':
        return 'Suku: 😠';
      case 'sad':
        return 'Suku: 😢';
      case 'happy':
        return 'Suku: 🌟';
      default:
        return 'Suku: 🤖';
    }
  };

  // Animation JSON assets are not present yet in this repo.
  // Return null so UI renders without crashing until assets are added.
  const getAnimationSource = () => null;

  return (
    <Animated.View
      style={[
        styles.container,
        getEmotionStyle(),
        {
          transform: [
            {
              scale: bounceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.badgeRow}>
        <Text style={styles.badge}>Suku says</Text>
      </View>
      <View style={styles.avatarRow}>
        <View style={styles.avatarOuter}>
          <View style={styles.avatarGlow} />
          <Image source={require('../../assets/suku-figurine.png')} style={styles.avatar} />
        </View>
      </View>
      <Text style={styles.title}>{getEmoji()}</Text>
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>{message}</Text>
      </View>
      <View style={styles.tail} />
      {/* Lottie disabled for cross-platform preview stability */}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
    borderRadius: 20,
    padding: 15,
    maxWidth: '80%',
  },
  messageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 10,
  },
  badgeRow: {
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: '700',
    color: '#7B2D58',
    backgroundColor: '#FFE5F1',
  },
  avatarRow: {
    marginBottom: 8,
  },
  avatarOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9EAF3',
  },
  avatarGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFFB5',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F5F1F8',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B3A00',
    marginBottom: 6,
  },
  tail: {
    position: 'absolute',
    left: 14,
    bottom: -8,
    width: 14,
    height: 14,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    opacity: 0.92,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  default: {
    backgroundColor: '#E8F5FF',
  },
  happy: {
    backgroundColor: '#FFE8A3',
  },
  love: {
    backgroundColor: '#FFD6E5',
  },
  angry: {
    backgroundColor: '#FFD6D6',
  },
  sad: {
    backgroundColor: '#E8E8FF',
  },
});
