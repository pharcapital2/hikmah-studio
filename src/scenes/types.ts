import type { Ambience, TimeOfDay, Vec3, Weather } from '../worlds/shared/types';
import type { Shot } from '../cinematography/shotTypes';
import type { CharacterAction } from '../cast/animations';
import type { Emotion } from '../cast/characters';

export interface ActionSegment {
  startSec: number;
  durSec: number;
  action: CharacterAction;
  emotion: Emotion;
  speaking?: boolean;
  listening?: boolean;
  targetPos?: Vec3;
}

export interface CastPlacement {
  castId: string;
  name: string;
  slotId?: string;
  initialPos?: Vec3;
  targetPos?: Vec3;
  facing?: number;
  yOffset?: number;
  snapToGround?: boolean;
  defaultAction: CharacterAction;
  defaultEmotion: Emotion;
  timeline?: ActionSegment[];
}

export interface SceneDialogue {
  id: string;
  speakerId: string;
  speakerName: string;
  startSec: number;
  durSec: number;
  text: string;
  emotion?: Emotion;
}

export interface HikmahCardInfo {
  title: string;
  points: string[];
}

export interface DalilCardInfo {
  arabic: string;
  transliteration?: string;
  translation: string;
  source: string;
}

export interface ProductionScene {
  id: string;
  title: string;
  worldId: 'village' | 'city';
  locationId: string;
  stagingPresetId?: string;
  cameraSide?: 1 | -1;
  timeOfDay: TimeOfDay;
  weather: Weather;
  ambience: Ambience;
  startSec: number;
  durationSec: number;
  cast: CastPlacement[];
  axis?: [string, string];
  shots: Shot[];
  dialogue: SceneDialogue[];
  hikmahCard?: HikmahCardInfo;
  dalilCard?: DalilCardInfo;
  /** Ajakan komentar di akhir video (tampil di bawah kartu hikmah/dalil). */
  commentPrompt?: string;
}

export interface ProductionStory {
  id: string;
  title: string;
  theme: string;
  summary: string;
  totalDurationSec: number;
  cinematographyStyle?: 'default' | 'dramatic-shorts';
  scenes: ProductionScene[];
}
