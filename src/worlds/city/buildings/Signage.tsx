import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Instances, lightsOn, seededRandom, type InstanceData, type TimeOfDay, type Weather } from '../../shared';
import { MARKET, PARK, ROAD_LINES, ROAD_WIDTH, SIDEWALK_H, lots } from '../layout';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

export const Signage = memo(function Signage({ timeOfDay, weather }: Props) {
  const glow = lightsOn(timeOfDay, weather);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), []);

  const matMetal = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2e3540', roughness: 0.6, metalness: 0.4 }), []);
  // Three.js instanced color multiplies base color AND white emissive? Actually emissive doesn't multiply by instanceColor,
  // so using 3 neon color groups gives vivid multi-colored glowing neon billboards & shop signs at night!
  const matNeonCyan = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38e8ff',
        emissive: glow ? '#38e8ff' : '#000000',
        emissiveIntensity: glow ? 1.8 : 0,
      }),
    [glow],
  );
  const matNeonPink = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ff4d8d',
        emissive: glow ? '#ff4d8d' : '#000000',
        emissiveIntensity: glow ? 1.8 : 0,
      }),
    [glow],
  );
  const matNeonGold = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffd23f',
        emissive: glow ? '#ffd23f' : '#000000',
        emissiveIntensity: glow ? 1.7 : 0,
      }),
    [glow],
  );

  const { poles, frames, cyanBoards, pinkBoards, goldBoards } = useMemo(() => {
    const p: InstanceData[] = [];
    const f: InstanceData[] = [];
    const c: InstanceData[] = [];
    const pk: InstanceData[] = [];
    const g: InstanceData[] = [];

    const pushBoard = (
      x: number,
      y: number,
      z: number,
      sx: number,
      sy: number,
      sz: number,
      idx: number,
    ) => {
      const target = idx % 3 === 0 ? c : idx % 3 === 1 ? pk : g;
      target.push({ position: [x, y, z], scale: [sx, sy, sz] });
    };

    const hitsBuildingOrZone = (x: number, z: number, pad: number) => {
      if (Math.abs(x - PARK.x) < PARK.size / 2 + pad && Math.abs(z - PARK.z) < PARK.size / 2 + pad) return true;
      if (Math.abs(x - MARKET.x) < MARKET.size / 2 + pad && Math.abs(z - MARKET.z) < MARKET.size / 2 + pad) return true;
      return lots.some(
        (lot) => Math.abs(x - lot.x) < lot.w / 2 + pad && Math.abs(z - lot.z) < lot.d / 2 + pad,
      );
    };

    // Roadside freestanding billboards near major intersections (clear of buildings & zones)
    let bi = 0;
    const off = ROAD_WIDTH / 2 + 2.5;
    for (const rx of [-100, 0, 100]) {
      for (const rz of [-100, 0, 100]) {
        const bx = rx + off;
        const bz = rz + ROAD_WIDTH / 2 + 12;
        if (hitsBuildingOrZone(bx, bz, 4.2)) continue;
        p.push({ position: [bx, 4.5, bz], scale: [0.35, 9, 0.35] });
        f.push({ position: [bx, 9.5, bz], scale: [7.6, 3.8, 0.45] });
        pushBoard(bx, 9.5, bz + 0.25, 7.1, 3.3, 0.08, bi++);
        pushBoard(bx, 9.5, bz - 0.25, 7.1, 3.3, 0.08, bi++);
      }
    }

    // Rooftop billboards on selected office buildings + shop signs (papan toko) on rukos
    for (const lot of lots) {
      const r = seededRandom(lot.seed + 313);
      if (lot.kind === 'office' && r() > 0.55) {
        const yTop = SIDEWALK_H + lot.h;
        f.push({ position: [lot.x, yTop + 2.4, lot.z + lot.d * 0.35], scale: [lot.w * 0.65, 3.2, 0.35] });
        pushBoard(lot.x, yTop + 2.4, lot.z + lot.d * 0.35 + 0.2, lot.w * 0.6, 2.8, 0.08, bi++);
      } else if (lot.kind === 'ruko') {
        const frontZ = lot.facing === 2 ? -lot.d / 2 - 0.22 : lot.d / 2 + 0.22;
        const signW = lot.w * (0.62 + r() * 0.22);
        f.push({ position: [lot.x, SIDEWALK_H + 4.05, lot.z + frontZ], scale: [signW + 0.2, 0.95, 0.16] });
        pushBoard(lot.x, SIDEWALK_H + 4.05, lot.z + frontZ + (lot.facing === 2 ? -0.1 : 0.1), signW, 0.78, 0.06, bi++);
      }
    }

    // Grounded neon totem signs along downtown commercial avenue (skip Taman Kota side)
    for (const z of [-75, -35]) {
      const sx = ROAD_LINES[2] + ROAD_WIDTH / 2 + 2.8;
      p.push({ position: [sx, 3.4, z], scale: [0.18, 6.8, 0.18] });
      f.push({ position: [sx, 5.2, z], scale: [0.3, 3.6, 1.2] });
      pushBoard(sx, 5.2, z, 0.34, 3.2, 1.0, bi++);
    }

    return { poles: p, frames: f, cyanBoards: c, pinkBoards: pk, goldBoards: g };
  }, []);

  return (
    <group name="city-signage">
      <Instances geometry={cylGeo} material={matMetal} instances={poles} castShadow />
      <Instances geometry={boxGeo} material={matMetal} instances={frames} castShadow />
      <Instances geometry={boxGeo} material={matNeonCyan} instances={cyanBoards} />
      <Instances geometry={boxGeo} material={matNeonPink} instances={pinkBoards} />
      <Instances geometry={boxGeo} material={matNeonGold} instances={goldBoards} />
    </group>
  );
});
