export class SukuMessageHandler {
  private static emotionMap: { [key: string]: { emotion: string, animation?: string } } = {
    'i love you': { emotion: 'love', animation: 'hearts' },
    'miss you': { emotion: 'sad', animation: 'hearts' },
    'angry': { emotion: 'angry', animation: 'thundercloud' },
    'mad': { emotion: 'angry', animation: 'thundercloud' },
    'happy': { emotion: 'happy', animation: 'stars' },
    'sad': { emotion: 'sad', animation: 'rain' },
    'congratulations': { emotion: 'celebrating', animation: 'sparkles' },
    'good morning': { emotion: 'happy', animation: 'rainbow' },
    'good night': { emotion: 'sleepy', animation: 'stars' },
  };

  private static greetingsByTime(name: string): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return `Good morning ${name}! 🌅`;
    } else if (hour < 17) {
      return `Good afternoon ${name}! ☀️`;
    } else if (hour < 22) {
      return `Good evening ${name}! 🌆`;
    } else {
      return `Good night ${name}! 🌙`;
    }
  }

  static analyzeMessage(message: string, userName: string): {
    content: string;
    emotion: string;
    animation?: string;
  } {
    message = message.toLowerCase();
    
    // Check for time-based greetings
    if (message.includes('greet')) {
      return {
        content: this.greetingsByTime(userName),
        emotion: 'happy',
        animation: 'sparkles'
      };
    }

    // Check for predefined emotions
    for (const [key, value] of Object.entries(this.emotionMap)) {
      if (message.includes(key)) {
        return {
          content: this.generateResponse(key, userName),
          emotion: value.emotion,
          animation: value.animation
        };
      }
    }

    // Default response
    return {
      content: `Hey ${userName}! How can I help you today?`,
      emotion: 'happy',
      animation: 'stars'
    };
  }

  private static generateResponse(trigger: string, userName: string): string {
    switch (trigger) {
      case 'i love you':
        return `${userName} loves you! 💕`;
      case 'angry':
      case 'mad':
        return `${userName} is mad at you! 😠`;
      case 'miss you':
        return `${userName} misses you so much! 💝`;
      case 'happy':
        return `${userName} is feeling happy! 😊`;
      case 'sad':
        return `${userName} is feeling down... 😢`;
      case 'congratulations':
        return `${userName} wants to congratulate you! 🎉`;
      default:
        return `Message from ${userName}!`;
    }
  }
}
