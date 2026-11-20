import React, { memo } from 'react';
import * as THREE from 'three';

type V3 = [number, number, number];

export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
export const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 10);
const UNIT_SPHERE = new THREE.SphereGeometry(1, 10, 8);
const SKIP_BATCH_DATA = { skipBatch: true };

const MAT_CACHE = new Map<string, THREE.MeshStandardMaterial>();

function getStdMat(
  color: string,
  roughness = 0.9,
  metalness = 0,
  emissive = '#000000',
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  const key = `${color}|${roughness}|${metalness}|${emissive}|${emissiveIntensity}`;
  let mat = MAT_CACHE.get(key);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    });
    MAT_CACHE.set(key, mat);
  }
  return mat;
}

export const Box: React.FC<{ p: V3; s: V3; c: string; r?: V3; castShadow?: boolean }> = memo(
  ({ p, s, c, r, castShadow }) => (
    <mesh
      position={p}
      scale={s}
      rotation={r}
      geometry={UNIT_BOX}
      material={getStdMat(c, 0.9)}
      castShadow={castShadow ?? s[0] * s[1] * s[2] >= 0.35}
      receiveShadow
    />
  )
);

export const Cyl: React.FC<{ p: V3; r: number; h: number; c: string; seg?: number; castShadow?: boolean }> = memo(
  ({ p, r, h, c, castShadow = true }) => (
    <mesh
      position={p}
      scale={[r, h, r]}
      geometry={UNIT_CYL}
      material={getStdMat(c, 0.9)}
      castShadow={castShadow}
      receiveShadow
    />
  )
);

/** Gable roof along X axis. w = length(x), d = depth(z), h = rise */
export const GableRoof: React.FC<{ y: number; w: number; d: number; h: number; c: string }> = memo(
  ({ y, w, d, h, c }) => {
    const ang = Math.atan2(h, d / 2);
    const len = Math.hypot(h, d / 2) + 0.35;
    return (
      <group position={[0, y, 0]}>
        <Box p={[0, h / 2, d / 4]} s={[w + 0.6, 0.08, len]} c={c} r={[ang, 0, 0]} />
        <Box p={[0, h / 2, -d / 4]} s={[w + 0.6, 0.08, len]} c={c} r={[-ang, 0, 0]} />
        {/* bubungan atap */}
        <Box p={[0, h + 0.03, 0]} s={[w + 0.66, 0.1, 0.18]} c={c} />
      </group>
    );
  }
);

export const Window: React.FC<{ p: V3; lit?: boolean; ry?: number }> = memo(({ p, lit, ry = 0 }) => (
  <group position={p} rotation={[0, ry, 0]}>
    <mesh
      geometry={UNIT_BOX}
      scale={[0.7, 0.8, 0.06]}
      userData={SKIP_BATCH_DATA}
      material={getStdMat(lit ? '#ffd27a' : '#6a8aa0', 0.4, 0, lit ? '#ffb040' : '#000000', lit ? 1.5 : 0)}
    />
    <mesh
      position={[0, 0, -0.01]}
      geometry={UNIT_BOX}
      scale={[0.82, 0.92, 0.04]}
      material={getStdMat('#4a3320', 0.9)}
    />
  </group>
));

export const Door: React.FC<{ p: V3; c?: string }> = memo(({ p, c = '#5a3a20' }) => (
  <group position={p}>
    <mesh geometry={UNIT_BOX} scale={[0.95, 2.1, 0.08]} material={getStdMat(c, 0.9)} receiveShadow />
    <mesh position={[0.32, -0.05, 0.06]} geometry={UNIT_SPHERE} scale={0.04} material={getStdMat('#d4af37', 0.4, 0.5)} />
  </group>
));

export const Lantern: React.FC<{ p: V3; lit?: boolean }> = memo(({ p, lit }) => (
  <group position={p}>
    <Cyl p={[0, 0.14, 0]} r={0.08} h={0.05} c="#2c2c2c" castShadow={false} />
    <mesh
      geometry={UNIT_CYL}
      scale={[0.085, 0.22, 0.085]}
      userData={SKIP_BATCH_DATA}
      material={getStdMat(lit ? '#ffe8a3' : '#9ab0b8', 0.3, 0, lit ? '#ffae38' : '#000000', lit ? 1.8 : 0)}
    />
  </group>
));
