import { memo, useMemo } from 'react';
import type { TimeOfDay, Weather } from '../../shared/types';
import { CityPedestrians } from '../pedestrians/CityPedestrians';
import { VehicleMeshes } from './VehicleMeshes';
import { buildTrafficSimulation } from './trafficSim';

export interface CityTrafficProps {
  time?: number;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
  includePedestrians?: boolean;
}

/**
 * Lalu lintas kota deterministik (digerakkan prop `time`) + pejalan kaki & pedagang.
 * Membaca koordinat lajur, perempatan, halte, flyover, dan siklus lampu dari `layout.ts`.
 */
export const CityTraffic = memo(function CityTraffic({
  time,
  timeOfDay = 'day',
  weather = 'clear',
  includePedestrians = true,
}: CityTrafficProps) {
  const sim = useMemo(() => buildTrafficSimulation(), []);

  return (
    <group name="city-traffic">
      <VehicleMeshes sim={sim} time={time} timeOfDay={timeOfDay} weather={weather} />
      {includePedestrians && <CityPedestrians time={time} />}
    </group>
  );
});

export default CityTraffic;

