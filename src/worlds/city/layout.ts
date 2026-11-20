// Layout Kota — 1 unit = 1 meter. Dunia 600x600, pusat di (0,0), y = atas.
// Sumber kebenaran koordinat untuk CityMap, CityTraffic, CityProps.

export const WORLD_SIZE = 600;
export const HALF = WORLD_SIZE / 2;

/** Garis tengah jalan raya (berlaku untuk sumbu X dan Z). */
export const ROAD_LINES = [-200, -100, 0, 100, 200] as const;
export const ROAD_WIDTH = 14; // 2 lajur per arah + median marka
export const LANE_WIDTH = 3.5;
export const SIDEWALK_WIDTH = 3;
export const BLOCK_SIZE = 100 - ROAD_WIDTH; // 86
export const SIDEWALK_H = 0.18;
/** Pusat blok pada tiap sumbu. */
export const BLOCK_CENTERS = [-250, -150, -50, 50, 150, 250] as const;

/** Offset lajur dari garis tengah jalan: +offset = lajur arah (+), -offset = arah (-). */
export const laneOffset = (lane: 0 | 1, dir: 1 | -1) => dir * (LANE_WIDTH * (lane + 0.5));

export type LotKind =
  | 'skyscraper' | 'office' | 'apartment' | 'ruko' | 'mall' | 'hospital'
  | 'school' | 'mosque' | 'station' | 'park' | 'market';

export interface Lot {
  id: string;
  kind: LotKind;
  x: number; z: number;       // pusat
  w: number; d: number; h: number; // lebar(x), dalam(z), tinggi
  facing: 0 | 1 | 2 | 3;      // 0:+z 1:+x 2:-z 3:-x (sisi muka / jalan terdekat)
  seed: number;
}

export interface Block { id: string; ix: number; iz: number; cx: number; cz: number; kind: LotKind | 'mixed'; }
export interface Intersection { id: string; x: number; z: number; hasSignal: boolean; }
export interface Crosswalk { x: number; z: number; rotY: number; length: number; }
export interface BusStop { id: string; x: number; z: number; rotY: number; }

export function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Blok khusus (ix,iz = indeks 0..5 pada BLOCK_CENTERS). */
const SPECIAL: Record<string, LotKind> = {
  '2,2': 'mall', '3,2': 'skyscraper', '3,3': 'park', '1,3': 'market', '4,2': 'hospital',
  '1,1': 'school', '3,1': 'mosque', '2,4': 'station',
};

export const blocks: Block[] = [];
export const lots: Lot[] = [];

BLOCK_CENTERS.forEach((cx, ix) => BLOCK_CENTERS.forEach((cz, iz) => {
  const key = `${ix},${iz}`;
  const special = SPECIAL[key];
  const id = `block-${ix}-${iz}`;
  blocks.push({ id, ix, iz, cx, cz, kind: special ?? 'mixed' });
  const rnd = mulberry(1000 + ix * 31 + iz * 97);
  const inner = BLOCK_SIZE - SIDEWALK_WIDTH * 2; // 80
  if (special === 'park' || special === 'market') return;
  if (special && special !== 'skyscraper') {
    const h = { mall: 28, hospital: 36, school: 12, mosque: 14, station: 14 }[special as 'mall'] ?? 14;
    lots.push({ id: `${id}-main`, kind: special, x: cx, z: cz, w: inner * 0.85, d: inner * 0.7, h, facing: 0, seed: ix * 7 + iz });
    return;
  }
  const dist = Math.hypot(cx, cz);
  const n = 3; const cell = inner / n;
  for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
    const x = cx - inner / 2 + cell * (a + 0.5);
    const z = cz - inner / 2 + cell * (b + 0.5);
    const r = rnd();
    let kind: LotKind; let h: number;
    if (special === 'skyscraper' || dist < 130) {
      kind = r < 0.6 ? 'skyscraper' : 'office';
      h = kind === 'skyscraper' ? 90 + rnd() * 130 : 35 + rnd() * 30;
    } else if (dist < 260) {
      kind = r < 0.35 ? 'office' : r < 0.75 ? 'apartment' : 'ruko';
      h = kind === 'office' ? 30 + rnd() * 30 : kind === 'apartment' ? 28 + rnd() * 25 : 10 + rnd() * 6;
    } else {
      kind = r < 0.55 ? 'ruko' : 'apartment';
      h = kind === 'ruko' ? 9 + rnd() * 6 : 20 + rnd() * 15;
    }
    const gap = 3 + rnd() * 2;
    const facing = (Math.abs(x) > Math.abs(z) ? (x > 0 ? 1 : 3) : (z > 0 ? 0 : 2)) as 0 | 1 | 2 | 3;
    lots.push({
      id: `${id}-${a}-${b}`, kind, x, z, w: cell - gap, d: cell - gap, h: Math.round(h), facing,
      seed: Math.floor(rnd() * 1e6),
    });
  }
}));

export const intersections: Intersection[] = [];
ROAD_LINES.forEach((x) => ROAD_LINES.forEach((z) =>
  intersections.push({ id: `ix-${x}-${z}`, x, z, hasSignal: true })));

export const crosswalks: Crosswalk[] = [];
{
  const off = ROAD_WIDTH / 2 + 1.5;
  intersections.forEach(({ x, z }) => {
    crosswalks.push({ x: x + off, z, rotY: 0, length: ROAD_WIDTH - 1 });
    crosswalks.push({ x: x - off, z, rotY: 0, length: ROAD_WIDTH - 1 });
    crosswalks.push({ x, z: z + off, rotY: Math.PI / 2, length: ROAD_WIDTH - 1 });
    crosswalks.push({ x, z: z - off, rotY: Math.PI / 2, length: ROAD_WIDTH - 1 });
  });
}

/** Flyover sepanjang sumbu X di atas jalan z = FLYOVER.z, dari x0 sampai x1. */
// Dek datar antara x=-200..200 (di atas perempatan, clearance 9m); ramp turun ke x0/x1 (di luar kota).
// Pilar di x=±50,±150 pada median. Lalu lintas lajur bawah sebaiknya |x|<=240 pada z=-100.
export const FLYOVER = { z: -100, x0: -295, x1: 295, deckY: 9, width: 12, rampLength: 95, pillarsX: [-150, -50, 50, 150] };

export const busStops: BusStop[] = [
  { id: 'halte-1', x: -150, z: ROAD_WIDTH / 2 + 2.5, rotY: 0 },
  { id: 'halte-2', x: 150, z: -ROAD_WIDTH / 2 - 2.5, rotY: Math.PI },
  { id: 'halte-3', x: ROAD_WIDTH / 2 + 2.5, z: 150, rotY: -Math.PI / 2 },
  { id: 'halte-4', x: -ROAD_WIDTH / 2 - 2.5, z: -150, rotY: Math.PI / 2 },
];

export const PARK = { x: 50, z: 50, size: BLOCK_SIZE - SIDEWALK_WIDTH * 2 };
export const MARKET = { x: -150, z: 50, size: BLOCK_SIZE - SIDEWALK_WIDTH * 2 };

/** Siklus lampu lalu lintas (detik): sumbu X hijau, kuning, lalu sumbu Z hijau. */
export const SIGNAL = { green: 18, yellow: 3, allRed: 1 };
export const SIGNAL_CYCLE = (SIGNAL.green + SIGNAL.yellow + SIGNAL.allRed) * 2;
/** Fase lampu: 'x' = kendaraan sepanjang sumbu X boleh jalan. */
export function signalState(t: number, offset = 0): { x: 'green' | 'yellow' | 'red'; z: 'green' | 'yellow' | 'red' } {
  const c = (((t + offset) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const half = SIGNAL_CYCLE / 2;
  const ph = (p: number) => (p < SIGNAL.green ? 'green' : p < SIGNAL.green + SIGNAL.yellow ? 'yellow' : 'red');
  return c < half ? { x: ph(c), z: 'red' } : { x: 'red', z: ph(c - half) };
}
