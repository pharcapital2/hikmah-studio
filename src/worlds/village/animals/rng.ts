import { seededRandom } from '../../shared/seededRandom';
import { bridgeDeckY, heightAt } from '../layout';

export const rng = seededRandom;

export interface Pose {
  x: number;
  y: number;
  z: number;
  heading: number;
  moving: boolean;
  speed: number;
}

/** Tinggi tanah di (x, z), menjaga agar lintasan di atas jembatan tetap persis di permukaan dek lengkung jembatan. */
export function groundY(x: number, z: number): number {
  const deck = bridgeDeckY(x, z);
  if (deck !== null) return deck;
  return heightAt(x, z);
}

/** Jalan berpola seeded: elips di sekitar pusat, dengan jeda (idle) periodik. */
export function wanderPose(
  time: number,
  cx: number,
  cz: number,
  radius: number,
  seed: number,
  speed = 0.6,
): Pose {
  const r = seededRandom(seed);
  const rx = radius * (0.6 + r() * 0.4);
  const rz = radius * (0.6 + r() * 0.4);
  const phase = r() * 100;
  const rot = r() * Math.PI;
  const dir = r() > 0.5 ? 1 : -1;
  const period = 12 + r() * 4;
  const t = time + phase;
  const k = Math.floor(t / period);
  const f = (t % period) / period;
  const walkFrac = 0.65;
  const walkT = (k + Math.min(f / walkFrac, 1)) * (speed / Math.max(radius, 1)) * period * walkFrac;
  const moving = f < walkFrac;
  const at = (u: number): [number, number] => {
    const lx = Math.cos(u * dir) * rx;
    const lz = Math.sin(u * dir) * rz;
    return [
      cx + lx * Math.cos(rot) - lz * Math.sin(rot),
      cz + lx * Math.sin(rot) + lz * Math.cos(rot),
    ];
  };
  const [x, z] = at(walkT);
  const [x2, z2] = at(walkT + 0.02);
  return {
    x,
    y: groundY(x, z),
    z,
    heading: Math.atan2(x2 - x, z2 - z),
    moving,
    speed,
  };
}
