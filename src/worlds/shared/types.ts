import type { ReactNode } from 'react';

export type Vec3 = [number, number, number];
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type Weather = 'clear' | 'rain' | 'fog';
export type Ambience =
  | 'rooster'
  | 'traffic'
  | 'river'
  | 'wind'
  | 'crowd'
  | 'birds'
  | 'rain'
  | 'market'
  | 'night'
  | 'silence'
  | (string & {});

export interface CameraAnchor {
  position: Vec3;
  target: Vec3;
  fov?: number;
}

export interface CameraAnchors {
  wide: CameraAnchor;
  medium: CameraAnchor;
  close: CameraAnchor;
  overShoulder: CameraAnchor;
  lowAngle: CameraAnchor;
  aerial: CameraAnchor;
}

export interface SpawnPoint {
  id: string;
  position: Vec3;
  facing: number;
}

/** Lingkaran halangan (pohon/tiang/bangunan) di koordinat dunia (x, z). */
export interface ObstacleCircle {
  x: number;
  z: number;
  r: number;
  /** Tinggi minimum kamera (meter di atas groundY) agar bisa melewati atas obstacle. */
  h?: number;
}

export interface StagingSlot {
  id: string;
  position: Vec3;
  facing: number;
  defaultAction?: 'idle' | 'sit' | 'walk' | 'pray';
  targetPos?: Vec3;
  surfaceOffset?: number;
}

export interface StagingPreset {
  id: string;
  label: string;
  mode: 'dialogue' | 'walk-together' | 'solo' | 'pray';
  slots: StagingSlot[];
  /** Sisi kamera aman terhadap axis A->B (+1 atau -1) */
  safeCameraSide?: 1 | -1;
  recommendedAnchors?: Partial<CameraAnchors>;
}

export interface WorldLocation {
  id: string;
  label: string;
  position: Vec3;
  facing: number;
  cameraAnchors: CameraAnchors;
  spawnPoints: SpawnPoint[];
  ambience: Ambience;
  /** Halangan solid di sekitar lokasi (pohon, tiang, bangunan) untuk penghindaran kamera. */
  obstacles?: ObstacleCircle[];
  /** Ketinggian terrain minimal di lokasi ini (meter) — kamera tidak boleh di bawah groundY + 0.8. */
  groundY?: number;
  /** Preset posisi & hadap karakter terverifikasi bebas tabrakan untuk lokasi ini. */
  stagingPresets?: StagingPreset[];
}

/** Props every Map component must accept. `time` = seconds (frame/fps), drives all animation. */
export interface WorldProps {
  timeOfDay: TimeOfDay;
  weather: Weather;
  /** Seconds (or frame/fps in Remotion). If omitted in live preview, animated leaves use useFrame clock directly for 60 FPS with 0 React re-renders. */
  time?: number;
  seed?: number;
  children?: ReactNode;
}

export interface WorldModule {
  registry: WorldLocation[];
}
