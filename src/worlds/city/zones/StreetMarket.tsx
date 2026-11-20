import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Instances, lightsOn, seededRandom, type InstanceData, type TimeOfDay, type Weather } from '../../shared';
import { MARKET, SIDEWALK_H } from '../layout';
import { CITY_PALETTE } from '../palette';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

export const StreetMarket = memo(function StreetMarket({ timeOfDay, weather }: Props) {
  const glow = lightsOn(timeOfDay, weather);
  const s = MARKET.size;

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 6), []);

  const matTarp = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85 }), []);
  const matWood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8f5f36', roughness: 0.88 }), []);
  const matCrate = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8 }), []);
  const matBulb = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: glow ? '#ffe082' : '#d6d2c4',
        emissive: glow ? '#ffaa2b' : '#000000',
        emissiveIntensity: glow ? 2.1 : 0,
      }),
    [glow],
  );

  const { poles, canopies, tables, crates, bulbs } = useMemo(() => {
    const r = seededRandom(8181);
    const p: InstanceData[] = [];
    const ca: InstanceData[] = [];
    const tb: InstanceData[] = [];
    const cr: InstanceData[] = [];
    const bl: InstanceData[] = [];

    const rows = [-22, -7.5, 7.5, 22];
    const cols = [-24, -12, 0, 12, 24];
    const crateColors = ['#e0533c', '#f4a226', '#4aa84f', '#f0e258'];

    for (const rx of rows) {
      for (const cz of cols) {
        const sx = MARKET.x + rx;
        const sz = MARKET.z + cz;
        const col = CITY_PALETTE.marketTents[Math.floor(r() * CITY_PALETTE.marketTents.length)];
        // Tent canopy & 4 corner poles
        ca.push({ position: [sx, SIDEWALK_H + 2.7, sz], scale: [5.2, 0.25, 4.4], color: col });
        for (const px of [-2.2, 2.2]) {
          for (const pz of [-1.8, 1.8]) {
            p.push({ position: [sx + px, SIDEWALK_H + 1.35, sz + pz], scale: [0.06, 2.7, 0.06] });
          }
        }
        // Stall counter
        tb.push({ position: [sx, SIDEWALK_H + 0.85, sz], scale: [4.2, 0.85, 1.3] });
        // Produce crates on/beside counter
        for (let k = 0; k < 3; k++) {
          cr.push({
            position: [sx - 1.2 + k * 1.1, SIDEWALK_H + 1.4, sz + (r() - 0.5) * 0.4],
            scale: [0.65, 0.38, 0.55],
            color: crateColors[Math.floor(r() * crateColors.length)],
          });
        }
        // Hanging warm bulb under canopy
        bl.push({ position: [sx, SIDEWALK_H + 2.45, sz], scale: [0.22, 0.22, 0.22] });
      }
    }

    return { poles: p, canopies: ca, tables: tb, crates: cr, bulbs: bl };
  }, []);

  return (
    <group name="city-street-market">
      {/* Cobblestone market square */}
      <mesh position={[MARKET.x, SIDEWALK_H + 0.03, MARKET.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s - 2, s - 2]} />
        <meshStandardMaterial color="#877e74" roughness={0.94} />
      </mesh>
      <Instances geometry={cylGeo} material={matWood} instances={poles} />
      <Instances geometry={boxGeo} material={matTarp} instances={canopies} castShadow receiveShadow />
      <Instances geometry={boxGeo} material={matWood} instances={tables} castShadow receiveShadow />
      <Instances geometry={boxGeo} material={matCrate} instances={crates} />
      <Instances geometry={boxGeo} material={matBulb} instances={bulbs} />
    </group>
  );
});
