import type { Ambience, StagingPreset, Vec3, WorldLocation } from '../shared/types';
import { facingToward } from '../shared/spatial';
import { BLOCK_SIZE, FLYOVER, MARKET, PARK, ROAD_WIDTH, SIDEWALK_H } from './layout';
import { citySurfaceY } from './spatial';

/**
 * Bangun lokasi di trotoar/plaza depan gedung dengan `facing` mengarah ke jalan terbuka.
 * Semua anchor `wide/medium/close/lowAngle` berada di ruang jalan/plaza terbuka (+facing)
 * sehingga kamera tidak pernah menembus bangunan.
 */
function loc(
  id: string,
  label: string,
  x: number,
  z: number,
  facing: number,
  s: number,
  ambience: Ambience,
  baseY = 0,
  stagingPresets?: StagingPreset[],
): WorldLocation {
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  const rx = fz;
  const rz = -fx;
  const P = (d: number, side: number, y: number): Vec3 => [
    x + fx * d + rx * side,
    baseY + y,
    z + fz * d + rz * side,
  ];
  const ty = baseY + 1.6;
  const T: Vec3 = [x, ty, z];
  const groundY = baseY > 0 ? baseY : SIDEWALK_H;
  return {
    id,
    label,
    position: [x, baseY, z],
    facing,
    ambience,
    groundY,
    stagingPresets,
    cameraAnchors: {
      wide: { position: P(12, 4, 7.5 + s * 0.15), target: [x - fx * 6, ty + 3.5, z - fz * 6] },
      medium: { position: P(6.5, 1.8, 2.4), target: T },
      close: { position: P(3.0, 0.6, 1.68), target: T },
      overShoulder: { position: P(-1.4, 0.65, 1.85), target: [x + fx * 6, ty, z + fz * 6] },
      lowAngle: { position: P(8.0, 1.5, 0.55), target: [x - fx * 4, ty + 5 + s * 0.2, z - fz * 4] },
      aerial: { position: P(20, 14, 42 + s * 1.2), target: [x, baseY, z] },
    },
    spawnPoints: [
      { id: `${id}-a`, position: [x - rx * 1.2, baseY + 0.18, z - rz * 1.2], facing },
      { id: `${id}-b`, position: [x + rx * 1.2, baseY + 0.18, z + rz * 1.2], facing: facing + Math.PI },
      { id: `${id}-c`, position: [x + fx * 1.2, baseY + 0.18, z + fz * 1.2], facing: facing + Math.PI / 2 },
    ],
  };
}

const hr = ROAD_WIDTH / 2;
const edge = hr + 1.6;

const ptC = (x: number, z: number, preferFlyover = false): Vec3 => [
  x,
  citySurfaceY(x, z, { preferFlyover }),
  z,
];

const CENTRAL_CROSSROADS_PRESETS: StagingPreset[] = [
  {
    id: 'corner-talk',
    label: 'Dialog di Trotoar Perempatan Pusat',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(-9.2, 9.6), facing: facingToward([-9.2, 9.6], [-11.2, 8.8]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptC(-11.2, 8.8), facing: facingToward([-11.2, 8.8], [-9.2, 9.6]), defaultAction: 'idle' },
    ],
  },
];

const CENTRAL_PARK_PRESETS: StagingPreset[] = [
  {
    id: 'fountain-walk',
    label: 'Berjalan Menuju Air Mancur Taman',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(49.2, 34.5), targetPos: ptC(49.2, 41.0), facing: 0, defaultAction: 'walk' },
      { id: 'slot-b', position: ptC(50.6, 34.0), targetPos: ptC(50.6, 40.5), facing: 0, defaultAction: 'walk' },
    ],
  },
  {
    id: 'park-talk',
    label: 'Berbincang di Jalur Taman Kota',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(48.8, 36.2), facing: facingToward([48.8, 36.2], [51.0, 36.8]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptC(51.0, 36.8), facing: facingToward([51.0, 36.8], [48.8, 36.2]), defaultAction: 'idle' },
    ],
  },
];

const STREET_MARKET_PRESETS: StagingPreset[] = [
  {
    id: 'market-talk',
    label: 'Dialog di Pasar Kaki Lima',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(-151.0, 20.5), facing: facingToward([-151.0, 20.5], [-148.8, 21.2]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptC(-148.8, 21.2), facing: facingToward([-148.8, 21.2], [-151.0, 20.5]), defaultAction: 'idle' },
    ],
  },
  {
    id: 'market-walk',
    label: 'Berjalan di Lorong Pasar',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(-150.7, 17.5), targetPos: ptC(-150.7, 22.5), facing: 0, defaultAction: 'walk' },
      { id: 'slot-b', position: ptC(-149.3, 17.0), targetPos: ptC(-149.3, 22.0), facing: 0, defaultAction: 'walk' },
    ],
  },
];

const GRAND_MOSQUE_PRESETS: StagingPreset[] = [
  {
    id: 'plaza-walk',
    label: 'Berjalan di Pelataran Masjid Raya',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(49.2, -110.5), targetPos: ptC(49.2, -108.0), facing: 0, defaultAction: 'walk' },
      { id: 'slot-b', position: ptC(50.8, -110.5), targetPos: ptC(50.8, -108.0), facing: 0, defaultAction: 'walk' },
    ],
  },
  {
    id: 'plaza-talk',
    label: 'Dialog di Depan Masjid Raya',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(48.8, -108.6), facing: facingToward([48.8, -108.6], [51.2, -108.2]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptC(51.2, -108.2), facing: facingToward([51.2, -108.2], [48.8, -108.6]), defaultAction: 'idle' },
    ],
  },
];

const BUS_STOP_PRESETS: StagingPreset[] = [
  {
    id: 'halte-talk',
    label: 'Menunggu & Berbincang di Halte Bus',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptC(-151.2, 11.4), facing: facingToward([-151.2, 11.4], [-148.8, 11.4]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptC(-148.8, 11.4), facing: facingToward([-148.8, 11.4], [-151.2, 11.4]), defaultAction: 'idle' },
    ],
  },
];

const FLYOVER_PRESETS: StagingPreset[] = [
  {
    id: 'skyline-walk',
    label: 'Berjalan di Dek Flyover Kota',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      {
        id: 'slot-a',
        position: ptC(-4.0, -96.0, true),
        targetPos: ptC(4.0, -96.0, true),
        facing: Math.PI / 2,
        defaultAction: 'walk',
        surfaceOffset: FLYOVER.deckY,
      },
      {
        id: 'slot-b',
        position: ptC(-4.4, -97.4, true),
        targetPos: ptC(3.6, -97.4, true),
        facing: Math.PI / 2,
        defaultAction: 'walk',
        surfaceOffset: FLYOVER.deckY,
      },
    ],
  },
  {
    id: 'skyline-talk',
    label: 'Dialog di Flyover dengan Latar Kota',
    mode: 'dialogue',
    safeCameraSide: -1,
    slots: [
      {
        id: 'slot-a',
        position: ptC(-1.5, -95.8, true),
        facing: facingToward([-1.5, -95.8], [1.0, -96.2]),
        defaultAction: 'idle',
        surfaceOffset: FLYOVER.deckY,
      },
      {
        id: 'slot-b',
        position: ptC(1.0, -96.2, true),
        facing: facingToward([1.0, -96.2], [-1.5, -95.8]),
        defaultAction: 'idle',
        surfaceOffset: FLYOVER.deckY,
      },
    ],
  },
];

export const locations: WorldLocation[] = [
  loc('central-crossroads', 'Perempatan Pusat', -edge, edge, Math.PI * 0.25, 16, 'traffic', 0, CENTRAL_CROSSROADS_PRESETS),
  loc('downtown', 'Distrik Pencakar Langit', 50, -edge, 0, 26, 'traffic'),
  loc('city-mall', 'Mall Kota', -50, -edge, 0, 20, 'crowd'),
  loc('central-park', 'Taman Kota', PARK.x, PARK.z - 14, 0, 16, 'birds', 0, CENTRAL_PARK_PRESETS),
  loc('street-market', 'Pasar Kaki Lima', MARKET.x, MARKET.z - 26, 0, 16, 'market', 0, STREET_MARKET_PRESETS),
  loc('hospital', 'Rumah Sakit', 150, -edge, 0, 20, 'traffic'),
  loc('school', 'Sekolah', -150, -100 - edge, 0, 16, 'crowd'),
  loc('grand-mosque', 'Masjid Raya', 50, -100 - edge, 0, 18, 'wind', 0, GRAND_MOSQUE_PRESETS),
  loc('station', 'Stasiun Kereta', -50, 100 + edge, Math.PI, 18, 'crowd'),
  loc('bus-stop', 'Halte Bus', -150, hr + 1.5, 0, 10, 'traffic', 0, BUS_STOP_PRESETS),
  loc('flyover', 'Flyover Kota', 0, FLYOVER.z, Math.PI / 2, 16, 'traffic', FLYOVER.deckY, FLYOVER_PRESETS),
  loc('shop-street', 'Jalan Ruko', 200 + edge, 150, -Math.PI / 2, 14, 'traffic'),
  loc('residential-tower', 'Kawasan Apartemen', -200 - edge, -50, Math.PI / 2, 18, 'traffic'),
  loc('avenue-east', 'Jalan Raya Timur', 150, edge, Math.PI, 16, 'traffic'),
];

export const registry: WorldLocation[] = locations;
export const CITY_BLOCK_SIZE = BLOCK_SIZE;
