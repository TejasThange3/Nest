import { FaceFeature } from 'expo-face-detector';

export interface CameraType {
  back: 'back';
  front: 'front';
}

export interface FlashMode {
  on: 'on';
  off: 'off';
  auto: 'auto';
  torch: 'torch';
}

export interface CameraConstants {
  Type: CameraType;
  FlashMode: FlashMode;
}

export interface FaceDetectionResult {
  faces: FaceFeature[];
}

export interface CameraProps {
  type: keyof CameraType;
  flashMode: keyof FlashMode;
  onFacesDetected: (result: FaceDetectionResult) => void;
  faceDetectorSettings: any;
  style: any;
  ref: any;
}
