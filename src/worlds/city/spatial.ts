import type { ObstacleCircle } from '../shared/types';
import { FLYOVER, ROAD_LINES, ROAD_WIDTH, SIDEWALK_H, busStops, lots } from './layout';

/**
 * Ketinggian permukaan berjalan/berdiri di Dunia Kota pada (x, z):
 * - Dek flyover (`FLYOVER.deckY`) bila `opts.preferFlyover` dan berada di badan flyover
 * - `0` bila berada di aspal jalan raya
 * - `SIDEWALK_H` (`0.18`) di trotoar/blok kota
 */
export function citySurfaceY(
  x: number,
  z: number,
  opts?: { preferFlyover?: boolean },
): number {
  if (
    opts?.preferFlyover &&
    Math.abs(z - FLYOVER.z) <= FLYOVER.width * 0.5 &&
    x >= FLYOVER.x0 &&
    x <= FLYOVER.x1
  ) {
    return FLYOVER.deckY;
  }

  if (ROAD_LINES.some((rl) => Math.abs(x - rl) < ROAD_WIDTH / 2 || Math.abs(z - rl) < ROAD_WIDTH / 2)) {
    return 0;
  }

  return SIDEWALK_H;
}

let cachedCityObstacles: ObstacleCircle[] | null = null;

function buildCityObstacles(): ObstacleCircle[] {
  const out: ObstacleCircle[] = [];

  for (const lot of lots) {
    out.push({
      x: lot.x,
      z: lot.z,
      r: Math.hypot(lot.w, lot.d) * 0.44,
      h: lot.h,
    });
  }

  for (const stop of busStops) {
    out.push({
      x: stop.x,
      z: stop.z,
      r: 1.5,
      h: 3.2,
    });
  }

  for (const px of FLYOVER.pillarsX) {
    out.push({
      x: px,
      z: FLYOVER.z,
      r: 1.4,
      h: FLYOVER.deckY,
    });
  }

  return out;
}

/**
 * Daftar obstacle deterministik di Dunia Kota (gedung/lot, halte bus, pilar flyover).
 * Jika `nearXZ` diberikan, mengembalikan obstacle dalam jarak `radius + o.r`.
 */
export function getCityObstacles(
  nearXZ?: [number, number],
  radius = 90,
): ObstacleCircle[] {
  if (!cachedCityObstacles) {
    cachedCityObstacles = buildCityObstacles();
  }
  if (!nearXZ) return cachedCityObstacles;
  const [nx, nz] = nearXZ;
  return cachedCityObstacles.filter((o) => Math.hypot(o.x - nx, o.z - nz) <= radius + o.r);
}
