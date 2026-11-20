import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../../shared/seededRandom';
import { useWorldAnimation } from '../../shared/useWorldTime';
import { wanderPose } from './rng';

export type AnimalKind = 'cow' | 'goat' | 'chicken' | 'duck' | 'buffalo';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const TOON_CACHE = new Map<string, THREE.MeshToonMaterial>();

function getToonMat(color: string): THREE.MeshToonMaterial {
  let m = TOON_CACHE.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color });
    TOON_CACHE.set(color, m);
  }
  return m;
}

interface Spec {
  body: [number, number, number];
  color: string;
  accent: string;
  legH: number;
  neck: number;
  head: number;
  radius: number;
  speed: number;
  horns?: boolean;
}

const SPECS: Record<AnimalKind, Spec> = {
  cow: { body: [0.7, 0.75, 1.7], color: '#f2efe6', accent: '#3b2f2a', legH: 0.75, neck: 0.5, head: 0.4, radius: 6, speed: 0.5 },
  buffalo: { body: [0.8, 0.8, 1.9], color: '#4a4a4f', accent: '#2a2a2e', legH: 0.8, neck: 0.5, head: 0.42, radius: 8, speed: 0.4, horns: true },
  goat: { body: [0.35, 0.45, 0.85], color: '#d8c9a8', accent: '#6b5a40', legH: 0.5, neck: 0.3, head: 0.24, radius: 5, speed: 0.7, horns: true },
  chicken: { body: [0.18, 0.22, 0.3], color: '#b8532b', accent: '#e8c030', legH: 0.18, neck: 0.12, head: 0.1, radius: 3, speed: 0.5 },
  duck: { body: [0.2, 0.2, 0.34], color: '#f4f1e8', accent: '#e89a1c', legH: 0.1, neck: 0.12, head: 0.1, radius: 4, speed: 0.4 },
};

export interface AnimalProps {
  kind: AnimalKind;
  position: [number, number, number];
  time?: number;
  seed?: number;
  radius?: number;
  /** Override ketinggian Y (mis. bebek yang berenang di air sungai). */
  fixedY?: number;
}

export const Animal = memo(function Animal({ kind, position, time, seed = 1, radius, fixedY }: AnimalProps) {
  const s = SPECS[kind];
  const [bw, bh, bl] = s.body;
  const biped = kind === 'chicken' || kind === 'duck';
  const coatColor =
    kind === 'chicken' && seed % 3 === 0 ? '#f0ede4' : kind === 'goat' && seed % 2 === 0 ? '#5c4b37' : s.color;
  const legX = bw / 2 - 0.08 * bw;
  const legZ = bl / 2 - 0.15 * bl;
  const lw = Math.max(0.04, bw * 0.16);
  const legDefs: [number, number, number][] = useMemo(
    () =>
      biped
        ? [
            [0.04 + bw * 0.2, 1, 0],
            [-0.04 - bw * 0.2, -1, 0],
          ]
        : [
            [legX, 1, legZ],
            [-legX, -1, legZ],
            [legX, -1, -legZ],
            [-legX, 1, -legZ],
          ],
    [biped, bw, legX, legZ]
  );

  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const legRefs = useRef<(THREE.Group | null)[]>([]);

  const posX = position[0];
  const posZ = position[2];
  const rVal = radius ?? s.radius;

  useWorldAnimation(
    time,
    (t) => {
      const p = wanderPose(t, posX, posZ, rVal, seed * 17 + 3, s.speed);
      const stride = p.moving ? t * (s.speed * 6 + 2) : 0;
      const swing = p.moving ? 0.5 : 0;
      const bob = p.moving ? Math.abs(Math.sin(stride)) * 0.03 : Math.sin(t * 1.6 + seed) * 0.006;
      const grazing = !p.moving && kind !== 'duck' ? 0.55 + Math.sin(t * 1.4 + seed * 3) * 0.16 : 0;
      const waddle = biped ? Math.sin(stride) * 0.08 : 0;
      const y = fixedY !== undefined ? fixedY : p.y;

      if (rootRef.current) {
        rootRef.current.position.set(p.x, y, p.z);
        rootRef.current.rotation.y = p.heading;
      }
      if (bodyRef.current) {
        bodyRef.current.position.y = (fixedY !== undefined ? 0 : s.legH) + bob;
        bodyRef.current.rotation.z = waddle;
      }
      if (headRef.current) {
        headRef.current.rotation.x = grazing;
      }
      if (tailRef.current) {
        tailRef.current.rotation.x = 0.4 + Math.sin(t * 3 + seed) * 0.3;
      }
      if (fixedY === undefined) {
        const sVal = Math.sin(stride) * swing;
        for (let i = 0; i < legDefs.length; i++) {
          const g = legRefs.current[i];
          if (g) g.rotation.x = sVal * legDefs[i][1];
        }
      }
    },
    [kind, posX, posZ, rVal, seed, fixedY, s, biped, legDefs]
  );

  const coatMat = getToonMat(coatColor);
  const accentMat = getToonMat(s.accent);
  const hornMat = s.horns ? getToonMat('#d8d2c0') : undefined;
  const combMat = kind === 'chicken' ? getToonMat('#c92a2a') : undefined;
  const legMat = biped ? accentMat : coatMat;

  return (
    <group ref={rootRef}>
      <group ref={bodyRef} position={[0, fixedY !== undefined ? 0 : s.legH, 0]}>
        <mesh castShadow={!biped} position={[0, bh / 2, 0]} geometry={UNIT_BOX} scale={s.body} material={coatMat} />
        {kind === 'cow' && (
          <mesh
            position={[0.01, bh / 2 + 0.02, -0.2]}
            geometry={UNIT_BOX}
            scale={[bw + 0.02, bh * 0.6, bl * 0.3]}
            material={accentMat}
          />
        )}
        <group ref={headRef} position={[0, bh * 0.85, bl / 2]}>
          <mesh
            position={[0, s.neck / 2, s.neck * 0.3]}
            rotation={[0.5, 0, 0]}
            geometry={UNIT_BOX}
            scale={[bw * 0.45, s.neck, bw * 0.45]}
            material={coatMat}
          />
          <mesh
            position={[0, s.neck, s.neck * 0.6]}
            geometry={UNIT_BOX}
            scale={[s.head * 0.9, s.head, s.head * 1.3]}
            material={coatMat}
          />
          {/* moncong / paruh */}
          <mesh
            position={[0, s.neck - s.head * 0.15, s.neck * 0.6 + s.head * 0.8]}
            geometry={UNIT_BOX}
            scale={[s.head * 0.5, s.head * 0.4, s.head * 0.4]}
            material={accentMat}
          />
          {/* jengger ayam */}
          {kind === 'chicken' && (
            <mesh
              position={[0, s.neck + s.head * 0.65, s.neck * 0.6]}
              geometry={UNIT_BOX}
              scale={[0.03, 0.06, 0.08]}
              material={combMat}
            />
          )}
          {s.horns &&
            [-1, 1].map((d) => (
              <mesh
                key={d}
                position={[d * s.head * (kind === 'buffalo' ? 0.8 : 0.45), s.neck + s.head * 0.5, s.neck * 0.5]}
                rotation={[0, 0, d * (kind === 'buffalo' ? -0.7 : -0.35)]}
                geometry={UNIT_BOX}
                scale={[kind === 'buffalo' ? 0.55 : 0.18, 0.05, 0.05]}
                material={hornMat}
              />
            ))}
        </group>
        {/* ekor */}
        <mesh
          ref={tailRef}
          position={[0, bh * 0.8, -bl / 2 - 0.05]}
          geometry={UNIT_BOX}
          scale={[0.04, 0.04, bl * 0.3]}
          material={accentMat}
        />
      </group>
      {fixedY === undefined &&
        legDefs.map(([lx, , lz], i) => (
          <group
            key={i}
            ref={(el) => {
              legRefs.current[i] = el;
            }}
            position={[lx, s.legH, lz]}
          >
            <mesh position={[0, -s.legH / 2, 0]} geometry={UNIT_BOX} scale={[lw, s.legH, lw]} material={legMat} />
          </group>
        ))}
    </group>
  );
});

export interface HerdProps {
  kind: AnimalKind;
  center: [number, number, number];
  count: number;
  spread: number;
  time?: number;
  seed?: number;
  fixedY?: number;
}

/** Kelompok hewan dengan posisi awal seeded di sekitar center. */
export const Herd = memo(function Herd({ kind, center, count, spread, time, seed = 1, fixedY }: HerdProps) {
  const [cx, cy, cz] = center;
  const positions = useMemo(() => {
    const r = seededRandom(seed * 101 + 7);
    return Array.from({ length: count }, () => {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * spread;
      return [cx + Math.cos(a) * d, cy, cz + Math.sin(a) * d] as [number, number, number];
    });
  }, [cx, cy, cz, count, spread, seed]);

  const radius = Math.max(1.8, spread * 0.4);

  return (
    <group>
      {positions.map((pos, i) => (
        <Animal
          key={i}
          kind={kind}
          time={time}
          seed={seed * 31 + i}
          radius={radius}
          position={pos}
          fixedY={fixedY}
        />
      ))}
    </group>
  );
});
