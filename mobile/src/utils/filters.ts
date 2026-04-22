import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export interface FilterOptions {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  smoothing: number;
}

export const defaultFilterOptions: FilterOptions = {
  brightness: 1,
  contrast: 1,
  saturation: 1,
  warmth: 1,
  smoothing: 0,
};

export const filters = {
  normal: { ...defaultFilterOptions },
  bright: {
    ...defaultFilterOptions,
    brightness: 1.2,
    contrast: 1.1,
  },
  warm: {
    ...defaultFilterOptions,
    warmth: 1.2,
    saturation: 1.1,
  },
  smooth: {
    ...defaultFilterOptions,
    smoothing: 0.3,
    brightness: 1.1,
  },
  vivid: {
    ...defaultFilterOptions,
    contrast: 1.2,
    saturation: 1.3,
  },
  dramatic: {
    ...defaultFilterOptions,
    contrast: 1.4,
    saturation: 0.9,
  },
};

export const applyFilter = async (uri: string, options: FilterOptions) => {
  try {
    const actions = [];

    // Actions must be of specific type
    if (options.brightness !== 1) {
      actions.push({ brightness: options.brightness });
    }
    if (options.contrast !== 1) {
      actions.push({ contrast: options.contrast });
    }
    if (options.saturation !== 1) {
      actions.push({ saturate: options.saturation });
    }
    if (options.warmth !== 1) {
      // Use tint for warmth effect
      actions.push({ tint: (options.warmth - 1) * 100 });
    }

    const result = await manipulateAsync(
      uri,
      actions as any[],
      { format: SaveFormat.JPEG }
    );
    return result.uri;
  } catch (error) {
    console.error('Error applying filter:', error);
    return uri;
  }
};
