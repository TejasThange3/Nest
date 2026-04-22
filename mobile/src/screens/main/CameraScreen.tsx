import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { Camera, CameraType, CameraView } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import Slider from '@react-native-community/slider';
import { filters, FilterOptions, defaultFilterOptions, applyFilter } from '../../utils/filters';

interface CameraScreenProps {
  navigation: any;
}

export default function CameraScreen({ navigation }: CameraScreenProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState<'front' | 'back'>('back');
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [faces, setFaces] = useState<FaceDetector.FaceFeature[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(defaultFilterOptions);
  const [selectedFilter, setSelectedFilter] = useState('normal');
  const [photo, setPhoto] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleFacesDetected = ({ faces }: { faces: FaceDetector.FaceFeature[] }) => {
    setFaces(faces);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      const filteredPhoto = await applyFilter(photo.uri, filterOptions);
      setPhoto(filteredPhoto);
    }
  };

  const applySelectedFilter = async (filterName: string) => {
    setSelectedFilter(filterName);
    setFilterOptions(filters[filterName as keyof typeof filters]);
  };

  const savePhoto = async () => {
    if (photo) {
      // TODO: Implement photo saving and sharing
      navigation.navigate('Chat', { sharedPhoto: photo });
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBanner}>
        <Text style={styles.topTitle}>Nest Camera</Text>
        <Text style={styles.topSubtitle}>Capture moments with cute filters ✨</Text>
      </View>
      {photo ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.preview} />
          <View style={styles.filterControls}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {Object.keys(filters).map((filterName) => (
                <TouchableOpacity
                  key={filterName}
                  style={[
                    styles.filterButton,
                    selectedFilter === filterName && styles.selectedFilter,
                  ]}
                  onPress={() => applySelectedFilter(filterName)}
                >
                  <Text style={styles.filterText}>{filterName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.previewButtons}>
            <TouchableOpacity style={styles.button} onPress={() => setPhoto(null)}>
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={savePhoto}>
              <Text style={styles.buttonText}>Save & Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={type}
            flash={flash}
          >
            {faces.map((face, index) => (
              <View
                key={index}
                style={[
                  styles.faceBox,
                  {
                    transform: [
                      { perspective: 600 },
                      { rotateZ: `${face.rollAngle}deg` },
                    ],
                    left: face.bounds.origin.x,
                    top: face.bounds.origin.y,
                    width: face.bounds.size.width,
                    height: face.bounds.size.height,
                  },
                ]}
              />
            ))}
          </CameraView>
          <View style={styles.controls}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setType(type === 'back' ? 'front' : 'back');
              }}
            >
              <Text style={styles.buttonText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.captureButton]} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                setFlash(
                  flash === 'off' ? 'on' : 'off'
                );
              }}
            >
              <Text style={styles.buttonText}>
                Flash {flash === 'off' ? 'Off' : 'On'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  topBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  topSubtitle: {
    color: '#F4D7EA',
    fontSize: 12,
    marginTop: 2,
  },
  camera: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    padding: 5,
  },
  captureButtonInner: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 30,
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  previewButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  filterControls: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: 10,
  },
  filterButton: {
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
  },
  selectedFilter: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterText: {
    color: 'white',
  },
  faceBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'yellow',
    borderRadius: 5,
  },
});
