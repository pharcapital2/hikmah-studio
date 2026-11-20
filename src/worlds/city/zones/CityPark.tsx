import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  Instances,
  lightsOn,
  seededRandom,
  useWorldAnimation,
  type InstanceData,
  type TimeOfDay,
  type Weather,
} from '../../shared';
import { PARK, SIDEWALK_H } from '../layout';
import { CITY_PALETTE } from '../palette';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
  time?: number;
}

const PLUME_INIT_POS: [number, number, number] = [0, 3.2, 0];

export const CityPark = memo(function CityPark({ timeOfDay, weather, time }: Props) {
  const glow = lightsOn(timeOfDay, weather);
  const s = PARK.size;
  const plumeRef = useRef<THREE.Mesh>(null);

  const trunkGeo = useMemo(() => new THREE.CylinderGeometry(0.22, 0.35, 3.0, 7), []);
  const crownGeo = useMemo(() => new THREE.DodecahedronGeometry(2.1, 1), []);
  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const matTrunk = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.treeTrunk, roughness: 0.9 }), []);
  const matLeaf = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85 }), []);
  const matBench = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a5832', roughness: 0.8 }), []);
  const matLamp = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: glow ? '#ffe8a8' : '#b8c4d0',
        emissive: glow ? '#ffc455' : '#000000',
        emissiveIntensity: glow ? 1.8 : 0,
      }),
    [glow],
  );

  const { trunks, crowns, benches, lamps, flowerBeds } = useMemo(() => {
    const r = seededRandom(5050);
    const t: InstanceData[] = [];
    const c: InstanceData[] = [];
    const b: InstanceData[] = [];
    const l: InstanceData[] = [];
    const fl: InstanceData[] = [];

    // Perimeter & lawn park trees (avoid central walkways, fountain < 12, gazebo, flower beds, and jogging track)
    for (let i = 0; i < 48; i++) {
      const lx = (r() - 0.5) * (s - 10);
      const lz = (r() - 0.5) * (s - 10);
      if (Math.abs(lx) < 4.5 || Math.abs(lz) < 4.5 || Math.hypot(lx, lz) < 12) continue;
      if (Math.hypot(lx - 22, lz + 22) < 6.8) continue;
      if (Math.abs(Math.abs(lx) - 16) < 4.5 && Math.abs(Math.abs(lz) - 16) < 3.0) continue;
      const ringDist = Math.max(Math.abs(lx), Math.abs(lz));
      if (ringDist >= 29.8 && ringDist <= 35.0) continue;
      const sc = 0.8 + r() * 0.7;
      const px = PARK.x + lx;
      const pz = PARK.z + lz;
      t.push({ position: [px, SIDEWALK_H + 1.5 * sc, pz], scale: sc });
      c.push({
        position: [px, SIDEWALK_H + 3.6 * sc, pz],
        scale: [sc * (0.9 + r() * 0.3), sc * (1.0 + r() * 0.4), sc * (0.9 + r() * 0.3)],
        color: CITY_PALETTE.treeLeaves[Math.floor(r() * CITY_PALETTE.treeLeaves.length)],
      });
    }

    // Benches & park lamps along cross walkways
    for (const d of [-24, -14, 14, 24]) {
      b.push({ position: [PARK.x + d, SIDEWALK_H + 0.45, PARK.z + 3.2], scale: [2.2, 0.5, 0.7] });
      b.push({ position: [PARK.x + d, SIDEWALK_H + 0.45, PARK.z - 3.2], scale: [2.2, 0.5, 0.7] });
      l.push({ position: [PARK.x + d + 2, SIDEWALK_H + 3.2, PARK.z + 3.4], scale: [0.35, 0.45, 0.35] });
      l.push({ position: [PARK.x + 3.4, SIDEWALK_H + 3.2, PARK.z + d], scale: [0.35, 0.45, 0.35] });
    }

    // Flower beds in 4 quadrants
    for (const qx of [-16, 16]) {
      for (const qz of [-16, 16]) {
        fl.push({
          position: [PARK.x + qx, SIDEWALK_H + 0.22, PARK.z + qz],
          scale: [6, 0.35, 3.2],
          color: qx * qz > 0 ? '#e85d75' : '#f2b830',
        });
      }
    }

    return { trunks: t, crowns: c, benches: b, lamps: l, flowerBeds: fl };
  }, [s]);

  // Animated water fountain spray height (scale/position mutated directly without recreating geometry)
  useWorldAnimation(time, (t) => {
    if (!plumeRef.current) return;
    const plumeH = 2.4 + Math.sin(t * 4.5) * 0.45;
    plumeRef.current.scale.y = plumeH;
    plumeRef.current.position.y = 2.0 + plumeH / 2;
  });

  return (
    <group name="city-park">
      {/* Lush park lawn */}
      <mesh position={[PARK.x, SIDEWALK_H + 0.03, PARK.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s - 2, s - 2]} />
        <meshStandardMaterial color={CITY_PALETTE.parkGrass} roughness={0.95} />
      </mesh>
      {/* Stone cross walkways + central plaza */}
      <mesh position={[PARK.x, SIDEWALK_H + 0.05, PARK.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[s - 2, 4.4]} />
        <meshStandardMaterial color={CITY_PALETTE.parkPath} roughness={0.9} />
      </mesh>
      <mesh position={[PARK.x, SIDEWALK_H + 0.05, PARK.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, s - 2]} />
        <meshStandardMaterial color={CITY_PALETTE.parkPath} roughness={0.9} />
      </mesh>
      <mesh position={[PARK.x, SIDEWALK_H + 0.06, PARK.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[10, 24]} />
        <meshStandardMaterial color={CITY_PALETTE.parkPath} roughness={0.88} />
      </mesh>

      {/* Central Water Fountain */}
      <group position={[PARK.x, SIDEWALK_H, PARK.z]}>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[5.5, 5.8, 0.8, 24]} />
          <meshStandardMaterial color="#bfc5cc" roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[5.0, 24]} />
          <meshStandardMaterial color="#4ea8de" roughness={0.2} metalness={0.2} />
        </mesh>
        <mesh position={[0, 1.3, 0]} castShadow>
          <cylinderGeometry args={[0.9, 1.4, 1.8, 12]} />
          <meshStandardMaterial color="#aeb6bf" roughness={0.75} />
        </mesh>
        {/* Animated water jet */}
        <mesh ref={plumeRef} position={PLUME_INIT_POS}>
          <cylinderGeometry args={[0.18, 0.65, 1, 10]} />
          <meshStandardMaterial color="#bce8ff" transparent opacity={0.72} />
        </mesh>
      </group>

      {/* Park Gazebo */}
      <group position={[PARK.x + 22, SIDEWALK_H, PARK.z - 22]}>
        <mesh position={[0, 0.2, 0]} receiveShadow>
          <cylinderGeometry args={[4.2, 4.4, 0.4, 8]} />
          <meshStandardMaterial color="#cbbba0" roughness={0.85} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 3.2, 1.8, Math.sin(a) * 3.2]} castShadow>
              <cylinderGeometry args={[0.12, 0.12, 3.2, 6]} />
              <meshStandardMaterial color="#6e472b" />
            </mesh>
          );
        })}
        <mesh position={[0, 4.1, 0]} castShadow>
          <coneGeometry args={[4.8, 1.8, 8]} />
          <meshStandardMaterial color="#9e4330" roughness={0.8} />
        </mesh>
      </group>

      <Instances geometry={trunkGeo} material={matTrunk} instances={trunks} castShadow />
      <Instances geometry={crownGeo} material={matLeaf} instances={crowns} castShadow receiveShadow />
      <Instances geometry={boxGeo} material={matBench} instances={benches} castShadow />
      <Instances geometry={boxGeo} material={matLamp} instances={lamps} />
      <Instances geometry={boxGeo} material={matLeaf} instances={flowerBeds} />
    </group>
  );
});
