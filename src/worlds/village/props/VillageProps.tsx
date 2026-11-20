import React, { memo, useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { BUILDING_SLOTS, HOUSE_SLOTS, POWER_POLES, RIVER, ROADS, ZONES, distToRoads, heightAt, riverZ } from '../layout';
import { Instances, type InstanceData } from '../../shared/instancing';
import { lightsOn } from '../../shared/palette';
import { seededRandom } from '../../shared/seededRandom';
import { useWorldAnimation } from '../../shared/useWorldTime';
import type { TimeOfDay, Weather } from '../../shared/types';

function isBlockedForProp(x: number, z: number): boolean {
  if (distToRoads(x, z) < 1.5) return true;
  if (Math.abs(z - riverZ(x)) < RIVER.width * 0.5 + 1.5) return true;
  if (Math.abs(x - ZONES.field.center[0]) < 22.5 && Math.abs(z - ZONES.field.center[1]) < 14.5) return true;
  return false;
}

function insideAnyBuilding(x: number, z: number, pad = 0.8, ignoreId?: string): boolean {
  for (const b of BUILDING_SLOTS) {
    if (b.id === ignoreId) continue;
    const dx = x - b.position[0];
    const dz = z - b.position[2];
    const c = Math.cos(-b.rotationY);
    const s = Math.sin(-b.rotationY);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) < b.size[0] / 2 + pad && Math.abs(lz) < b.size[1] / 2 + pad) return true;
  }
  for (const h of HOUSE_SLOTS) {
    if (h.id === ignoreId) continue;
    const dx = x - h.position[0];
    const dz = z - h.position[2];
    const c = Math.cos(-h.rotationY);
    const s = Math.sin(-h.rotationY);
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    if (Math.abs(lx) < h.size[0] / 2 + pad && Math.abs(lz) < h.size[1] / 2 + pad) return true;
  }
  return false;
}

function mainRoadZ(x: number): number {
  const path = ROADS[0].path;
  if (x <= path[0][0]) return path[0][1];
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i];
    const [x1, z1] = path[i + 1];
    if (x <= x1) return z0 + ((x - x0) / (x1 - x0)) * (z1 - z0);
  }
  return path[path.length - 1][1];
}

const Flag: React.FC<{ position: [number, number, number]; time?: number; seed?: number }> = memo(
  ({ position, time, seed = 0 }) => {
    const ref = useRef<THREE.Group>(null);
    useWorldAnimation(
      time,
      (t) => {
        if (!ref.current) return;
        ref.current.rotation.y = Math.sin(t * 2.2 + seed) * 0.25;
        ref.current.scale.x = 1 + Math.sin(t * 4.5 + seed) * 0.06;
      },
      [seed]
    );
    return (
      <group position={position}>
        <mesh position={[0, 4, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 8, 6]} />
          <meshStandardMaterial color="#cfcfcf" metalness={0.4} roughness={0.5} />
        </mesh>
        <group ref={ref} position={[0, 7.2, 0]}>
          <mesh position={[0.6, 0.2, 0]} castShadow>
            <boxGeometry args={[1.2, 0.4, 0.03]} />
            <meshStandardMaterial color="#d62828" roughness={0.7} />
          </mesh>
          <mesh position={[0.6, -0.2, 0]} castShadow>
            <boxGeometry args={[1.2, 0.4, 0.03]} />
            <meshStandardMaterial color="#f4f4f4" roughness={0.7} />
          </mesh>
        </group>
      </group>
    );
  }
);

const Clothesline: React.FC<{ position: [number, number, number]; ry: number; seed: number; time?: number }> = memo(
  ({ position, ry, seed, time }) => {
    const clothes = useMemo(() => {
      const r = seededRandom(seed);
      const cols = ['#e63946', '#f1faee', '#457b9d', '#e9c46a', '#2a9d8f', '#f4a261'];
      return Array.from({ length: 5 }, (_, i) => ({
        x: -1.4 + i * 0.7,
        h: 0.7 + r() * 0.2,
        color: cols[Math.floor(r() * cols.length)],
      }));
    }, [seed]);

    const clothRefs = useRef<(THREE.Mesh | null)[]>([]);
    useWorldAnimation(
      time,
      (t) => {
        for (let i = 0; i < clothes.length; i++) {
          const m = clothRefs.current[i];
          if (m) m.rotation.x = Math.sin(t * 1.8 + seed + i) * 0.08;
        }
      },
      [clothes.length, seed]
    );

    return (
      <group position={position} rotation={[0, ry, 0]}>
        {[-1.8, 1.8].map((x) => (
          <mesh key={x} position={[x, 1.0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 2, 5]} />
            <meshStandardMaterial color="#6a4a28" />
          </mesh>
        ))}
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[3.6, 0.015, 0.015]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {clothes.map((c, i) => (
          <mesh
            key={i}
            ref={(el) => {
              clothRefs.current[i] = el;
            }}
            position={[c.x, 1.95 - c.h / 2, 0]}
          >
            <boxGeometry args={[0.5, c.h, 0.02]} />
            <meshStandardMaterial color={c.color} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }
);

const VillageSign: React.FC<{ position: [number, number, number]; ry: number }> = memo(({ position, ry }) => (
  <group position={position} rotation={[0, ry, 0]}>
    <mesh position={[-0.7, 1.1, 0]} castShadow><cylinderGeometry args={[0.06, 0.07, 2.2, 6]} /><meshStandardMaterial color="#5a3a20" /></mesh>
    <mesh position={[0.7, 1.1, 0]} castShadow><cylinderGeometry args={[0.06, 0.07, 2.2, 6]} /><meshStandardMaterial color="#5a3a20" /></mesh>
    <mesh position={[0, 1.8, 0]} castShadow><boxGeometry args={[1.8, 0.7, 0.08]} /><meshStandardMaterial color="#2a5a3a" /></mesh>
    <mesh position={[0, 2.22, 0]}><boxGeometry args={[2.0, 0.1, 0.25]} /><meshStandardMaterial color="#7a4a28" /></mesh>
  </group>
));

export interface VillagePropsInput {
  time?: number;
  timeOfDay?: TimeOfDay;
  weather?: Weather;
}

export const VillageProps: React.FC<VillagePropsInput> = memo(({ time, timeOfDay = 'day', weather = 'clear' }) => {
  const lit = lightsOn(timeOfDay, weather);

  const data = useMemo(() => {
    const r = seededRandom(4242);
    const posts: InstanceData[] = [];
    const rails: InstanceData[] = [];
    const barrels: InstanceData[] = [];
    const logs: InstanceData[] = [];
    const hay: InstanceData[] = [];
    const pots: InstanceData[] = [];
    const potPlants: InstanceData[] = [];
    const crates: InstanceData[] = [];
    const bins: InstanceData[] = [];
    const troughs: InstanceData[] = [];
    const gravestones: InstanceData[] = [];
    const lampPosts: InstanceData[] = [];
    const lampBulbs: InstanceData[] = [];
    const lines: { p: [number, number, number]; ry: number; seed: number }[] = [];

    const fence = (cx: number, cz: number, ry: number, w: number, d: number, ownerId?: string) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      const to = (lx: number, lz: number): [number, number, number] => {
        const x = cx + lx * c + lz * s, z = cz - lx * s + lz * c;
        return [x, heightAt(x, z), z];
      };
      const sides: [number, number, number, number, boolean][] = [
        [-w / 2, -d / 2, w / 2, -d / 2, false],
        [-w / 2, d / 2, w / 2, d / 2, true],
        [-w / 2, -d / 2, -w / 2, d / 2, false],
        [w / 2, -d / 2, w / 2, d / 2, false],
      ];
      sides.forEach(([x0, z0, x1, z1, front]) => {
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(2, Math.round(len / 1.6));
        const ang = Math.atan2(z1 - z0, x1 - x0);
        const pts: { pt: [number, number, number]; skip: boolean }[] = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const lx = x0 + (x1 - x0) * t, lz = z0 + (z1 - z0) * t;
          const isGate = front && Math.abs(lx) < 1.4;
          const pt = to(lx, lz);
          const blocked = isBlockedForProp(pt[0], pt[2]) || insideAnyBuilding(pt[0], pt[2], 0.3, ownerId);
          pts.push({ pt, skip: isGate || blocked });
          if (!isGate && !blocked) {
            posts.push({ position: [pt[0], pt[1] + 0.5, pt[2]], rotationY: ry, scale: [0.1, 1, 0.1] });
          }
        }
        for (let i = 0; i < n; i++) {
          if (pts[i].skip || pts[i + 1].skip) continue;
          const a = pts[i].pt;
          const b = pts[i + 1].pt;
          const mx = (a[0] + b[0]) * 0.5;
          const mz = (a[2] + b[2]) * 0.5;
          if (isBlockedForProp(mx, mz) || insideAnyBuilding(mx, mz, 0.3, ownerId)) continue;
          const segLen = Math.hypot(b[0] - a[0], b[2] - a[2]);
          const my = (a[1] + b[1]) * 0.5;
          for (const y of [0.45, 0.85]) {
            rails.push({ position: [mx, my + y, mz], rotationY: ry - ang, scale: [segLen, 0.07, 0.04] });
          }
        }
      });
    };

    HOUSE_SLOTS.forEach((h, i) => {
      const [x, , z] = h.position;
      const ry = h.rotationY;
      const c = Math.cos(ry), s = Math.sin(ry);
      const loc = (lx: number, lz: number, dy = 0): [number, number, number] => {
        const px = x + lx * c + lz * s, pz = z - lx * s + lz * c;
        return [px, heightAt(px, pz) + dy, pz];
      };
      if (i % 3 !== 0) fence(x, z, ry, h.size[0] + 6, h.size[1] + 8, h.id);
      const side = r() > 0.5 ? 1 : -1;

      const b1 = loc(side * (h.size[0] / 2 + 0.8), 1, 0.45);
      if (!isBlockedForProp(b1[0], b1[2])) barrels.push({ position: b1, scale: [0.6, 0.9, 0.6] });

      const b2 = loc(side * (h.size[0] / 2 + 0.8), 2, 0.35);
      if (r() > 0.4 && !isBlockedForProp(b2[0], b2[2])) barrels.push({ position: b2, scale: [0.5, 0.7, 0.5] });

      for (let k = 0; k < 6; k++) {
        const lp = loc(-side * (h.size[0] / 2 + 1.0), -1 + (k % 3) * 0.3, 0.5);
        if (!isBlockedForProp(lp[0], lp[2])) {
          logs.push({ position: lp, rotationY: Math.PI / 2, scale: [0.14, 1.0, 0.14] });
        }
      }
      for (let k = 0; k < 3; k++) {
        const lp = loc(-side * (h.size[0] / 2 + 1.0), -1 + k * 0.3, 0.78);
        if (!isBlockedForProp(lp[0], lp[2])) {
          logs.push({ position: lp, rotationY: Math.PI / 2, scale: [0.14, 1.0, 0.14] });
        }
      }
      for (const px of [-1.5, 1.5]) {
        const pp = loc(px, h.size[1] / 2 + 1.4, 0.25);
        if (!isBlockedForProp(pp[0], pp[2])) {
          pots.push({ position: pp, scale: [0.4, 0.5, 0.4] });
          potPlants.push({ position: [pp[0], pp[1] + 0.33, pp[2]], scale: [0.35, 0.42, 0.35] });
        }
      }
      if (i % 4 === 1) {
        const cl = loc(-side * (h.size[0] / 2 + 4), 0);
        const clRy = ry + Math.PI / 2;
        const cc = Math.cos(clRy), ss = Math.sin(clRy);
        const endA: [number, number] = [cl[0] - 1.8 * cc, cl[2] + 1.8 * ss];
        const endB: [number, number] = [cl[0] + 1.8 * cc, cl[2] - 1.8 * ss];
        if (
          !isBlockedForProp(cl[0], cl[2]) &&
          !isBlockedForProp(endA[0], endA[1]) &&
          !isBlockedForProp(endB[0], endB[1]) &&
          !insideAnyBuilding(cl[0], cl[2], 0.4)
        ) {
          lines.push({ p: cl, ry: clRy, seed: i + 5 });
        }
      }
      if (i % 5 === 2) {
        const cp = loc(side * 2, h.size[1] / 2 + 2, 0.25);
        if (!isBlockedForProp(cp[0], cp[2])) {
          crates.push({ position: cp, rotationY: r() * 3, scale: [0.6, 0.5, 0.6] });
        }
      }
    });

    // Peternakan: pagar padang + palung pakan/minum + jerami
    const pens: [number, number, number, number][] = [[-110, -34, 26, 16], [-96, -62, 18, 14]];
    pens.forEach(([cx, cz, w, d]) => {
      fence(cx, cz, 0, w, d);
      if (!isBlockedForProp(cx - 3, cz)) {
        troughs.push({ position: [cx - 3, heightAt(cx - 3, cz) + 0.25, cz], rotationY: 0.2, scale: [2.4, 0.5, 0.7] });
      }
      if (!isBlockedForProp(cx + 4, cz + 2)) {
        troughs.push({ position: [cx + 4, heightAt(cx + 4, cz + 2) + 0.25, cz + 2], rotationY: -0.1, scale: [2.0, 0.5, 0.65] });
      }
    });

    BUILDING_SLOTS.forEach((b) => {
      const [x, , z] = b.position;
      if (b.kind === 'cowshed' || b.kind === 'goatshed' || b.kind === 'barn') {
        for (let k = 0; k < 4; k++) {
          const hx = x + 5 + k * 1.2, hz = z + 4 + (k % 2);
          if (!isBlockedForProp(hx, hz)) {
            hay.push({ position: [hx, heightAt(hx, hz) + 0.5, hz], rotationY: r() * 3, scale: [1.1, 1.0, 1.1] });
          }
        }
      }
      if (b.kind === 'warung' || b.kind === 'market') {
        for (let k = 0; k < 4; k++) {
          const cx = x + (k - 2) * 1.3, cz = z + (b.kind === 'market' ? 9 : 4);
          if (!isBlockedForProp(cx, cz)) {
            crates.push({ position: [cx, heightAt(cx, cz) + 0.25, cz], rotationY: r() * 3, scale: [0.6, 0.5, 0.6] });
          }
        }
        const bx = x + b.size[0] / 2 + 0.8, bz = z + 2;
        if (!isBlockedForProp(bx, bz)) {
          bins.push({ position: [bx, heightAt(bx, bz) + 0.35, bz], scale: [0.5, 0.7, 0.5] });
        }
      }
      if (b.kind === 'school') {
        for (const ox of [9, -9]) {
          const bx = x + ox, bz = z + 5;
          if (!isBlockedForProp(bx, bz)) {
            bins.push({ position: [bx, heightAt(bx, bz) + 0.35, bz], scale: [0.55, 0.7, 0.55] });
          }
        }
      }
      if (b.kind === 'mosque' || b.kind === 'school' || b.kind === 'hall') {
        fence(x, z, b.rotationY, b.size[0] + 10, b.size[1] + 10, b.id);
      }
    });

    // Kuburan di ZONES.cemetery (sebelah selatan musholla)
    const [cemX, cemZ] = ZONES.cemetery.center;
    fence(cemX, cemZ, 0, ZONES.cemetery.size[0], ZONES.cemetery.size[1]);
    for (let gx = -8; gx <= 8; gx += 4) {
      for (let gz = -6; gz <= 6; gz += 4) {
        if (r() < 0.2) continue;
        const px = cemX + gx + (r() - 0.5) * 0.6;
        const pz = cemZ + gz + (r() - 0.5) * 0.6;
        if (distToRoads(px, pz) < 1.5) continue;
        const py = heightAt(px, pz);
        gravestones.push({ position: [px, py + 0.3, pz - 0.4], scale: [0.35, 0.6, 0.16] });
        gravestones.push({ position: [px, py + 0.2, pz + 0.4], scale: [0.28, 0.4, 0.14] });
        gravestones.push({ position: [px, py + 0.06, pz], scale: [0.7, 0.12, 1.3] });
      }
    }

    // Lampu jalan desa sepanjang jalan utama (dijamin di luar jalan & bangunan)
    for (let lx = -120; lx <= 120; lx += 30) {
      const rz = mainRoadZ(lx);
      let placed = false;
      for (const offset of [3.4, -3.4, 4.4, -4.4]) {
        const lz = rz + offset;
        if (distToRoads(lx, lz) >= 0.8 && !insideAnyBuilding(lx, lz, 0.8)) {
          const ly = heightAt(lx, lz);
          lampPosts.push({ position: [lx, ly + 1.8, lz], scale: [0.12, 3.6, 0.12] });
          lampBulbs.push({ position: [lx, ly + 3.7, lz], scale: [0.32, 0.38, 0.32] });
          placed = true;
          break;
        }
      }
      if (!placed) continue;
    }

    // Tiang listrik & palangnya (instanced)
    const powerPoles: InstanceData[] = [];
    const powerCrossbars: InstanceData[] = [];
    for (const p of POWER_POLES) {
      const y = heightAt(p[0], p[2]);
      powerPoles.push({ position: [p[0], y + 4, p[2]] });
      powerCrossbars.push({ position: [p[0], y + 7.4, p[2]], scale: [0.15, 0.15, 2.2] });
      powerCrossbars.push({ position: [p[0], y + 6.7, p[2]], scale: [0.15, 0.15, 1.6] });
    }

    return {
      posts,
      rails,
      barrels,
      logs,
      hay,
      pots,
      potPlants,
      crates,
      bins,
      troughs,
      gravestones,
      lampPosts,
      lampBulbs,
      lines,
      powerPoles,
      powerCrossbars,
    };
  }, []);

  const geos = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    hay: new THREE.CylinderGeometry(0.5, 0.5, 1, 12),
    pot: new THREE.CylinderGeometry(0.5, 0.35, 1, 8),
    foliage: new THREE.DodecahedronGeometry(0.5, 0),
    powerPole: new THREE.CylinderGeometry(0.13, 0.18, 8, 8),
  }), []);

  const mats = useMemo(() => ({
    post: new THREE.MeshStandardMaterial({ color: '#7a5a34', roughness: 0.95 }),
    rail: new THREE.MeshStandardMaterial({ color: '#8a6a40', roughness: 0.95 }),
    barrel: new THREE.MeshStandardMaterial({ color: '#3a6a8a', roughness: 0.8 }),
    log: new THREE.MeshStandardMaterial({ color: '#8a5a32', roughness: 0.95 }),
    hay: new THREE.MeshStandardMaterial({ color: '#d8b84a', roughness: 0.95 }),
    pot: new THREE.MeshStandardMaterial({ color: '#b5603a', roughness: 0.9 }),
    foliage: new THREE.MeshStandardMaterial({ color: '#3e8a40', roughness: 0.85 }),
    crate: new THREE.MeshStandardMaterial({ color: '#9a7a48', roughness: 0.9 }),
    bin: new THREE.MeshStandardMaterial({ color: '#406048', roughness: 0.85 }),
    trough: new THREE.MeshStandardMaterial({ color: '#6a4a2a', roughness: 0.9 }),
    stone: new THREE.MeshStandardMaterial({ color: '#9a9e9a', roughness: 0.95 }),
    lampPost: new THREE.MeshStandardMaterial({ color: '#5a4228', roughness: 0.9 }),
    powerPole: new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 0.9 }),
    crossbar: new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 0.9 }),
    cable: new THREE.MeshBasicMaterial({ color: '#1a1a1a' }),
  }), []);

  const bulbMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: lit ? '#ffe89c' : '#a8bcc4',
    emissive: lit ? '#ffaa30' : '#000000',
    emissiveIntensity: lit ? 2.0 : 0,
    roughness: 0.3,
  }), [lit]);

  const flagSpots = useMemo(() => {
    const candidates: [number, number][] = [
      [-14, -14],
      [18, -14],
      [-52, -14],
      [6, 10.5],
    ];
    return candidates
      .filter(([x, z]) => distToRoads(x, z) >= 1.5 && !insideAnyBuilding(x, z, 0.8))
      .map(([x, z]): [number, number, number] => [x, heightAt(x, z), z]);
  }, []);

  const signSpots = useMemo(() => {
    const candidates: { x: number; z: number; ry: number }[] = [
      { x: -8, z: 10.5, ry: 0.2 },
      { x: 5.5, z: 52, ry: 0 },
    ];
    return candidates
      .filter(({ x, z }) => distToRoads(x, z) >= 0.8 && !insideAnyBuilding(x, z, 0.8))
      .map(({ x, z, ry }) => ({ pos: [x, heightAt(x, z), z] as [number, number, number], ry }));
  }, []);

  const poleCables = useMemo(() => {
    const pairs: { a: THREE.Vector3; b: THREE.Vector3 }[] = [];
    for (let i = 0; i < POWER_POLES.length - 1; i++) {
      const p = POWER_POLES[i];
      const q = POWER_POLES[i + 1];
      const py = heightAt(p[0], p[2]) + 7.4;
      const qy = heightAt(q[0], q[2]) + 7.4;
      for (const o of [-0.9, 0, 0.9]) {
        pairs.push({
          a: new THREE.Vector3(p[0], py, p[2] + o),
          b: new THREE.Vector3(q[0], qy, q[2] + o),
        });
      }
    }
    return pairs;
  }, []);

  const cableRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = cableRef.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const dir = new THREE.Vector3();
    const mid = new THREE.Vector3();
    for (let i = 0; i < poleCables.length; i++) {
      const { a, b } = poleCables[i];
      dir.subVectors(b, a);
      const len = dir.length();
      mid.addVectors(a, b).multiplyScalar(0.5);
      dummy.position.copy(mid);
      if (len > 0.0001) {
        dummy.quaternion.setFromUnitVectors(zAxis, dir.divideScalar(len));
      } else {
        dummy.quaternion.identity();
      }
      dummy.scale.set(0.025, 0.025, len);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [poleCables]);

  return (
    <group name="village-props">
      <Instances instances={data.posts} geometry={geos.box} material={mats.post} castShadow receiveShadow />
      <Instances instances={data.rails} geometry={geos.box} material={mats.rail} receiveShadow />
      <Instances instances={data.barrels} geometry={geos.cyl} material={mats.barrel} castShadow receiveShadow />
      <Instances instances={data.logs} geometry={geos.cyl} material={mats.log} receiveShadow />
      <Instances instances={data.hay} geometry={geos.hay} material={mats.hay} castShadow receiveShadow />
      <Instances instances={data.pots} geometry={geos.pot} material={mats.pot} receiveShadow />
      <Instances instances={data.potPlants} geometry={geos.foliage} material={mats.foliage} receiveShadow />
      <Instances instances={data.crates} geometry={geos.box} material={mats.crate} receiveShadow />
      <Instances instances={data.bins} geometry={geos.cyl} material={mats.bin} castShadow receiveShadow />
      <Instances instances={data.troughs} geometry={geos.box} material={mats.trough} castShadow receiveShadow />
      <Instances instances={data.gravestones} geometry={geos.box} material={mats.stone} receiveShadow />
      <Instances instances={data.lampPosts} geometry={geos.cyl} material={mats.lampPost} castShadow receiveShadow />
      <Instances instances={data.lampBulbs} geometry={geos.cyl} material={bulbMat} />

      <Instances instances={data.powerPoles} geometry={geos.powerPole} material={mats.powerPole} castShadow />
      <Instances instances={data.powerCrossbars} geometry={geos.box} material={mats.crossbar} />
      <instancedMesh ref={cableRef} args={[geos.box, mats.cable, poleCables.length]} />

      {data.lines.map((l, i) => (
        <Clothesline key={i} position={l.p} ry={l.ry} seed={l.seed} time={time} />
      ))}
      {flagSpots.map((p, i) => (
        <Flag key={i} position={p} time={time} seed={i * 1.7} />
      ))}
      {signSpots.map((s, i) => (
        <VillageSign key={i} position={s.pos} ry={s.ry} />
      ))}
    </group>
  );
});

export default VillageProps;
