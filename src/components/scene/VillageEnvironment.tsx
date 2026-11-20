import React from 'react';
import { VillageCoreZone } from './zones/VillageCoreZone';
import { RiverBridgeZone } from './zones/RiverBridgeZone';
import { RiceFieldZone } from './zones/RiceFieldZone';

interface VillageEnvironmentProps {
  focalProp?: 'boulder' | 'house' | 'road' | 'stream';
  isGolden?: boolean;
  isNight?: boolean;
  showDebris?: boolean;
  isPlaying?: boolean;
}

export const VillageEnvironment: React.FC<VillageEnvironmentProps> = ({
  focalProp,
  isGolden = false,
  isNight = false,
  showDebris = false,
  isPlaying = true,
}) => {
  return (
    <group name="village-environment">
      <VillageCoreZone
        focalProp={focalProp}
        isGolden={isGolden}
        isNight={isNight}
        showDebris={showDebris}
      />
      <RiverBridgeZone
        isNight={isNight}
        isGolden={isGolden}
        isPlaying={isPlaying}
      />
      <RiceFieldZone
        isNight={isNight}
        isGolden={isGolden}
        isPlaying={isPlaying}
      />
    </group>
  );
};
