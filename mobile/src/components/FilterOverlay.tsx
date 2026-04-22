import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { FaceFeature } from 'expo-face-detector';

interface FilterOverlayProps {
  face: FaceFeature;
  filterType: 
    | 'dog' 
    | 'cat' 
    | 'butterfly' 
    | 'crown' 
    | 'glasses'
    | 'angel'
    | 'devil'
    | 'sparkles'
    | 'hearts'
    | 'cartoon'
    | 'galaxy'
    | 'neon'
    | 'glitch'
    | 'rainbow';
  filterIntensity?: number;
}

export const FilterOverlay: React.FC<FilterOverlayProps> = ({ face, filterType }) => {
  const getFilterImage = () => {
    switch (filterType) {
      case 'dog':
        return require('../../assets/filters/dog.png');
      case 'cat':
        return require('../../assets/filters/cat.png');
      case 'butterfly':
        return require('../../assets/filters/butterfly.png');
      case 'crown':
        return require('../../assets/filters/crown.png');
      case 'glasses':
        return require('../../assets/filters/glasses.png');
      default:
        return null;
    }
  };

  const getFilterPosition = () => {
    switch (filterType) {
      case 'dog':
      case 'cat':
        return {
          width: face.bounds.size.width * 1.5,
          height: face.bounds.size.height * 1.2,
          left: face.bounds.origin.x - face.bounds.size.width * 0.25,
          top: face.bounds.origin.y - face.bounds.size.height * 0.2,
        };
      case 'butterfly':
        return {
          width: face.bounds.size.width * 0.8,
          height: face.bounds.size.height * 0.8,
          left: face.bounds.origin.x + face.bounds.size.width * 0.1,
          top: face.bounds.origin.y - face.bounds.size.height * 0.4,
        };
      case 'crown':
        return {
          width: face.bounds.size.width * 1.2,
          height: face.bounds.size.height * 0.6,
          left: face.bounds.origin.x - face.bounds.size.width * 0.1,
          top: face.bounds.origin.y - face.bounds.size.height * 0.5,
        };
      case 'glasses':
        return {
          width: face.bounds.size.width * 1.1,
          height: face.bounds.size.height * 0.3,
          left: face.bounds.origin.x - face.bounds.size.width * 0.05,
          top: face.bounds.origin.y + face.bounds.size.height * 0.2,
        };
      default:
        return {};
    }
  };

  const filterImage = getFilterImage();
  if (!filterImage) return null;

  return (
    <View style={[styles.filterContainer, getFilterPosition()]}>
      <Image
        source={filterImage}
        style={styles.filterImage}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterImage: {
    width: '100%',
    height: '100%',
  },
});
