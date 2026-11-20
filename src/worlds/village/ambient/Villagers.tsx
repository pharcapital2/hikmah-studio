import { memo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldAnimation } from '../../shared/useWorldTime';
import { groundY, wanderPose } from '../animals/rng';
import { alongPath } from '../vehicles/Vehicles';

export type VillagerRole = 'farmer' | 'child' | 'walker';

const SHIRT = ['#2b6cb0', '#b5503c', '#3d8b55', '#c9942a', '#7a5aa8'];
const SARONG_BOTTOMS = ['#1e293b', '#292524', '#14532d', '#312e81', '#451a03'];
const ACCENTS = ['#38bdf8', '#fde68a', '#fbcfe8', '#fbbf24', '#a7f3d0'];

function createBellTorsoGeo(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.17, 0.006),
    new THREE.Vector2(0.22, 0.045),
    new THREE.Vector2(0.215, 0.14),
    new THREE.Vector2(0.195, 0.26),
    new THREE.Vector2(0.165, 0.38),
    new THREE.Vector2(0.13, 0.48),
    new THREE.Vector2(0.09, 0.525),
    new THREE.Vector2(0.0, 0.54),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

function createVillagerSashGeo(): THREE.TubeGeometry {
  const pts: THREE.Vector3[] = [];
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const y = 0.29 - 0.15 * Math.cos(theta);
    const r = 0.22 - 0.22 * (y - 0.12) + 0.015;
    pts.push(new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta)));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  return new THREE.TubeGeometry(curve, 32, 0.02, 7, true);
}

function createNeckTowelGeo(): THREE.TubeGeometry {
  const pts = [
    new THREE.Vector3(-0.085, 0.29, 0.175),
    new THREE.Vector3(-0.105, 0.41, 0.135),
    new THREE.Vector3(-0.095, 0.505, 0.03),
    new THREE.Vector3(0.0, 0.515, -0.105),
    new THREE.Vector3(0.095, 0.505, 0.03),
    new THREE.Vector3(0.105, 0.41, 0.135),
    new THREE.Vector3(0.085, 0.29, 0.175),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false);
  return new THREE.TubeGeometry(curve, 24, 0.024, 7, false);
}

function createMiniBackpackGeo(): THREE.BoxGeometry {
  const g = new THREE.BoxGeometry(0.22, 0.24, 0.12);
  g.translate(0, 0.3, -0.21);
  return g;
}

function createSleeveCapGeo(): THREE.CylinderGeometry {
  const g = new THREE.CylinderGeometry(0.038, 0.044, 0.11, 8);
  return g;
}

const BELL_TORSO_GEO = createBellTorsoGeo();
const CHIBI_HEAD_GEO = new THREE.SphereGeometry(0.23, 14, 10);
const EYE_DOT_GEO = new THREE.SphereGeometry(0.022, 8, 6);
const STICK_LEG_GEO = new THREE.CylinderGeometry(0.026, 0.023, 0.54, 8);
const STICK_SHOE_GEO = new THREE.SphereGeometry(1, 10, 8);
const STICK_ARM_GEO = new THREE.CylinderGeometry(0.022, 0.02, 0.4, 8);
const STICK_HAND_GEO = new THREE.SphereGeometry(0.042, 8, 8);
const NECK_GEO = new THREE.CylinderGeometry(0.05, 0.062, 0.07, 10);

const VILLAGER_SASH_GEO = createVillagerSashGeo();
const NECK_TOWEL_GEO = createNeckTowelGeo();
const MINI_BACKPACK_GEO = createMiniBackpackGeo();
const SLEEVE_CAP_GEO = createSleeveCapGeo();
const COLLAR_GEO = new THREE.TorusGeometry(0.088, 0.014, 6, 14);
const BELT_GEO = new THREE.TorusGeometry(0.195, 0.013, 6, 16);
const BOW_GEO = new THREE.BoxGeometry(0.09, 0.04, 0.03);
const CARDIGAN_FLAP_GEO = new THREE.BoxGeometry(0.09, 0.34, 0.035);

const FARMER_HAT_GEO = new THREE.ConeGeometry(0.36, 0.15, 14);
const PECI_GEO = new THREE.CylinderGeometry(0.145, 0.162, 0.11, 12);
const HIJAB_GEO = new THREE.SphereGeometry(0.23, 14, 10);
const HIJAB_CROWN_GEO = new THREE.SphereGeometry(0.236, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44);
const HIJAB_COLLAR_GEO = new THREE.CylinderGeometry(0.14, 0.2, 0.16, 12);
const HAIR_CAP_GEO = new THREE.SphereGeometry(0.235, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52);
const HAIR_TUFT_GEO = new THREE.SphereGeometry(1, 8, 6);
const HOE_HANDLE_GEO = new THREE.CylinderGeometry(0.02, 0.022, 0.88, 8);
const HOE_BLADE_GEO = new THREE.BoxGeometry(0.15, 0.022, 0.2);

const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: '#111827', side: THREE.BackSide });
const STICK_MAT = new THREE.MeshToonMaterial({ color: '#111827' });
const SHOE_MAT = new THREE.MeshToonMaterial({ color: '#1e293b' });
const HEAD_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });
const EYE_MAT = new THREE.MeshBasicMaterial({ color: '#0f172a' });
const CAPING_MAT = new THREE.MeshToonMaterial({ color: '#d97706' });
const PECI_MAT = new THREE.MeshToonMaterial({ color: '#1e293b' });
const WHITE_PECI_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });
const HOE_HANDLE_MAT = new THREE.MeshToonMaterial({ color: '#78350f' });
const HOE_BLADE_MAT = new THREE.MeshToonMaterial({ color: '#94a3b8' });
const TOWEL_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });
const BELT_MAT = new THREE.MeshToonMaterial({ color: '#78350f' });
const PACK_MAT = new THREE.MeshToonMaterial({ color: '#334155' });

const TOON_CACHE = new Map<string, THREE.MeshToonMaterial>();
const OUTFIT_MAT_CACHE = new Map<string, THREE.MeshToonMaterial>();

function getToonMat(color: string): THREE.MeshToonMaterial {
  let m = TOON_CACHE.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color });
    TOON_CACHE.set(color, m);
  }
  return m;
}

type VillagerPattern = 'sarongSplit' | 'batik' | 'stripes' | 'polkaDress' | 'flannelOveralls';

function getVillagerOutfitMat(
  pattern: VillagerPattern,
  top: string,
  bottom: string,
  accent: string
): THREE.MeshToonMaterial {
  const key = `${pattern}:${top}:${bottom}:${accent}`;
  const cached = OUTFIT_MAT_CACHE.get(key);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    if (pattern === 'sarongSplit') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, size, 66);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 14, 3, 46);
      ctx.fillRect(size - 3, 14, 3, 46);
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 66, size, 62);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.3;
      for (let x = 0; x < size; x += 16) ctx.fillRect(x, 66, 4, 62);
      for (let y = 74; y < size; y += 16) ctx.fillRect(0, y, size, 3);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 63, size, 8);
      ctx.globalAlpha = 1;
    } else if (pattern === 'batik') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, size, 68);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.6;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 8; col++) {
          const cx = col * 16 + 8;
          const cy = row * 16 + 8;
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 68, size, 60);
      ctx.fillStyle = '#0f172a';
      ctx.globalAlpha = 0.45;
      ctx.fillRect(0, 66, size, 5);
      ctx.globalAlpha = 1;
    } else if (pattern === 'stripes') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, size, 68);
      ctx.fillStyle = accent;
      ctx.fillRect(0, 26, size, 8);
      ctx.fillRect(0, 42, size, 6);
      ctx.fillStyle = bottom;
      ctx.fillRect(0, 68, size, 60);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(28, 68, 4, 42);
      ctx.fillRect(size - 32, 68, 4, 42);
    } else if (pattern === 'polkaDress') {
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = bottom;
      ctx.fillRect(0, size - 24, size, 24);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.65;
      for (let y = 14; y < size - 24; y += 20) {
        const ox = (Math.floor(y / 20) % 2) * 10;
        for (let x = 6; x < size; x += 20) {
          ctx.beginPath();
          ctx.arc((x + ox) % size, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    } else {
      // flannelOveralls
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, size, 66);
      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.45;
      for (let x = 0; x < size; x += 16) ctx.fillRect(x, 0, 5, 66);
      for (let y = 14; y < 66; y += 16) ctx.fillRect(0, y, size, 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 66, size, 62);
      // Tali suspender werpak
      ctx.fillRect(18, 22, 10, 46);
      ctx.fillRect(size - 28, 22, 10, 46);
      ctx.fillRect(14, 42, 100, 26);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;

  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', map: tex });
  OUTFIT_MAT_CACHE.set(key, mat);
  return mat;
}

export interface VillagerProps {
  role: VillagerRole;
  position: [number, number, number];
  time?: number;
  seed?: number;
  /** Jika ada path, berjalan pulang-pergi sepanjang path; selain itu berkeliaran/bekerja di sekitar position. */
  path?: [number, number][];
}

export const Villager = memo(function Villager({ role, position, time, seed = 1, path }: VillagerProps) {
  const scale = role === 'child' ? 0.64 : 1;
  const shirt = SHIRT[(seed * 3) % SHIRT.length];
  const bottom = SARONG_BOTTOMS[(seed * 5) % SARONG_BOTTOMS.length];
  const accent = ACCENTS[(seed * 7) % ACCENTS.length];
  const isFemaleWalker = role === 'walker' && seed % 2 === 1;
  const isMaleWalker = role === 'walker' && seed % 2 === 0;
  const variant = (seed >> 1) % 2;
  const hijabColor = variant === 0 ? '#be185d' : shirt;
  const hairColor = seed % 2 === 0 ? '#1b1b20' : '#1c1410';
  const working = role === 'farmer' && !path;

  const outfitPattern: VillagerPattern =
    role === 'farmer'
      ? variant === 0
        ? 'flannelOveralls'
        : 'sarongSplit'
      : isMaleWalker
      ? variant === 0
        ? 'batik'
        : 'sarongSplit'
      : isFemaleWalker
      ? variant === 0
        ? 'polkaDress'
        : 'batik'
      : variant === 0
      ? 'stripes'
      : 'sarongSplit';

  const rootRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Group | null)[]>([]);
  const armRefs = useRef<(THREE.Group | null)[]>([]);
  const hoeRef = useRef<THREE.Group>(null);

  const posX = position[0];
  const posZ = position[2];

  useWorldAnimation(
    time,
    (t) => {
      let x = posX;
      let y = groundY(posX, posZ);
      let z = posZ;
      let heading = (seed % 6) * 1.05;
      let moving = false;

      if (path) {
        const p = alongPath(path, t * (role === 'child' ? 1.5 : 1.2) + seed * 5);
        x = p.x;
        y = p.y;
        z = p.z;
        heading = p.heading;
        moving = true;
      } else if (role === 'child') {
        const p = wanderPose(t, posX, posZ, 5, seed * 11, 1.7);
        x = p.x;
        y = p.y;
        z = p.z;
        heading = p.heading;
        moving = p.moving;
      }

      const st = t * (role === 'child' ? 9 : 6);
      const sw = moving ? Math.sin(st) * 0.6 : 0;
      const hoe = working ? Math.sin(t * 2.2 + seed) * 0.5 + 0.5 : 0;
      const bob = moving ? Math.abs(Math.sin(st)) * 0.03 : Math.sin(t * 1.5 + seed) * 0.005;

      if (rootRef.current) {
        rootRef.current.position.set(x, y, z);
        rootRef.current.rotation.y = heading;
      }
      if (bobRef.current) {
        bobRef.current.position.y = bob;
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.x = working ? 0.3 + hoe * 0.5 : 0;
      }
      for (let idx = 0; idx < 2; idx++) {
        const d = idx === 0 ? -1 : 1;
        const leg = legRefs.current[idx];
        if (leg) leg.rotation.x = sw * d;
        const arm = armRefs.current[idx];
        if (arm) arm.rotation.x = working ? -1.2 + hoe * 1.0 : -sw * d;
      }
      if (hoeRef.current) {
        hoeRef.current.rotation.x = -0.2 - hoe * 0.7;
      }
    },
    [role, posX, posZ, seed, path, working]
  );

  const torsoMat = getVillagerOutfitMat(outfitPattern, shirt, bottom, accent);
  const sleeveMat = getToonMat(shirt);
  const accentMat = getToonMat(accent);
  const hijabMat = getToonMat(hijabColor);
  const hairMat = getToonMat(hairColor);

  return (
    <group ref={rootRef} scale={scale}>
      <group ref={bobRef}>
        {[-1, 1].map((d, idx) => (
          <group
            key={d}
            ref={(el) => {
              legRefs.current[idx] = el;
            }}
            position={[d * 0.085, 0.55, 0]}
          >
            <mesh position={[0, -0.27, 0]} geometry={STICK_LEG_GEO} material={STICK_MAT} />
            <mesh position={[0, -0.54, 0.025]} scale={[0.044, 0.024, 0.072]} geometry={STICK_SHOE_GEO} material={SHOE_MAT} />
            <mesh position={[0, -0.54, 0.025]} scale={[0.049, 0.029, 0.078]} geometry={STICK_SHOE_GEO} material={OUTLINE_MAT} />
          </group>
        ))}

        <group ref={torsoRef} position={[0, 0.55, 0]}>
          <mesh castShadow geometry={BELL_TORSO_GEO} material={torsoMat} />
          <mesh position={[0, -0.013, 0]} scale={[1.07, 1.05, 1.07]} geometry={BELL_TORSO_GEO} material={OUTLINE_MAT} />
          <mesh position={[0, 0.55, 0]} geometry={NECK_GEO} material={HEAD_MAT} />

          {/* Aksesori siluet busana unik tiap peran & varian */}
          {role === 'farmer' && variant === 0 && (
            <>
              <mesh geometry={NECK_TOWEL_GEO} material={TOWEL_MAT} />
              <mesh scale={1.04} geometry={NECK_TOWEL_GEO} material={OUTLINE_MAT} />
            </>
          )}
          {role === 'farmer' && variant === 1 && (
            <mesh position={[0, 0.23, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={BELT_GEO} material={BELT_MAT} />
          )}
          {isMaleWalker && variant === 0 && (
            <mesh position={[0, 0.505, 0.004]} rotation={[Math.PI / 2 + 0.08, 0, 0]} geometry={COLLAR_GEO} material={TOWEL_MAT} />
          )}
          {isMaleWalker && variant === 1 && (
            <>
              <mesh geometry={VILLAGER_SASH_GEO} material={accentMat} />
              <mesh scale={1.03} geometry={VILLAGER_SASH_GEO} material={OUTLINE_MAT} />
            </>
          )}
          {isFemaleWalker && variant === 0 && (
            <mesh position={[0.06, 0.25, 0.195]} geometry={BOW_GEO} material={accentMat} />
          )}
          {isFemaleWalker && variant === 1 && (
            <>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.145, 0.24, 0.11]} rotation={[0.16, side * 0.45, side * -0.15]} geometry={CARDIGAN_FLAP_GEO} material={hijabMat} />
              ))}
            </>
          )}
          {role === 'child' && variant === 0 && (
            <mesh position={[0, 0.505, 0.004]} rotation={[Math.PI / 2 + 0.08, 0, 0]} geometry={COLLAR_GEO} material={accentMat} />
          )}
          {role === 'child' && variant === 1 && (
            <>
              <mesh geometry={MINI_BACKPACK_GEO} material={PACK_MAT} />
              <mesh scale={[1.05, 1.04, 1.05]} geometry={MINI_BACKPACK_GEO} material={OUTLINE_MAT} />
            </>
          )}

          {[-1, 1].map((d, idx) => (
            <group
              key={d}
              ref={(el) => {
                armRefs.current[idx] = el;
              }}
              position={[d * 0.175, 0.47, 0]}
            >
              <mesh position={[0, -0.055, 0]} geometry={SLEEVE_CAP_GEO} material={sleeveMat} />
              <mesh position={[0, -0.055, 0]} scale={[1.14, 1.06, 1.14]} geometry={SLEEVE_CAP_GEO} material={OUTLINE_MAT} />
              <mesh position={[0, -0.2, 0]} geometry={STICK_ARM_GEO} material={STICK_MAT} />
              <mesh position={[0, -0.41, 0]} geometry={STICK_HAND_GEO} material={SHOE_MAT} />
              <mesh position={[0, -0.41, 0]} scale={1.16} geometry={STICK_HAND_GEO} material={OUTLINE_MAT} />
              {working && d === -1 && (
                <group ref={hoeRef} position={[0, -0.41, 0]}>
                  <mesh position={[0, -0.25, 0]} geometry={HOE_HANDLE_GEO} material={HOE_HANDLE_MAT} />
                  <group position={[0, -0.68, -0.02]} rotation={[0.35, 0, 0]}>
                    <mesh position={[0, 0, -0.09]} geometry={HOE_BLADE_GEO} material={HOE_BLADE_MAT} />
                    <mesh position={[0, 0, -0.09]} scale={[1.08, 1.4, 1.07]} geometry={HOE_BLADE_GEO} material={OUTLINE_MAT} />
                  </group>
                </group>
              )}
            </group>
          ))}

          <group position={[0, 0.78, 0]}>
            <mesh castShadow geometry={CHIBI_HEAD_GEO} material={HEAD_MAT} />
            <mesh scale={1.06} geometry={CHIBI_HEAD_GEO} material={OUTLINE_MAT} />
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.075, 0.02, 0.215]} geometry={EYE_DOT_GEO} material={EYE_MAT} />
            ))}

            {role === 'farmer' && (
              <group position={[0, 0.21, -0.01]} rotation={[-0.1, 0, 0]}>
                <mesh geometry={FARMER_HAT_GEO} material={CAPING_MAT} />
                <mesh scale={[1.05, 1.07, 1.05]} geometry={FARMER_HAT_GEO} material={OUTLINE_MAT} />
              </group>
            )}

            {isMaleWalker && (
              <group position={[0, 0.2, -0.01]} rotation={[-0.08, 0, 0]}>
                <mesh scale={[1.14, 1, 1.22]} geometry={PECI_GEO} material={variant === 1 ? WHITE_PECI_MAT : PECI_MAT} />
                <mesh scale={[1.21, 1.08, 1.29]} geometry={PECI_GEO} material={OUTLINE_MAT} />
              </group>
            )}

            {isFemaleWalker && (
              <group>
                <mesh position={[0, 0.01, -0.06]} scale={[1.1, 1.08, 0.94]} geometry={HIJAB_GEO} material={hijabMat} />
                <mesh position={[0, 0.01, -0.06]} scale={[1.15, 1.13, 0.99]} geometry={HIJAB_GEO} material={OUTLINE_MAT} />
                <mesh
                  position={[0, 0.05, -0.035]}
                  rotation={[-0.4, 0, 0]}
                  scale={[1.06, 1.04, 0.98]}
                  geometry={HIJAB_CROWN_GEO}
                  material={hijabMat}
                />
                <mesh
                  position={[0, 0.05, -0.035]}
                  rotation={[-0.4, 0, 0]}
                  scale={[1.11, 1.09, 1.03]}
                  geometry={HIJAB_CROWN_GEO}
                  material={OUTLINE_MAT}
                />
                <mesh position={[0, -0.21, -0.02]} scale={[1.05, 1, 0.9]} geometry={HIJAB_COLLAR_GEO} material={hijabMat} />
                <mesh position={[0, -0.21, -0.02]} scale={[1.11, 1.05, 0.96]} geometry={HIJAB_COLLAR_GEO} material={OUTLINE_MAT} />
              </group>
            )}

            {role === 'child' && (
              <group>
                <mesh position={[0, 0.03, -0.04]} rotation={[-0.25, 0, 0]} geometry={HAIR_CAP_GEO} material={hairMat} />
                <mesh position={[0, 0.03, -0.04]} rotation={[-0.25, 0, 0]} scale={1.05} geometry={HAIR_CAP_GEO} material={OUTLINE_MAT} />
                <mesh
                  position={[0.02, 0.19, 0.13]}
                  rotation={[0.35, 0.1, -0.2]}
                  scale={[0.1, 0.048, 0.072]}
                  geometry={HAIR_TUFT_GEO}
                  material={hairMat}
                />
                <mesh
                  position={[0.02, 0.19, 0.13]}
                  rotation={[0.35, 0.1, -0.2]}
                  scale={[0.11, 0.056, 0.082]}
                  geometry={HAIR_TUFT_GEO}
                  material={OUTLINE_MAT}
                />
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
});
