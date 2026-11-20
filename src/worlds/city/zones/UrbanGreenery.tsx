import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Instances, seededRandom, type InstanceData } from '../../shared';
import { BLOCK_CENTERS, BLOCK_SIZE, SIDEWALK_H, busStops } from '../layout';
import { CITY_PALETTE } from '../palette';

/** Pohon jalanan di tepi trotoar dalam blok (bebas dari jalur pejalan kaki 8.15m & halte bus). */
export const UrbanGreenery = memo(function UrbanGreenery() {
  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.24, 2.4, 6), []);
  const crownGeo = useMemo(() => new THREE.DodecahedronGeometry(1.45, 1), []);
  const planterGeo = useMemo(() => new THREE.BoxGeometry(1.1, 0.42, 1.1), []);

  const matTrunk = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.treeTrunk, roughness: 0.9 }), []);
  const matLeaf = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85 }), []);
  const matPlanter = useMemo(() => new THREE.MeshStandardMaterial({ color: '#7a808a', roughness: 0.88 }), []);

  const { trunks, crowns, planters } = useMemo(() => {
    const r = seededRandom(2026);
    const t: InstanceData[] = [];
    const c: InstanceData[] = [];
    const pl: InstanceData[] = [];

    const edge = BLOCK_SIZE / 2 - 2.55;
    const offsets = [-28, 0, 28];

    for (const cx of BLOCK_CENTERS) {
      for (const cz of BLOCK_CENTERS) {
        const spots: [number, number][] = [];
        for (const o of offsets) {
          spots.push([cx + o, cz + edge]);
          spots.push([cx + o, cz - edge]);
          if (o !== 0) {
            spots.push([cx + edge, cz + o]);
            spots.push([cx - edge, cz + o]);
          }
        }
        for (const [px, pz] of spots) {
          if (r() < 0.25) continue;
          if (busStops.some((bs) => Math.hypot(px - bs.x, pz - bs.z) < 8.5)) continue;
          const sc = 0.85 + r() * 0.45;
          pl.push({ position: [px, SIDEWALK_H + 0.22, pz] });
          t.push({ position: [px, SIDEWALK_H + 1.2 * sc, pz], scale: sc });
          c.push({
            position: [px, SIDEWALK_H + 2.8 * sc, pz],
            scale: [sc, sc * (1.0 + r() * 0.3), sc],
            color: CITY_PALETTE.treeLeaves[Math.floor(r() * CITY_PALETTE.treeLeaves.length)],
          });
        }
      }
    }

    return { trunks: t, crowns: c, planters: pl };
  }, []);

  return (
    <group name="city-urban-greenery">
      <Instances geometry={planterGeo} material={matPlanter} instances={planters} receiveShadow />
      <Instances geometry={trunkGeo} material={matTrunk} instances={trunks} castShadow />
      <Instances geometry={crownGeo} material={matLeaf} instances={crowns} castShadow receiveShadow />
    </group>
  );
});
