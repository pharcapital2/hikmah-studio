import { memo } from 'react';
import type { WorldProps } from '../shared';
import { Landmarks } from './buildings/Landmarks';
import { ProceduralBuildings } from './buildings/ProceduralBuildings';
import { Signage } from './buildings/Signage';
import { CityProps } from './props/CityProps';
import { RoadNetwork } from './roads/RoadNetwork';
import { CityTraffic } from './vehicles/CityTraffic';
import { CityPark } from './zones/CityPark';
import { StreetMarket } from './zones/StreetMarket';
import { UrbanGreenery } from './zones/UrbanGreenery';

export const CityMap = memo(function CityMap({ timeOfDay, weather, time, children }: WorldProps) {
  return (
    <group name="city-world">
      <RoadNetwork timeOfDay={timeOfDay} weather={weather} time={time} />
      <ProceduralBuildings timeOfDay={timeOfDay} weather={weather} />
      <Landmarks timeOfDay={timeOfDay} weather={weather} time={time} />
      <Signage timeOfDay={timeOfDay} weather={weather} />
      <CityPark timeOfDay={timeOfDay} weather={weather} time={time} />
      <StreetMarket timeOfDay={timeOfDay} weather={weather} />
      <UrbanGreenery />
      <CityProps timeOfDay={timeOfDay} weather={weather} />
      <CityTraffic time={time} timeOfDay={timeOfDay} weather={weather} />
      {children}
    </group>
  );
});

export default CityMap;
