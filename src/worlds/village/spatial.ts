import { seededRandom } from '../shared/seededRandom';
import type { ObstacleCircle } from '../shared/types';
import {
  BUILDING_SLOTS,
  HOUSE_SLOTS,
  POWER_POLES,
  RICE,
  RIVER,
  ZONES,
  bridgeDeckY,
  distToRoads,
  heightAt,
  riverZ,
} from './layout';

const GAZEBO_PILLARS: readonly [number, number][] = [
  [-1.4, -1],
  [1.4, -1],
  [-1.4, 1],
  [1.4, 1],
];

const BUILDING_HEIGHTS: Record<string, number> = {
  mosque: 9,
  hall: 6,
  school: 6,
  market: 5,
  warung: 4,
  barn: 6,
  musholla: 5,
  well: 1.5,
  cowshed: 3.5,
  goatshed: 3.5,
  coop: 3.5,
  duckpen: 3.5,
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function rotateLocalXZ(
  cx: number,
  cz: number,
  lx: number,
  lz: number,
  rotationY: number,
): [number, number] {
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  return [cx + lx * cos + lz * sin, cz - lx * sin + lz * cos];
}

/**
 * Ketinggian permukaan berjalan/berdiri di Dunia Desa pada (x, z):
 * 1. Dek jembatan (utama / bambu)
 * 2. Dek kayu saung bambu (+0.65m di atas terrain pusat saung)
 * 3. Kontur terrain `heightAt(x, z)`
 */
export function villageSurfaceY(
  x: number,
  z: number,
  opts?: { ignoreGazeboDeck?: boolean },
): number {
  const deckY = bridgeDeckY(x, z);
  if (deckY !== null) return deckY;

  if (!opts?.ignoreGazeboDeck) {
    for (const b of BUILDING_SLOTS) {
      if (b.kind !== 'gazebo') continue;
      const dx = x - b.position[0];
      const dz = z - b.position[2];
      const cos = Math.cos(b.rotationY);
      const sin = Math.sin(b.rotationY);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= 1.6 && Math.abs(lz) <= 1.2) {
        return heightAt(b.position[0], b.position[2]) + 0.65;
      }
    }
  }

  return heightAt(x, z);
}

/** Replikasi persis `isClearOfStructures` di `ForestZone.tsx`. */
function isClearOfStructures(x: number, z: number): boolean {
  if (distToRoads(x, z) < 3.6) return false;
  if (Math.abs(z - riverZ(x)) < RIVER.width * 0.5 + 3.2) return false;
  if (x >= -15.0 && x <= -4.0 && z >= 49.5 && z <= 67.0) return false;
  if (
    Math.abs(x - RICE.center[0]) < RICE.size[0] / 2 + 3 &&
    Math.abs(z - RICE.center[1]) < RICE.size[1] / 2 + 3
  ) {
    return false;
  }
  if (
    Math.abs(x - ZONES.field.center[0]) < ZONES.field.size[0] / 2 + 2 &&
    Math.abs(z - ZONES.field.center[1]) < ZONES.field.size[1] / 2 + 2
  ) {
    return false;
  }
  if (
    Math.abs(x - ZONES.garden.center[0]) < ZONES.garden.size[0] / 2 + 2 &&
    Math.abs(z - ZONES.garden.center[1]) < ZONES.garden.size[1] / 2 + 2
  ) {
    return false;
  }
  if (Math.hypot(x - ZONES.center.center[0], z - ZONES.center.center[1]) < 24) return false;
  for (const b of BUILDING_SLOTS) {
    if (
      Math.abs(x - b.position[0]) < b.size[0] / 2 + 4 &&
      Math.abs(z - b.position[2]) < b.size[1] / 2 + 4
    ) {
      return false;
    }
  }
  for (const h of HOUSE_SLOTS) {
    if (
      Math.abs(x - h.position[0]) < h.size[0] / 2 + 3.5 &&
      Math.abs(z - h.position[2]) < h.size[1] / 2 + 3.5
    ) {
      return false;
    }
  }
  return true;
}

let cachedVillageObstacles: ObstacleCircle[] | null = null;

function buildVillageObstacles(): ObstacleCircle[] {
  const out: ObstacleCircle[] = [];

  for (const b of BUILDING_SLOTS) {
    const [bx, , bz] = b.position;
    if (b.kind === 'gazebo') {
      for (const [lx, lz] of GAZEBO_PILLARS) {
        const [px, pz] = rotateLocalXZ(bx, bz, lx, lz, b.rotationY);
        out.push({ x: px, z: pz, r: 0.25, h: 3.0 });
      }
      continue;
    }

    const [w, d] = b.size;
    const h = BUILDING_HEIGHTS[b.kind] ?? 5;
    if (w >= d * 1.5) {
      const r = Math.hypot(w / 2, d) * 0.44;
      for (const sx of [-w / 4, w / 4]) {
        const [px, pz] = rotateLocalXZ(bx, bz, sx, 0, b.rotationY);
        out.push({ x: px, z: pz, r, h });
      }
    } else if (d >= w * 1.5) {
      const r = Math.hypot(w, d / 2) * 0.44;
      for (const sz of [-d / 4, d / 4]) {
        const [px, pz] = rotateLocalXZ(bx, bz, 0, sz, b.rotationY);
        out.push({ x: px, z: pz, r, h });
      }
    } else {
      out.push({ x: bx, z: bz, r: Math.hypot(w, d) * 0.44, h });
    }
  }

  for (const h of HOUSE_SLOTS) {
    out.push({
      x: h.position[0],
      z: h.position[2],
      r: Math.hypot(h.size[0], h.size[1]) * 0.44,
      h: 5.5,
    });
  }

  for (const p of POWER_POLES) {
    out.push({ x: p[0], z: p[2], r: 0.35, h: 7.5 });
  }

  // Replikasi deterministik 1:1 seluruh pohon di `ForestZone.tsx` (seededRandom(55123))
  const r = seededRandom(55123);

  const addBroad = (x: number, z: number, sc: number) => {
    // 7 panggilan r() identik dengan addBroad di ForestZone.tsx
    r();
    r();
    r();
    r();
    r();
    r();
    r();
    out.push({
      x,
      z,
      r: clamp(0.65 * sc + 0.15, 0.75, 1.15),
      h: clamp(4.8 * sc, 5.5, 7.5),
    });
  };

  const addPine = (x: number, z: number, sc: number) => {
    r();
    out.push({
      x,
      z,
      r: clamp(0.6 * sc + 0.2, 0.75, 1.15),
      h: clamp(5.2 * sc, 5.5, 7.5),
    });
  };

  const addPalm = (x: number, z: number, sc: number) => {
    r();
    out.push({
      x,
      z,
      r: clamp(0.6 * sc + 0.2, 0.75, 1.15),
      h: clamp(6.0 * sc, 5.5, 7.5),
    });
  };

  // 1. Hutan barat lebat
  for (let i = 0; i < 160; i++) {
    const x = -195 + r() * 88;
    const z = -155 + r() * 320;
    if (!isClearOfStructures(x, z)) continue;
    addBroad(x, z, 0.9 + r() * 0.8);
  }

  // 2. Hutan & lereng utara
  for (let i = 0; i < 190; i++) {
    const x = -190 + r() * 380;
    const z = -195 + r() * 85;
    if (!isClearOfStructures(x, z)) continue;
    const y = heightAt(x, z);
    if (y > 8) addPine(x, z, 0.9 + r() * 0.9);
    else addBroad(x, z, 0.85 + r() * 0.75);
  }

  // 3. Pohon tersebar di tepi desa, selatan, dan bukit timur
  for (let i = 0; i < 160; i++) {
    const x = -180 + r() * 365;
    const z = -110 + r() * 295;
    if (!isClearOfStructures(x, z)) continue;
    if (r() < 0.22 && x > 40) addPalm(x, z, 0.85 + r() * 0.4);
    else addBroad(x, z, 0.75 + r() * 0.65);
  }

  // 4. Pohon kelapa khas di tepi sungai & pinggir sawah
  for (let i = 0; i < 42; i++) {
    const x = -150 + r() * 320;
    const side = r() < 0.5 ? -1 : 1;
    const z = riverZ(x) + side * (RIVER.width * 0.5 + 4 + r() * 7);
    if (!isClearOfStructures(x, z)) continue;
    addPalm(x, z, 0.85 + r() * 0.4);
  }

  return out;
}

/**
 * Daftar obstacle deterministik di Dunia Desa (bangunan, tiang saung, rumah, tiang listrik, pohon).
 * Jika `nearXZ` diberikan, mengembalikan obstacle dalam jarak `radius + o.r`.
 */
export function getVillageObstacles(
  nearXZ?: [number, number],
  radius = 80,
): ObstacleCircle[] {
  if (!cachedVillageObstacles) {
    cachedVillageObstacles = buildVillageObstacles();
  }
  if (!nearXZ) return cachedVillageObstacles;
  const [nx, nz] = nearXZ;
  return cachedVillageObstacles.filter((o) => Math.hypot(o.x - nx, o.z - nz) <= radius + o.r);
}
