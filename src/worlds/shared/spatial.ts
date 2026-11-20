import { getCityObstacles, citySurfaceY } from '../city/spatial';
import { getVillageObstacles, villageSurfaceY } from '../village/spatial';
import type { ObstacleCircle, StagingPreset, WorldLocation } from './types';

export function surfaceYAt(
  worldId: 'village' | 'city',
  x: number,
  z: number,
  opts?: { ignoreGazeboDeck?: boolean; preferFlyover?: boolean },
): number {
  if (worldId === 'village') {
    return villageSurfaceY(x, z, opts);
  }
  return citySurfaceY(x, z, opts);
}

export function getWorldObstacles(
  worldId: 'village' | 'city',
  nearXZ?: [number, number],
  radius?: number,
): ObstacleCircle[] {
  if (worldId === 'village') {
    return getVillageObstacles(nearXZ, radius);
  }
  return getCityObstacles(nearXZ, radius);
}

export function resolveStagingPreset(
  location: WorldLocation | undefined,
  presetId: string | undefined,
): StagingPreset | undefined {
  if (!location?.stagingPresets?.length || !presetId) return undefined;
  return location.stagingPresets.find((p) => p.id === presetId);
}

/** Sudut rotasi Y (radian, konvensi Three.js +Z forward) dari `fromXZ` menghadap `toXZ`. */
export function facingToward(fromXZ: [number, number], toXZ: [number, number]): number {
  return Math.atan2(toXZ[0] - fromXZ[0], toXZ[1] - fromXZ[1]);
}
