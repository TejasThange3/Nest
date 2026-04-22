import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  Text,
  Modal,
  Animated,
} from 'react-native';
import Icon from '@expo/vector-icons/MaterialIcons';

interface CallButtonProps {
  onVideoCall: () => void;
  onAudioCall: () => void;
}

export const CallButton: React.FC<CallButtonProps> = ({
  onVideoCall,
  onAudioCall,
}) => {
  const [modalVisible, setModalVisible] = React.useState(false);
  const scaleValue = React.useRef(new Animated.Value(0)).current;

  const showModal = () => {
    setModalVisible(true);
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const hideModal = () => {
    Animated.timing(scaleValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setModalVisible(false));
  };

  const handleCallOption = (type: 'video' | 'audio') => {
    hideModal();
    if (type === 'video') {
      onVideoCall();
    } else {
      onAudioCall();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.callButton}
        onPress={showModal}
      >
        <Icon name="call" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={modalVisible}
        onRequestClose={hideModal}
        animationType="fade"
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideModal}
        >
          <Animated.View
            style={[
              styles.callOptions,
              {
                transform: [{ scale: scaleValue }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.optionButton, styles.videoCall]}
              onPress={() => handleCallOption('video')}
            >
              <Icon name="videocam" size={24} color="#fff" />
              <Text style={styles.optionText}>Video Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.audioCall]}
              onPress={() => handleCallOption('audio')}
            >
              <Icon name="phone" size={24} color="#fff" />
              <Text style={styles.optionText}>Audio Call</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callOptions: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
  },
  videoCall: {
    backgroundColor: '#2196F3',
  },
  audioCall: {
    backgroundColor: '#4CAF50',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
});
