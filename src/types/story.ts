export type CharacterExpression =
  | 'idle'
  | 'talking'
  | 'angry'
  | 'shocked'
  | 'drinking';

export type CameraMovementType =
  | 'crashZoom'
  | 'orbitPan'
  | 'topDownReveal'
  | 'cameraShake'
  | 'steadyTrack';

export type SceneType = 'narrative' | 'hikmah' | 'dalil';

export type WeatherPreset = 'clear' | 'overcast' | 'rain' | 'storm' | 'golden';

export interface WeatherConfig {
  preset: WeatherPreset;
  rainIntensity: number; // 0..1
  fogDensity: number; // 0..0.08
  mudflowActive: boolean;
  mudflowSpeed: number;
  lightningFlash?: boolean;
  windStrength: number;
}

export interface CameraConfig {
  mode: CameraMovementType;
  position: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  orbitSpeed?: number;
  zoomTargetFov?: number;
  shakeIntensity?: number;
  damping?: number;
}

export interface CharacterSceneState {
  id: string;
  name: string;
  role: string;
  position: [number, number, number];
  targetPosition?: [number, number, number];
  expression: CharacterExpression;
  isSpeaking?: boolean;
  statusIcon?: string;
  facing?: 'left' | 'right' | 'back';
  propOverlay?: 'clock02';
  scale?: number;
}

export interface HikmahCardData {
  title: string;
  points: string[];
}

export interface DalilCardData {
  arabic: string;
  transliteration?: string;
  translation: string;
  source: string;
}

export interface StoryScene {
  id: string;
  index: number;
  title: string;
  sceneType: SceneType;
  startTime: number;
  duration: number;
  speakerName?: string;
  subtitleText: string;
  camera: CameraConfig;
  weather: WeatherConfig;
  characters: CharacterSceneState[];
  focalProp?: 'boulder' | 'house' | 'road' | 'stream';
  showDebris?: boolean;
  hikmahData?: HikmahCardData;
  dalilData?: DalilCardData;
}

export interface CharacterProfile {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  headwear: 'peci' | 'peci-white' | 'sorban' | 'caping' | 'hijab';
  beard?: boolean;
  sash?: boolean;
}

export interface StoryScript {
  id: string;
  title: string;
  themeValue: string;
  summary: string;
  totalDuration: number;
  characterProfiles: Record<string, CharacterProfile>;
  scenes: StoryScene[];
}

export interface VillageLocationPreset {
  id: string;
  label: string;
  icon: string;
  description: string;
  camera: CameraConfig;
}
