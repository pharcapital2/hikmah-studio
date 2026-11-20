import type { Ambience, ObstacleCircle, StagingPreset, Vec3, WorldLocation } from '../shared/types';
import { facingToward } from '../shared/spatial';
import { BRIDGES, RICE, ZONES, heightAt } from './layout';
import { villageSurfaceY } from './spatial';

/** Bangun WorldLocation dengan cameraAnchors di atas permukaan terrain (`heightAt`). */
function makeLoc(
  id: string,
  label: string,
  x: number,
  z: number,
  facing: number,
  scale: number,
  ambience: Ambience,
  targetYOffset = 1.6,
  obstacles?: ObstacleCircle[],
  stagingPresets?: StagingPreset[],
): WorldLocation {
  const groundY = heightAt(x, z);
  const ty = groundY + targetYOffset;
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  const rx = fz;
  const rz = -fx;

  const P = (d: number, side: number, yAboveGround: number): Vec3 => {
    const px = x + fx * d + rx * side;
    const pz = z + fz * d + rz * side;
    const py = Math.max(heightAt(px, pz) + 0.5, groundY + yAboveGround);
    return [px, py, pz];
  };

  const T: Vec3 = [x, ty, z];
  const s1x = x - rx * 1.4, s1z = z - rz * 1.4;
  const s2x = x + rx * 1.4, s2z = z + rz * 1.4;
  const s3x = x + fx * 2.4, s3z = z + fz * 2.4;

  return {
    id,
    label,
    position: [x, groundY, z],
    facing,
    ambience,
    groundY,
    obstacles,
    stagingPresets,
    cameraAnchors: {
      wide: { position: P(-2.4 * scale, 0.6 * scale, 5 + scale * 0.45), target: [x, ty + 2.2, z], fov: 32 },
      medium: { position: P(-1.1 * scale, 0.28 * scale, 2.2 + scale * 0.14), target: T, fov: 45 },
      close: { position: P(-0.45 * scale, 0.12 * scale, 1.65), target: T, fov: 65 },
      overShoulder: {
        position: P(-0.75 * scale, 0.25 * scale, 1.75),
        target: [x + fx * scale * 0.5, ty, z + fz * scale * 0.5],
        fov: 55,
      },
      lowAngle: { position: P(-0.85 * scale, 0.2 * scale, 0.6), target: [x, ty + 3.5 + scale * 0.15, z], fov: 38 },
      aerial: { position: P(-1.8 * scale, 1.1 * scale, 28 + scale * 2.2), target: [x, groundY, z], fov: 35 },
    },
    spawnPoints: [
      { id: `${id}-a`, position: [s1x, heightAt(s1x, s1z), s1z], facing },
      { id: `${id}-b`, position: [s2x, heightAt(s2x, s2z), s2z], facing: facing + Math.PI },
      { id: `${id}-c`, position: [s3x, heightAt(s3x, s3z), s3z], facing: facing - Math.PI / 2 },
    ],
  };
}

// ─── Obstacles per lokasi ─────────────────────────────────────────────────────
// Ditulis manual berdasarkan posisi pohon/tiang di world yang deterministik.
// Radius (r) = setengah lebar batang + clearance kamera 0.3m.
// h = tinggi puncak obstacle (kamera dinaikkan di atas ini jika terlalu rendah).

/** Pohon-pohon tepi sungai di sekitar jembatan bambu (x=-95, z=74).
 *  Pohon tumbuh di tepi kiri dan kanan jembatan dengan seed deterministik. */
const BAMBOO_BRIDGE_OBSTACLES: ObstacleCircle[] = [
  // Pohon-pohon di tepi kiri (barat) jembatan bambu, seed ~1-5
  { x: -97.5, z: 70.0, r: 1.2, h: 5.0 },
  { x: -98.2, z: 73.5, r: 1.0, h: 4.5 },
  { x: -97.0, z: 77.0, r: 1.3, h: 5.5 },
  { x: -99.0, z: 80.5, r: 0.9, h: 4.0 },
  // Pohon-pohon di tepi kanan (timur) jembatan bambu
  { x: -92.5, z: 71.0, r: 1.1, h: 5.0 },
  { x: -91.8, z: 74.5, r: 1.0, h: 4.5 },
  { x: -92.0, z: 78.0, r: 1.2, h: 5.0 },
  // Semak/pohon kecil di area selatan jembatan
  { x: -95.5, z: 63.0, r: 0.8, h: 3.0 },
  { x: -94.0, z: 61.5, r: 0.9, h: 3.5 },
  { x: -97.0, z: 64.0, r: 0.8, h: 3.0 },
];

/** Pohon di area sawah bertingkat (x=RICE.center[0]-25) dan saung bambu. */
const RICE_TERRACES_OBSTACLES: ObstacleCircle[] = [
  // Saung-1 di x=116, z=-60, rot=0.4: tiang bambu 4 sudut (radius 0.2m)
  { x: 114.32, z: -60.38, r: 0.22, h: 3.0 },
  { x: 116.90, z: -61.47, r: 0.22, h: 3.0 },
  { x: 115.10, z: -58.53, r: 0.22, h: 3.0 },
  { x: 117.68, z: -59.62, r: 0.22, h: 3.0 },
  // Pohon-pohon di tepi sawah
  { x: 108.0, z: -58.0, r: 1.0, h: 5.0 },
  { x: 112.0, z: -55.0, r: 0.9, h: 4.5 },
  { x: 118.0, z: -63.0, r: 1.1, h: 5.0 },
  // Pohon area tengah
  { x: 105.0, z: -65.0, r: 1.2, h: 5.5 },
  { x: 110.0, z: -70.0, r: 1.0, h: 4.5 },
];

/** Tiang listrik & pohon di area pusat desa. */
const VILLAGE_CENTER_OBSTACLES: ObstacleCircle[] = [
  { x: 5.0,  z: -6.0,  r: 0.3, h: 7.0 },
  { x: 11.0, z: -4.0,  r: 0.3, h: 7.0 },
  { x: 8.0,  z: -10.0, r: 0.8, h: 4.0 },
  { x: 2.0,  z:  0.0,  r: 0.8, h: 4.0 },
];

/** Pohon & pagar di area masjid. */
const MOSQUE_OBSTACLES: ObstacleCircle[] = [
  { x: -18.0, z: -16.0, r: 1.0, h: 5.0 },
  { x: -25.0, z: -11.0, r: 1.0, h: 5.0 },
  { x: -20.0, z: -8.0,  r: 0.9, h: 4.5 },
];

// ─── Staging Presets per lokasi ───────────────────────────────────────────────

const ptV = (x: number, z: number): Vec3 => [x, villageSurfaceY(x, z), z];

const VILLAGE_CENTER_PRESETS: StagingPreset[] = [
  {
    id: 'alun-alun-talk',
    label: 'Dialog di Alun-alun',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(6.8, -4.0), facing: facingToward([6.8, -4.0], [9.2, -4.6]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptV(9.2, -4.6), facing: facingToward([9.2, -4.6], [6.8, -4.0]), defaultAction: 'idle' },
    ],
  },
  {
    id: 'alun-alun-walk',
    label: 'Berjalan di Alun-alun',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(5.5, -7.0), targetPos: ptV(5.5, -1.0), facing: 0, defaultAction: 'walk' },
      { id: 'slot-b', position: ptV(7.0, -7.4), targetPos: ptV(7.0, -1.4), facing: 0, defaultAction: 'walk' },
    ],
  },
];

const MOSQUE_PRESETS: StagingPreset[] = [
  {
    id: 'courtyard-walk',
    label: 'Melangkah ke Pelataran Masjid',
    mode: 'walk-together',
    safeCameraSide: -1,
    slots: [
      { id: 'slot-a', position: ptV(-23.2, 1.5), targetPos: ptV(-23.2, -3.5), facing: Math.PI, defaultAction: 'walk' },
      { id: 'slot-b', position: ptV(-21.2, 1.8), targetPos: ptV(-21.2, -3.2), facing: Math.PI, defaultAction: 'walk' },
    ],
  },
  {
    id: 'courtyard-pray',
    label: 'Berdoa di Pelataran Masjid',
    mode: 'pray',
    safeCameraSide: -1,
    slots: [
      { id: 'slot-a', position: ptV(-23.2, -3.5), facing: Math.PI, defaultAction: 'pray' },
      { id: 'slot-b', position: ptV(-21.2, -3.5), facing: Math.PI, defaultAction: 'pray' },
    ],
  },
];

const MARKET_PRESETS: StagingPreset[] = [
  {
    id: 'warung-chat',
    label: 'Obrolan di Depan Pasar',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(-24.8, 20.5), facing: facingToward([-24.8, 20.5], [-27.2, 21.2]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptV(-27.2, 21.2), facing: facingToward([-27.2, 21.2], [-24.8, 20.5]), defaultAction: 'idle' },
    ],
  },
];

const RIVER_BRIDGE_PRESETS: StagingPreset[] = [
  {
    id: 'bridge-talk',
    label: 'Duduk & Berbincang di Tepi Jembatan',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(8.25, 54.64), facing: facingToward([8.25, 54.64], [5.75, 53.36]), defaultAction: 'sit' },
      {
        id: 'slot-b',
        position: ptV(4.2, 51.8),
        targetPos: ptV(5.75, 53.36),
        facing: facingToward([5.75, 53.36], [8.25, 54.64]),
        defaultAction: 'walk',
      },
    ],
  },
];

const BAMBOO_BRIDGE_PRESETS: StagingPreset[] = [
  {
    id: 'bridge-walk',
    label: 'Menyeberangi Jembatan Bambu',
    mode: 'walk-together',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(-95.3, 65.0), targetPos: ptV(-95.3, 83.0), facing: 0, defaultAction: 'walk' },
      { id: 'slot-b', position: ptV(-94.7, 63.8), targetPos: ptV(-94.7, 81.8), facing: 0, defaultAction: 'walk' },
    ],
  },
];

const RICE_TERRACES_PRESETS: StagingPreset[] = [
  {
    id: 'saung-dialog',
    label: 'Dialog di Saung Sawah Berundak',
    mode: 'dialogue',
    safeCameraSide: -1,
    slots: [
      { id: 'slot-a', position: ptV(116.0, -60.0), facing: facingToward([116.0, -60.0], [114.2, -59.5]), defaultAction: 'sit' },
      { id: 'slot-b', position: ptV(114.2, -59.5), facing: facingToward([114.2, -59.5], [116.0, -60.0]), defaultAction: 'idle' },
    ],
    recommendedAnchors: {
      wide: {
        position: [111.5, villageSurfaceY(111.5, -55.2) + 2.4, -55.2],
        target: [115.1, villageSurfaceY(116.0, -60.0) + 0.9, -59.75],
        fov: 35,
      },
      medium: {
        position: [112.6, villageSurfaceY(112.6, -56.2) + 1.8, -56.2],
        target: [115.1, villageSurfaceY(116.0, -60.0) + 1.0, -59.75],
        fov: 45,
      },
    },
  },
];

const GARDEN_PRESETS: StagingPreset[] = [
  {
    id: 'kebun-talk',
    label: 'Dialog di Tepi Kebun Sayur',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(-35.0, -43.5), facing: facingToward([-35.0, -43.5], [-37.2, -44.2]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptV(-37.2, -44.2), facing: facingToward([-37.2, -44.2], [-35.0, -43.5]), defaultAction: 'idle' },
    ],
  },
];

/** Pohon tua pahlawan di tepi kebun (Konten 4) — batang besar di x=-38, z=-46.5. */
const GARDEN_OBSTACLES: ObstacleCircle[] = [
  { x: -38.0, z: -46.5, r: 1.2, h: 7.0 },
];

const HOUSES_WEST_PRESETS: StagingPreset[] = [
  {
    id: 'teras-talk',
    label: 'Berbincang di Permukiman Barat',
    mode: 'dialogue',
    safeCameraSide: 1,
    slots: [
      { id: 'slot-a', position: ptV(-63.0, -71.5), facing: facingToward([-63.0, -71.5], [-65.2, -72.2]), defaultAction: 'idle' },
      { id: 'slot-b', position: ptV(-65.2, -72.2), facing: facingToward([-65.2, -72.2], [-63.0, -71.5]), defaultAction: 'idle' },
    ],
  },
];

export const locations: WorldLocation[] = [
  makeLoc('village-center', 'Alun-alun & Pusat Desa', 8, -4, 0, 14, 'rooster', 1.6, VILLAGE_CENTER_OBSTACLES, VILLAGE_CENTER_PRESETS),
  makeLoc('mosque', 'Masjid Desa', -22, -13, Math.PI, 13, 'birds', 2.4, MOSQUE_OBSTACLES, MOSQUE_PRESETS),
  makeLoc('village-hall', 'Balai Desa', 26, -12, Math.PI, 12, 'crowd', 2.0),
  makeLoc('school', 'Sekolah Dasar Desa', -62, -10, Math.PI, 14, 'crowd', 2.0),
  makeLoc('market', 'Pasar Tradisional & Warung', -26, 21, 0, 12, 'market', 1.8, undefined, MARKET_PRESETS),
  makeLoc('river-bridge', 'Sungai & Jembatan Utama', BRIDGES[0].position[0] + 7, BRIDGES[0].position[2] - 14, -Math.PI * 0.15, 12, 'river', 2.2, undefined, RIVER_BRIDGE_PRESETS),
  makeLoc('bamboo-bridge', 'Jembatan Bambu & Tepi Sungai', BRIDGES[1].position[0], BRIDGES[1].position[2] - 12, 0, 10, 'river', 1.8, BAMBOO_BRIDGE_OBSTACLES, BAMBOO_BRIDGE_PRESETS),
  makeLoc('rice-terraces', 'Sawah Bertingkat & Saung', RICE.center[0] - 25, RICE.center[1] + 25, Math.PI * 0.25, 22, 'wind', 3.0, RICE_TERRACES_OBSTACLES, RICE_TERRACES_PRESETS),
  makeLoc('livestock-farm', 'Peternakan Sapi & Kambing', ZONES.farm.center[0], ZONES.farm.center[1] + 17, Math.PI, 12, 'rooster'),
  makeLoc('garden', 'Kebun Sayur & Lumbung', ZONES.garden.center[0], ZONES.garden.center[1] + 16, Math.PI, 12, 'birds', undefined, GARDEN_OBSTACLES, GARDEN_PRESETS),
  makeLoc('village-field', 'Lapangan Sepak Bola Desa', ZONES.field.center[0], ZONES.field.center[1], 0, 18, 'crowd'),
  makeLoc('houses-west', 'Pemukiman Rumah Bambu & Kayu', ZONES.houseWest.center[0], ZONES.houseWest.center[1] - 20, 0, 14, 'birds', undefined, undefined, HOUSES_WEST_PRESETS),
  makeLoc('forest-edge', 'Tepi Hutan & Jalan Tanah Barat', -120, 18, -Math.PI / 2, 16, 'wind'),
  makeLoc('mountain-view', 'Lereng Gunung & Kabut Utara', 0, -145, Math.PI, 28, 'wind', 6.0),
  makeLoc('cemetery-musholla', 'Musholla & Makam Desa', ZONES.cemetery.center[0] + 2, ZONES.cemetery.center[1] - 16, Math.PI, 12, 'silence'),
];

export const registry: WorldLocation[] = locations;
