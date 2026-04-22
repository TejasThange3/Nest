import { GLView } from 'expo-gl';
import { Animated } from 'react-native';
import { vec2 } from 'gl-matrix';

export interface AdvancedFilterEffect {
  id: string;
  name: string;
  type: 'shader' | 'overlay' | 'animation' | 'combined';
  shaderCode?: string;
  overlayAsset?: any;
  animationConfig?: {
    duration: number;
    frames?: number;
    loop?: boolean;
  };
  params?: {
    intensity?: number;
    color?: string;
    speed?: number;
  };
}

// Shader for the cartoon effect (similar to Snapchat's cartoon style)
const cartoonShader = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D texture;
  uniform float intensity;

  void main() {
    vec4 color = texture2D(texture, uv);
    float edge = length(vec2(
      dFdx(color.rgb),
      dFdy(color.rgb)
    ));
    
    vec3 cartoon = floor(color.rgb * 5.0) / 5.0;
    cartoon = mix(cartoon, color.rgb, smoothstep(0.0, 0.2, edge));
    
    gl_FragColor = vec4(cartoon, color.a);
  }
`;

// Shader for the galaxy effect
const galaxyShader = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D texture;
  uniform float time;
  uniform float intensity;

  void main() {
    vec4 color = texture2D(texture, uv);
    vec2 center = vec2(0.5, 0.5);
    float dist = length(uv - center);
    
    // Add swirling effect
    float angle = atan(uv.y - center.y, uv.x - center.x);
    float spiral = sin(dist * 20.0 - time * 2.0) * 0.5 + 0.5;
    
    // Add stars
    float stars = step(0.98, fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453123));
    
    vec3 galaxyColor = mix(
      color.rgb,
      vec3(0.5, 0.0, 1.0) * spiral + vec3(stars),
      intensity * 0.7
    );
    
    gl_FragColor = vec4(galaxyColor, color.a);
  }
`;

// Shader for the neon effect
const neonShader = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D texture;
  uniform vec3 neonColor;
  uniform float intensity;

  void main() {
    vec4 color = texture2D(texture, uv);
    float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float edge = length(vec2(
      dFdx(brightness),
      dFdy(brightness)
    ));
    
    vec3 neon = color.rgb + edge * neonColor * intensity * 2.0;
    neon = mix(color.rgb, neon, intensity);
    
    gl_FragColor = vec4(neon, color.a);
  }
`;

// Rainbow animation effect
export const createRainbowAnimation = (duration: number = 3000) => {
  const animation = new Animated.Value(0);
  
  Animated.loop(
    Animated.sequence([
      Animated.timing(animation, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(animation, {
        toValue: 0,
        duration,
        useNativeDriver: false,
      }),
    ])
  ).start();

  return animation;
};

export const filters: Record<string, AdvancedFilterEffect> = {
  cartoon: {
    id: 'cartoon',
    name: 'Cartoon Style',
    type: 'shader',
    shaderCode: cartoonShader,
    params: {
      intensity: 0.8,
    },
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy Dreams',
    type: 'combined',
    shaderCode: galaxyShader,
    params: {
      intensity: 0.7,
      speed: 1.0,
    },
  },
  neon: {
    id: 'neon',
    name: 'Neon Glow',
    type: 'shader',
    shaderCode: neonShader,
    params: {
      intensity: 0.6,
      color: '#00ff77',
    },
  },
  angel: {
    id: 'angel',
    name: 'Angel Vibes',
    type: 'combined',
    overlayAsset: require('../assets/filters/angel.png'),
    animationConfig: {
      duration: 2000,
      loop: true,
    },
  },
  devil: {
    id: 'devil',
    name: 'Devil Horns',
    type: 'combined',
    overlayAsset: require('../assets/filters/devil.png'),
    animationConfig: {
      duration: 1500,
      loop: true,
    },
  },
  sparkles: {
    id: 'sparkles',
    name: 'Sparkle Magic',
    type: 'animation',
    animationConfig: {
      duration: 2000,
      frames: 30,
      loop: true,
    },
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Aura',
    type: 'animation',
    animationConfig: {
      duration: 3000,
      loop: true,
    },
  },
};

// Helper function to apply shader effects
export const applyShaderEffect = (gl: WebGLRenderingContext, effect: AdvancedFilterEffect, texture: WebGLTexture) => {
  // Implementation of shader application
  // This would include setting up vertex/fragment shaders, uniforms, etc.
};

// Helper function to create particle effects (for sparkles, hearts, etc.)
export const createParticleEffect = (count: number, spread: number) => {
  const particles = Array.from({ length: count }, () => ({
    position: vec2.fromValues(
      Math.random() * spread - spread / 2,
      Math.random() * spread - spread / 2
    ),
    velocity: vec2.fromValues(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ),
    size: Math.random() * 3 + 1,
    life: 1.0,
  }));

  return particles;
};
