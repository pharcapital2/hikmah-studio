// Tipe & konstanta sinematografi. Lihat docs/CINEMATOGRAPHY.md
export type ShotSize = 'EWS' | 'WS' | 'MS' | 'MCU' | 'CU' | 'ECU';
export type ShotAngle = 'eye' | 'low' | 'high' | 'dutch' | 'aerial' | 'ots';
export type CameraMove =
  | 'static'
  | 'pushIn'
  | 'pullOut'
  | 'panL'
  | 'panR'
  | 'tilt'
  | 'orbit'
  | 'track'
  | 'crane'
  | 'handheld'
  | 'microPush'
  | 'slowPull'
  | 'dollyTrack'
  | 'pushTiltProp'
  | 'axialPunch'
  | 'craneBack';
export type AnchorKey = 'wide' | 'medium' | 'close' | 'overShoulder' | 'lowAngle' | 'aerial';
export type HeadroomStyle = 'normal' | 'tight' | 'oppressive' | 'propTop';
export type ShotElevation = 'wormEye' | 'low' | 'eye' | 'high';
export type ShotImpactFx = 'none' | 'speedlines';

export interface Shot {
  id: string;
  target: string; // castId atau 'location'
  size: ShotSize;
  angle: ShotAngle;
  move: CameraMove;
  lensMm: number;
  startSec: number;
  durSec: number;
  motive: string; // alasan artistik, WAJIB diisi jika ada gerak
  /** Kunci anchor di WorldLocation.cameraAnchors */
  anchor?: AnchorKey;
  /** Azimut kamera terhadap garis axis (0..180 = satu sisi axis 180°) */
  azimuthDeg?: number;
  /** castId lawan bicara untuk framing OTS */
  over?: string;
  /** Menandakan shot adalah Two-Shot (membidik kedua karakter di layar) */
  twoShot?: boolean;
  /** Override pose kamera manual (mis. hasil Free-Cam Studio) */
  cameraOverride?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
  /** Sisi kamera terhadap axis 180° (+1 atau -1) */
  cameraSide?: 1 | -1;
  /** Gaya headroom vertikal 9:16 untuk nuansa psikologis / prop */
  headroom?: HeadroomStyle;
  /** Elevasi kamera eksplisit terhadap ketinggian kepala subjek */
  elevation?: ShotElevation;
  /** Kemiringan roll Dutch (derajat, mis. -8) */
  dutchDeg?: number;
  /** Efek visual 2D saat momen impact/klimaks */
  impactFx?: ShotImpactFx;
  /** Nonaktifkan DoF blur agar seluruh kedalaman tetap tajam (deep focus) */
  deepFocus?: boolean;
}

export const SIZE_ORDER: ShotSize[] = ['EWS', 'WS', 'MS', 'MCU', 'CU', 'ECU'];
export const sizeIndex = (s: ShotSize): number => SIZE_ORDER.indexOf(s);

/** Jarak kamera ke subjek (meter) per ukuran shot. */
export const SIZE_DISTANCE: Record<ShotSize, number> = {
  EWS: 45,
  WS: 11,
  MS: 4.2,
  MCU: 2.6,
  CU: 1.5,
  ECU: 0.75,
};

/** Tinggi mata / titik referensi tubuh dewasa 1.7m (meter). */
export const SUBJECT_EYE_HEIGHT = 1.56;
export const SUBJECT_HEAD_TOP = 1.72;

/** Tinggi titik bidik dasar (meter) per ukuran shot sebelum kompensasi headroom. */
export const SIZE_AIM_HEIGHT: Record<ShotSize, number> = {
  EWS: 1.4,
  WS: 1.15,
  MS: 1.22,
  MCU: 1.38,
  CU: 1.50,
  ECU: 1.56,
};

export const DEFAULT_LENS: Record<ShotSize, number> = {
  EWS: 24,
  WS: 28,
  MS: 40,
  MCU: 50,
  CU: 70,
  ECU: 85,
};

// Tinggi sensor virtual untuk video vertikal 9:16 (portrait full-frame: 36mm tinggi x 20.25mm lebar)
export const SENSOR_HEIGHT_MM = 36;

export const lensToFov = (mm: number): number =>
  (2 * Math.atan(SENSOR_HEIGHT_MM / (2 * mm)) * 180) / Math.PI;

export const MIN_SHOT_SEC = 2;
export const MAX_SHOT_SEC = 6;
export const REACTION_MIN_SEC = 0.8;
export const REACTION_MAX_SEC = 1.5;
export const MAX_PUSH_SPEED = 1.5; // m/s (docs/CINEMATOGRAPHY.md aturan #6)

/**
 * Smoothstep ease-in-out (peak velocity 1.5x average).
 *
 * The previous cubic ease peaked at 3x average speed mid-move, which made
 * crane shots and character walks jump >0.35 m per frame at 15 fps (audit
 * camera-continuity FAIL) and made an 18 m / 10 s bridge walk look like a
 * sprint (peak ~5.4 m/s). Smoothstep keeps the same ease-in/out feel with
 * half the peak speed, so camera and walk paths stay under the continuity
 * threshold and read as calm, motivated movement.
 */
export const easeInOut = (t: number): number => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
