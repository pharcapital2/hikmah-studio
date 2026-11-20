import { memo } from 'react';
import type { WorldProps } from '../shared/types';
import { Terrain } from './terrain/Terrain';
import { River } from './terrain/River';
import { MountainMist } from './terrain/MountainMist';
import { RoadsAndBridges } from './zones/RoadsAndBridges';
import { ForestZone } from './zones/ForestZone';
import { RiceFieldZone } from './zones/RiceFieldZone';
import { GardenAndFieldZone } from './zones/GardenAndFieldZone';
import { VillageBuildings } from './buildings/VillageBuildings';
import { VillageProps } from './props/VillageProps';
import { VillageActors } from './ambient/VillageActors';

export { registry, locations } from './locations';

/**
 * Dunia 3D Desa lengkap (400x400m, 1 unit = 1m), deterministik & dapat dirender standalone.
 * Semua animasi environment digerakkan oleh prop `time` (atau R3F clock saat `time` undefined).
 */
export const VillageMap = memo(function VillageMap({
  timeOfDay = 'day',
  weather = 'clear',
  time,
  children,
}: Partial<WorldProps>) {
  return (
    <group name="village-world">
      <Terrain />
      <River time={time} />
      <MountainMist time={time} weather={weather} />
      <RoadsAndBridges time={time} />
      <ForestZone />
      <RiceFieldZone time={time} />
      <GardenAndFieldZone time={time} />
      <VillageBuildings timeOfDay={timeOfDay} weather={weather} />
      <VillageProps time={time} timeOfDay={timeOfDay} weather={weather} />
      <VillageActors time={time} timeOfDay={timeOfDay} />
      {children}
    </group>
  );
});

export default VillageMap;
