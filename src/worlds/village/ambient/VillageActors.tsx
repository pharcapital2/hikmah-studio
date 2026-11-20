import React, { memo, useMemo } from 'react';
import type { TimeOfDay } from '../../shared/types';
import { seededRandom } from '../../shared/seededRandom';
import { BUILDING_SLOTS, RICE, RIVER, ROADS, WAYPOINTS, ZONES, riverZ } from '../layout';
import { Herd } from '../animals/Animals';
import { Birds, Butterflies, RiverFish } from './Ambient';
import { Bicycle, Cart, Dokar } from '../vehicles/Vehicles';
import { Villager } from './Villagers';

export interface VillageActorsProps {
  time?: number;
  timeOfDay?: TimeOfDay;
}

const PASTURE_COW_CENTER: [number, number, number] = [WAYPOINTS.pastureCow.center[0], 0, WAYPOINTS.pastureCow.center[1]];
const PASTURE_GOAT_CENTER: [number, number, number] = [WAYPOINTS.pastureGoat.center[0], 0, WAYPOINTS.pastureGoat.center[1]];
const HOUSE_WEST_CHICKEN: [number, number, number] = [ZONES.houseWest.center[0] + 6, 0, ZONES.houseWest.center[1] + 8];
const HOUSE_EAST_CHICKEN: [number, number, number] = [ZONES.houseEast.center[0], 0, ZONES.houseEast.center[1] + 6];
const BUFFALO_CENTER_1: [number, number, number] = [78, 0, 44];
const BUFFALO_CENTER_2: [number, number, number] = [44, 0, 52];
const DUCK_SWIM_CENTER: [number, number, number] = [-46, RIVER.waterY + 0.25, riverZ(-46)];

const BIRDS_CENTER_1: [number, number, number] = [ZONES.riceTerraces.center[0], 0, ZONES.riceTerraces.center[1]];
const BIRDS_CENTER_2: [number, number, number] = [ZONES.forestWest.center[0] + 20, 0, ZONES.forestWest.center[1]];
const BIRDS_CENTER_3: [number, number, number] = [ZONES.center.center[0], 0, ZONES.center.center[1]];

const BF_CENTER_1: [number, number, number] = [ZONES.garden.center[0], 0, ZONES.garden.center[1]];
const BF_CENTER_2: [number, number, number] = [ZONES.field.center[0], 0, ZONES.field.center[1]];
const BF_CENTER_3: [number, number, number] = [22, 0, 56];

const GARDEN_FARMER_1: [number, number, number] = [ZONES.garden.center[0] - 5, 0, ZONES.garden.center[1] + 2];
const GARDEN_FARMER_2: [number, number, number] = [ZONES.garden.center[0] + 6, 0, ZONES.garden.center[1] - 4];
const ROAD3_FARMER: [number, number, number] = [90, 0, 0];

const FIELD_CHILDREN: [number, number, number][] = Array.from({ length: 4 }, (_, i) => [
  WAYPOINTS.fieldPlay.center[0] + (i - 1.5) * 4,
  0,
  WAYPOINTS.fieldPlay.center[1] + ((i % 2) - 0.5) * 4,
]);

const WALKER_POS_1: [number, number, number] = [-30, 0, 0];
const WALKER_POS_2: [number, number, number] = [30, 0, 20];
const WALKER_POS_3: [number, number, number] = [0, 0, 5];
const WALKER_POS_4: [number, number, number] = [-80, 0, 8];
const WALKER_POS_5: [number, number, number] = [-120, 0, 48];

/**
 * Seluruh aktor hidup desa (hewan, kendaraan tradisional, warga latar, burung, kupu-kupu, ikan).
 * Semua posisi & animasi deterministik berdasarkan `layout.ts` dan prop `time` (atau R3F clock).
 */
export const VillageActors: React.FC<VillageActorsProps> = memo(({ time, timeOfDay = 'day' }) => {
  const night = timeOfDay === 'night';

  const slots = useMemo(() => {
    const byId = new Map(BUILDING_SLOTS.map((s) => [s.id, s]));
    const coop = byId.get('kandang-ayam')?.position ?? [-86, 0, -26];
    const duckpen = byId.get('kandang-bebek')?.position ?? [-60, 0, 54];
    const school = byId.get('sekolah')?.position ?? [-38, 0, -20];
    return {
      coopCenter: [coop[0], 0, coop[2] + 3] as [number, number, number],
      duckpenCenter: [duckpen[0], 0, duckpen[2] + 2] as [number, number, number],
      schoolChild1: [school[0] - 4, 0, school[2] + 9] as [number, number, number],
      schoolChild2: [school[0] + 4, 0, school[2] + 10] as [number, number, number],
    };
  }, []);

  const riceFarmers = useMemo(() => {
    const r = seededRandom(404);
    const [cx, cz] = RICE.center;
    return Array.from({ length: 4 }, (_, i) => [
      cx - 28 + i * 18 + (r() - 0.5) * 6,
      0,
      cz - 30 + (i % 2) * 40 + (r() - 0.5) * 10,
    ] as [number, number, number]);
  }, []);

  return (
    <group name="village-actors">
      {/* Ternak di peternakan & sekitar rumah */}
      <Herd kind="cow" center={PASTURE_COW_CENTER} count={5} spread={11} time={time} seed={10} />
      <Herd kind="goat" center={PASTURE_GOAT_CENTER} count={6} spread={8} time={time} seed={20} />
      <Herd kind="chicken" center={slots.coopCenter} count={7} spread={5} time={time} seed={30} />
      <Herd kind="chicken" center={HOUSE_WEST_CHICKEN} count={5} spread={6} time={time} seed={31} />
      <Herd kind="chicken" center={HOUSE_EAST_CHICKEN} count={4} spread={5} time={time} seed={32} />
      <Herd kind="duck" center={slots.duckpenCenter} count={6} spread={5} time={time} seed={40} />
      <Herd kind="duck" center={DUCK_SWIM_CENTER} count={4} spread={3.5} time={time} seed={41} fixedY={RIVER.waterY + 0.25} />
      <Herd kind="buffalo" center={BUFFALO_CENTER_1} count={3} spread={6} time={time} seed={50} />
      <Herd kind="buffalo" center={BUFFALO_CENTER_2} count={2} spread={4} time={time} seed={51} />

      {/* Fauna ambient */}
      <Birds center={BIRDS_CENTER_1} spread={42} count={10} time={time} seed={60} />
      <Birds center={BIRDS_CENTER_2} spread={38} count={8} time={time} seed={61} />
      <Birds center={BIRDS_CENTER_3} spread={34} count={6} time={time} seed={62} />

      {!night && (
        <>
          <Butterflies center={BF_CENTER_1} spread={14} count={10} time={time} seed={70} />
          <Butterflies center={BF_CENTER_2} spread={14} count={8} time={time} seed={71} />
          <Butterflies center={BF_CENTER_3} spread={10} count={8} time={time} seed={72} />
        </>
      )}

      <RiverFish count={20} time={time} seed={80} />

      {/* Kendaraan tradisional */}
      <Dokar path={WAYPOINTS.mainRoad} time={time} speed={2.4} offset={24} night={night} />
      <Dokar path={WAYPOINTS.mainRoad} time={time} speed={2.1} offset={180} night={night} />

      <Cart path={WAYPOINTS.loopCenter} time={time} speed={1.0} offset={8} />
      <Cart path={ROADS[3].path} time={time} speed={0.95} offset={32} />

      <Bicycle path={WAYPOINTS.mainRoad} time={time} speed={3.4} offset={75} shirt="#3f7fbf" />
      <Bicycle path={ROADS[2].path} time={time} speed={3.0} offset={14} shirt="#4a8f5a" />
      <Bicycle path={ROADS[1].path} time={time} speed={3.2} offset={42} shirt="#c97a2b" />

      {/* Warga latar */}
      {!night &&
        riceFarmers.map((pos, i) => <Villager key={`rf-${i}`} role="farmer" position={pos} time={time} seed={100 + i} />)}
      {!night && (
        <>
          <Villager role="farmer" position={GARDEN_FARMER_1} time={time} seed={110} />
          <Villager role="farmer" position={GARDEN_FARMER_2} time={time} seed={111} />
        </>
      )}
      <Villager role="farmer" position={ROAD3_FARMER} path={ROADS[3].path} time={time} seed={115} />

      {!night &&
        FIELD_CHILDREN.map((pos, i) => (
          <Villager key={`ch-${i}`} role="child" position={pos} time={time} seed={200 + i} />
        ))}
      {!night && (
        <>
          <Villager role="child" position={slots.schoolChild1} time={time} seed={210} />
          <Villager role="child" position={slots.schoolChild2} time={time} seed={211} />
        </>
      )}

      <Villager role="walker" position={WALKER_POS_1} path={WAYPOINTS.loopCenter} time={time} seed={300} />
      <Villager role="walker" position={WALKER_POS_2} path={WAYPOINTS.loopCenter} time={time} seed={301} />
      <Villager role="walker" position={WALKER_POS_3} path={WAYPOINTS.mainRoad} time={time} seed={302} />
      <Villager role="walker" position={WALKER_POS_4} path={WAYPOINTS.mainRoad} time={time} seed={303} />
      <Villager role="walker" position={WALKER_POS_5} path={WAYPOINTS.riverBank} time={time} seed={304} />
    </group>
  );
});

export default VillageActors;
