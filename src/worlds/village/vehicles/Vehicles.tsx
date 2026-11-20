import { forwardRef, memo, useRef } from 'react';
import * as THREE from 'three';
import { useWorldAnimation } from '../../shared/useWorldTime';
import { groundY } from '../animals/rng';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYL = new THREE.CylinderGeometry(1, 1, 1, 10);

const BELL_PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.165, 0.006],
  [0.21, 0.045],
  [0.205, 0.135],
  [0.185, 0.25],
  [0.155, 0.365],
  [0.125, 0.46],
  [0.088, 0.505],
  [0.0, 0.52],
];

function createBellTorsoGeo(): THREE.LatheGeometry {
  const pts = BELL_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, 14);
}

function bellRadiusAtY(y: number): number {
  for (let i = 1; i < BELL_PROFILE.length; i++) {
    const [r0, y0] = BELL_PROFILE[i - 1];
    const [r1, y1] = BELL_PROFILE[i];
    if (y <= y1) {
      const t = (y - y0) / Math.max(y1 - y0, 1e-4);
      return r0 + (r1 - r0) * Math.max(0, Math.min(1, t));
    }
  }
  return 0;
}

function mergeStaticGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geos.map((g) => {
    const ni = g.index ? g.toNonIndexed() : g.clone();
    if (!ni.getAttribute('normal')) ni.computeVertexNormals();
    return ni;
  });
  let total = 0;
  for (const g of nonIndexed) total += g.getAttribute('position').count;
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  let off = 0;
  for (const g of nonIndexed) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      const b = (off + i) * 3;
      pos[b] = p.getX(i);
      pos[b + 1] = p.getY(i);
      pos[b + 2] = p.getZ(i);
      norm[b] = n.getX(i);
      norm[b + 1] = n.getY(i);
      norm[b + 2] = n.getZ(i);
    }
    off += p.count;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.computeBoundingSphere();
  return merged;
}

function createWrapShellGeo(
  ys: number[],
  phiStart: number,
  phiEnd: number,
  innerOff: number,
  outerOff: number,
  segs = 12
): THREE.BufferGeometry {
  const profile: [number, number][] = ys.map((y) => [bellRadiusAtY(y), y]);
  const m = profile.length;
  const cols = segs + 1;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let side = 0; side < 2; side++) {
    const off = side === 0 ? outerOff : innerOff;
    for (let i = 0; i < m; i++) {
      const [r0, y] = profile[i];
      const r = r0 + off;
      for (let j = 0; j < cols; j++) {
        const phi = phiStart + (j / segs) * (phiEnd - phiStart);
        positions.push(r * Math.sin(phi), y, r * Math.cos(phi));
      }
    }
  }

  const innerBase = m * cols;
  for (let i = 0; i < m - 1; i++) {
    for (let j = 0; j < segs; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j + 1;
      const d = (i + 1) * cols + j;
      indices.push(a, b, c, a, c, d);
      const ia = innerBase + a;
      const ib = innerBase + b;
      const ic = innerBase + c;
      const id = innerBase + d;
      indices.push(ia, ic, ib, ia, id, ic);
    }
  }

  const ptAt = (i: number, j: number, off: number): [number, number, number] => {
    const [r0, y] = profile[i];
    const r = r0 + off;
    const phi = phiStart + (j / segs) * (phiEnd - phiStart);
    return [r * Math.sin(phi), y, r * Math.cos(phi)];
  };
  const pushCapQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number]
  ) => {
    const base = positions.length / 3;
    positions.push(...p0, ...p1, ...p2, ...p3);
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  for (let i = 0; i < m - 1; i++) {
    pushCapQuad(ptAt(i, 0, innerOff), ptAt(i, 0, outerOff), ptAt(i + 1, 0, outerOff), ptAt(i + 1, 0, innerOff));
    pushCapQuad(
      ptAt(i, segs, outerOff),
      ptAt(i, segs, innerOff),
      ptAt(i + 1, segs, innerOff),
      ptAt(i + 1, segs, outerOff)
    );
  }
  for (let j = 0; j < segs; j++) {
    pushCapQuad(ptAt(0, j, innerOff), ptAt(0, j + 1, innerOff), ptAt(0, j + 1, outerOff), ptAt(0, j, outerOff));
    pushCapQuad(
      ptAt(m - 1, j, outerOff),
      ptAt(m - 1, j + 1, outerOff),
      ptAt(m - 1, j + 1, innerOff),
      ptAt(m - 1, j, innerOff)
    );
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createNeckTowelGeo(): THREE.BufferGeometry {
  const neckRoll = new THREE.TorusGeometry(0.094, 0.023, 8, 14, Math.PI * 1.2);
  neckRoll.rotateZ(-Math.PI * 0.1);
  neckRoll.rotateX(Math.PI / 2 + 0.18);
  neckRoll.rotateY(Math.PI);
  neckRoll.translate(0, 0.495, -0.005);

  const parts: THREE.BufferGeometry[] = [neckRoll];
  for (const side of [-1, 1]) {
    const tipCap = new THREE.SphereGeometry(0.023, 6, 6);
    tipCap.translate(side * 0.088, 0.484, 0.034);
    parts.push(tipCap);

    const flap = new THREE.BoxGeometry(0.054, 0.155, 0.021);
    flap.rotateX(-0.31);
    flap.rotateY(side * 0.35);
    flap.rotateZ(-side * 0.06);
    flap.translate(side * 0.068, 0.405, 0.142);
    parts.push(flap);
  }
  return mergeStaticGeos(parts);
}

function createMiniBackpackGeo(): THREE.BufferGeometry {
  const pack = new THREE.BoxGeometry(0.185, 0.2, 0.095);
  const topDome = new THREE.CylinderGeometry(0.092, 0.092, 0.095, 10);
  topDome.rotateX(Math.PI / 2);
  topDome.scale(1, 0.55, 1);
  topDome.translate(0, 0.1, 0);

  const pocket = new THREE.BoxGeometry(0.135, 0.09, 0.032);
  pocket.translate(0, -0.042, -0.055);

  const loop = new THREE.TorusGeometry(0.026, 0.008, 6, 10, Math.PI);
  loop.translate(0, 0.148, 0.01);

  return mergeStaticGeos([pack, topDome, pocket, loop]);
}

function createSleeveCapGeo(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.055),
    new THREE.Vector2(0.046, -0.055),
    new THREE.Vector2(0.05, -0.042),
    new THREE.Vector2(0.044, 0.012),
    new THREE.Vector2(0.034, 0.042),
    new THREE.Vector2(0.0, 0.055),
  ];
  return new THREE.LatheGeometry(pts, 10);
}

function createCollarGeo(): THREE.TorusGeometry {
  const g = new THREE.TorusGeometry(0.082, 0.017, 8, 16);
  g.rotateX(Math.PI / 2 + 0.08);
  return g;
}

function createCapBrimGeo(): THREE.BufferGeometry {
  const brim = new THREE.CylinderGeometry(0.16, 0.16, 0.018, 10, 1, false, -Math.PI * 0.36, Math.PI * 0.72);
  brim.translate(0, -0.042, 0.09);
  return brim;
}

const BELL_TORSO_GEO = createBellTorsoGeo();
const CHIBI_HEAD_GEO = new THREE.SphereGeometry(0.22, 14, 10);
const EYE_DOT_GEO = new THREE.SphereGeometry(0.021, 8, 6);
const STICK_LEG_GEO = new THREE.CylinderGeometry(0.025, 0.022, 0.52, 8);
const STICK_SHOE_GEO = new THREE.SphereGeometry(1, 10, 8);
const STICK_ARM_GEO = new THREE.CylinderGeometry(0.021, 0.019, 0.4, 8);
const STICK_HAND_GEO = new THREE.SphereGeometry(0.04, 8, 8);
const NECK_GEO = new THREE.CylinderGeometry(0.048, 0.06, 0.07, 10);
const CART_HAT_GEO = new THREE.ConeGeometry(0.35, 0.145, 14);
const PECI_GEO = new THREE.CylinderGeometry(0.14, 0.156, 0.105, 12);
const CAP_BRIM_GEO = createCapBrimGeo();

const ROMPI_GEO = createWrapShellGeo([0.24, 0.31, 0.38, 0.46], 0.44, Math.PI * 2 - 0.44, 0.008, 0.024, 12);
const NECK_TOWEL_GEO = createNeckTowelGeo();
const MINI_BACKPACK_GEO = createMiniBackpackGeo();
const SLEEVE_CAP_GEO = createSleeveCapGeo();
const COLLAR_GEO = createCollarGeo();

const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: '#111827', side: THREE.BackSide });
const STICK_MAT = new THREE.MeshToonMaterial({ color: '#111827' });
const SHOE_MAT = new THREE.MeshToonMaterial({ color: '#1e293b' });
const CHIBI_HEAD_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });
const EYE_MAT = new THREE.MeshBasicMaterial({ color: '#0f172a' });
const CAPING_MAT = new THREE.MeshToonMaterial({ color: '#d97706' });
const PECI_MAT = new THREE.MeshToonMaterial({ color: '#1e293b' });
const WHITE_SHIRT_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });
const TOWEL_MAT = new THREE.MeshToonMaterial({ color: '#f8fafc' });

const TOON_CACHE = new Map<string, THREE.MeshToonMaterial>();
const STD_CACHE = new Map<string, THREE.MeshStandardMaterial>();
const RIDER_TEX_CACHE = new Map<string, THREE.CanvasTexture>();
const RIDER_MAT_CACHE = new Map<string, THREE.MeshToonMaterial>();

function getToonMat(color: string): THREE.MeshToonMaterial {
  let m = TOON_CACHE.get(color);
  if (!m) {
    m = new THREE.MeshToonMaterial({ color });
    TOON_CACHE.set(color, m);
  }
  return m;
}

function getStdMat(color: string, emissive: string, emissiveIntensity: number): THREE.MeshStandardMaterial {
  const key = `${color}|${emissive}|${emissiveIntensity}`;
  let m = STD_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity });
    STD_CACHE.set(key, m);
  }
  return m;
}

function getRiderOutfitMat(
  kind: 'kusir' | 'flannelSarong' | 'stripes',
  primary: string,
  secondary: string,
  accent: string
): THREE.MeshToonMaterial {
  const key = `${kind}:${primary}:${secondary}:${accent}`;
  const cached = RIDER_MAT_CACHE.get(key);
  if (cached) return cached;

  let tex = RIDER_TEX_CACHE.get(key);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (kind === 'kusir') {
        // Kemeja putih berkancing + sarung gelap khas kusir
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 18, 3, 44);
        ctx.fillRect(125, 18, 3, 44);
        ctx.fillStyle = '#334155';
        for (const by of [28, 38, 48]) {
          ctx.fillRect(0, by, 1.5, 2.5);
          ctx.fillRect(126.5, by, 1.5, 2.5);
        }
        ctx.fillStyle = secondary;
        ctx.fillRect(0, 64, 128, 64);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.32;
        for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 64, 4, 64);
        for (let y = 72; y < 128; y += 16) ctx.fillRect(0, y, 128, 3);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 61, 128, 8);
        ctx.globalAlpha = 1;
      } else if (kind === 'flannelSarong') {
        // Flanel kotak-kotak + sarung kotak-kotak dengan lipatan pinggang
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.5;
        for (let x = 0; x < 128; x += 16) ctx.fillRect(x, 0, 5, 64);
        for (let y = 16; y < 64; y += 16) ctx.fillRect(0, y, 128, 5);
        ctx.globalAlpha = 1;

        ctx.fillStyle = secondary;
        ctx.fillRect(0, 64, 128, 64);
        ctx.fillStyle = '#f8fafc';
        ctx.globalAlpha = 0.25;
        for (let x = 8; x < 128; x += 16) ctx.fillRect(x, 64, 3, 64);
        for (let y = 72; y < 128; y += 16) ctx.fillRect(0, y, 128, 3);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 61, 128, 8);
        ctx.fillRect(0, 104, 128, 5);
        ctx.globalAlpha = 1;
      } else {
        // Kaos olahraga garis horizontal + celana gelap
        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, 128, 68);
        ctx.fillStyle = accent;
        ctx.fillRect(0, 32, 128, 8);
        ctx.fillRect(0, 46, 128, 6);
        ctx.fillStyle = secondary;
        ctx.fillRect(0, 68, 128, 60);
        ctx.fillStyle = accent;
        ctx.fillRect(29, 68, 5, 44);
        ctx.fillRect(94, 68, 5, 44);
        ctx.fillStyle = '#0f172a';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(0, 104, 128, 5);
        ctx.globalAlpha = 1;
      }
    }
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.needsUpdate = true;
    RIDER_TEX_CACHE.set(key, tex);
  }

  const mat = new THREE.MeshToonMaterial({ color: '#ffffff', map: tex });
  RIDER_MAT_CACHE.set(key, mat);
  return mat;
}

const Wheel = memo(
  forwardRef<THREE.Group, { r: number; w?: number }>(function Wheel({ r, w = 0.06 }, ref) {
    const rimMat = getToonMat('#3a2a1c');
    const spokeMat = getToonMat('#8a6a44');
    return (
      <group ref={ref}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow geometry={UNIT_CYL} scale={[r, w, r]} material={rimMat} />
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[(i * Math.PI) / 3, 0, 0]}
            geometry={UNIT_BOX}
            scale={[w * 1.3, r * 1.9, 0.03]}
            material={spokeMat}
          />
        ))}
      </group>
    );
  })
);

/** Posisi sepanjang polyline (pulang-pergi) dengan ketinggian terrain & kemiringan `pitch` di jembatan. */
export function alongPath(path: [number, number][], dist: number) {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const l = Math.hypot(path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]);
    segs.push(l);
    total += l;
  }
  if (total <= 0.001) {
    const [x, z] = path[0] ?? [0, 0];
    return { x, y: groundY(x, z), z, heading: 0, pitch: 0 };
  }
  const m = ((dist % (total * 2)) + total * 2) % (total * 2);
  const fwd = m < total;
  let d = fwd ? m : total * 2 - m;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i] || i === segs.length - 1) {
      const segLen = Math.max(segs[i], 0.001);
      const t = Math.min(d / segLen, 1);
      const [x0, z0] = path[i];
      const [x1, z1] = path[i + 1];
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      const hd = Math.atan2(x1 - x0, z1 - z0) + (fwd ? 0 : Math.PI);
      const y = groundY(x, z);
      const step = 0.7;
      const ax = x + Math.sin(hd) * step;
      const az = z + Math.cos(hd) * step;
      const bx = x - Math.sin(hd) * step;
      const bz = z - Math.cos(hd) * step;
      const pitch = Math.max(-0.28, Math.min(0.28, -Math.atan2(groundY(ax, az) - groundY(bx, bz), step * 2)));
      return { x, y, z, heading: hd, pitch };
    }
    d -= segs[i];
  }
  return { x: 0, y: 0, z: 0, heading: 0, pitch: 0 };
}

export interface PathVehicleProps {
  path: [number, number][];
  time?: number;
  speed?: number;
  offset?: number;
  night?: boolean;
}

const HORSE_LEGS: [number, number, number][] = [
  [0, 0.55, 0.17],
  [Math.PI, 0.55, -0.17],
  [Math.PI, -0.55, 0.17],
  [0, -0.55, -0.17],
];

export const Horse = memo(function Horse({ time, speed }: { time?: number; speed: number }) {
  const bodyRef = useRef<THREE.Group>(null);
  const neckRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const legRefs = useRef<(THREE.Group | null)[]>([]);

  useWorldAnimation(
    time,
    (t) => {
      const st = t * speed * 4.5;
      if (bodyRef.current) bodyRef.current.position.y = Math.abs(Math.sin(st)) * 0.03;
      if (neckRef.current) neckRef.current.rotation.x = Math.sin(st * 2) * 0.05 - 0.5;
      if (tailRef.current) tailRef.current.rotation.x = 0.6 + Math.sin(st) * 0.2;
      for (let i = 0; i < HORSE_LEGS.length; i++) {
        const g = legRefs.current[i];
        if (g) g.rotation.x = Math.sin(st + HORSE_LEGS[i][0]) * 0.6;
      }
    },
    [speed]
  );

  const bodyMat = getToonMat('#8a5230');
  const headMat = getToonMat('#7a4626');
  const maneMat = getToonMat('#2a1a10');
  const legMat = getToonMat('#6b3f22');

  return (
    <group>
      <group ref={bodyRef}>
        <mesh position={[0, 1.1, 0]} castShadow geometry={UNIT_BOX} scale={[0.5, 0.55, 1.4]} material={bodyMat} />
        <group ref={neckRef} position={[0, 1.3, 0.7]}>
          <mesh
            position={[0, 0.3, 0.1]}
            rotation={[0.4, 0, 0]}
            castShadow
            geometry={UNIT_BOX}
            scale={[0.25, 0.7, 0.3]}
            material={bodyMat}
          />
          <mesh position={[0, 0.65, 0.3]} castShadow geometry={UNIT_BOX} scale={[0.22, 0.25, 0.55]} material={headMat} />
          <mesh position={[0, 0.35, -0.05]} geometry={UNIT_BOX} scale={[0.06, 0.6, 0.12]} material={maneMat} />
        </group>
        <mesh ref={tailRef} position={[0, 1.2, -0.8]} geometry={UNIT_BOX} scale={[0.08, 0.6, 0.1]} material={maneMat} />
      </group>
      {HORSE_LEGS.map(([, z, x], i) => (
        <group
          key={i}
          ref={(el) => {
            legRefs.current[i] = el;
          }}
          position={[x, 0.8, z]}
        >
          <mesh position={[0, -0.4, 0]} castShadow geometry={UNIT_BOX} scale={[0.12, 0.8, 0.12]} material={legMat} />
        </group>
      ))}
    </group>
  );
});

/** Dokar: kuda berjalan + kusir + kereta beroda dua berputar + lentera malam. */
export const Dokar = memo(function Dokar({ path, time, speed = 2.4, offset = 0, night = false }: PathVehicleProps) {
  const rootRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);

  useWorldAnimation(
    time,
    (t) => {
      const p = alongPath(path, t * speed + offset);
      const rot = (t * speed + offset) / 0.45;
      if (rootRef.current) {
        rootRef.current.position.set(p.x, p.y, p.z);
        rootRef.current.rotation.set(p.pitch, p.heading, 0, 'YXZ');
      }
      for (let i = 0; i < 2; i++) {
        const w = wheelRefs.current[i];
        if (w) w.rotation.x = rot;
      }
    },
    [path, speed, offset]
  );

  const shaftMat = getToonMat('#5a3a20');
  const deckMat = getToonMat('#a86f3a');
  const sideMat = getToonMat('#8c5a2c');
  const canopyMat = getToonMat('#c2392b');
  const kusirTorsoMat = getRiderOutfitMat('kusir', '#f8fafc', '#1e293b', '#38bdf8');
  const vestMat = getToonMat('#334155');
  const lanternMat = getStdMat('#ffd580', '#ffb040', night ? 2 : 0.2);

  return (
    <group ref={rootRef}>
      <group position={[0, 0, 1.9]}>
        <Horse time={time} speed={speed} />
      </group>
      {/* tiang kekang */}
      <mesh position={[0.35, 0.95, 1.0]} geometry={UNIT_BOX} scale={[0.05, 0.05, 1.6]} material={shaftMat} />
      <mesh position={[-0.35, 0.95, 1.0]} geometry={UNIT_BOX} scale={[0.05, 0.05, 1.6]} material={shaftMat} />
      {/* bak kereta */}
      <mesh position={[0, 0.8, -0.2]} castShadow geometry={UNIT_BOX} scale={[1.2, 0.12, 1.7]} material={deckMat} />
      <mesh position={[0, 1.15, -1.0]} castShadow geometry={UNIT_BOX} scale={[1.2, 0.6, 0.08]} material={sideMat} />
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} position={[x, 1.1, -0.2]} castShadow geometry={UNIT_BOX} scale={[0.06, 0.5, 1.7]} material={sideMat} />
      ))}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, 1.9, -0.5]} geometry={UNIT_BOX} scale={[0.05, 1.0, 0.05]} material={shaftMat} />
      ))}
      <mesh position={[0, 2.4, -0.4]} castShadow geometry={UNIT_BOX} scale={[1.5, 0.08, 1.5]} material={canopyMat} />
      {/* kusir chibi-stickman berbusana kemeja putih + rompi tradisional + sarung */}
      <group position={[0, 0.92, 0.32]}>
        {[-1, 1].map((d) => (
          <group key={d} position={[d * 0.08, 0.05, 0.08]} rotation={[-1.25, 0, 0]}>
            <mesh position={[0, -0.195, 0]} scale={[1, 0.75, 1]} geometry={STICK_LEG_GEO} material={STICK_MAT} />
            <mesh position={[0, -0.39, 0.022]} scale={[0.042, 0.022, 0.068]} geometry={STICK_SHOE_GEO} material={SHOE_MAT} />
            <mesh position={[0, -0.39, 0.022]} scale={[0.047, 0.027, 0.074]} geometry={STICK_SHOE_GEO} material={OUTLINE_MAT} />
          </group>
        ))}
        <mesh castShadow scale={0.95} geometry={BELL_TORSO_GEO} material={kusirTorsoMat} />
        <mesh position={[0, -0.012, 0]} scale={[1.02, 1, 1.02]} geometry={BELL_TORSO_GEO} material={OUTLINE_MAT} />
        <mesh scale={0.95} geometry={ROMPI_GEO} material={vestMat} />
        <mesh scale={[1.01, 0.98, 1.01]} geometry={ROMPI_GEO} material={OUTLINE_MAT} />
        <mesh position={[0, 0.48, 0]} scale={0.95} geometry={COLLAR_GEO} material={WHITE_SHIRT_MAT} />
        <mesh position={[0, 0.52, 0]} geometry={NECK_GEO} material={CHIBI_HEAD_MAT} />
        {[-1, 1].map((d) => (
          <group key={d} position={[d * 0.165, 0.44, 0]} rotation={[-0.95, 0, -d * 0.08]}>
            <mesh position={[0, -0.055, 0]} geometry={SLEEVE_CAP_GEO} material={WHITE_SHIRT_MAT} />
            <mesh position={[0, -0.055, 0]} scale={[1.14, 1.06, 1.14]} geometry={SLEEVE_CAP_GEO} material={OUTLINE_MAT} />
            <mesh position={[0, -0.2, 0]} geometry={STICK_ARM_GEO} material={STICK_MAT} />
            <mesh position={[0, -0.41, 0]} geometry={STICK_HAND_GEO} material={SHOE_MAT} />
            <mesh position={[0, -0.41, 0]} scale={1.16} geometry={STICK_HAND_GEO} material={OUTLINE_MAT} />
          </group>
        ))}
        <group position={[0, 0.74, 0]}>
          <mesh castShadow geometry={CHIBI_HEAD_GEO} material={CHIBI_HEAD_MAT} />
          <mesh scale={1.06} geometry={CHIBI_HEAD_GEO} material={OUTLINE_MAT} />
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.072, 0.018, 0.206]} geometry={EYE_DOT_GEO} material={EYE_MAT} />
          ))}
          <group position={[0, 0.19, -0.01]} rotation={[-0.08, 0, 0]}>
            <mesh scale={[1.14, 1, 1.22]} geometry={PECI_GEO} material={PECI_MAT} />
            <mesh scale={[1.21, 1.08, 1.29]} geometry={PECI_GEO} material={OUTLINE_MAT} />
          </group>
        </group>
      </group>
      {/* lentera */}
      <mesh position={[0.62, 1.35, 0.45]} geometry={UNIT_BOX} scale={[0.12, 0.18, 0.12]} material={lanternMat} />
      {[-0.7, 0.7].map((x, idx) => (
        <group key={x} position={[x, 0.45, -0.2]}>
          <Wheel
            ref={(el) => {
              wheelRefs.current[idx] = el;
            }}
            r={0.45}
          />
        </group>
      ))}
    </group>
  );
});

/** Gerobak kayu dengan muatan hasil bumi & roda berputar. */
export const Cart = memo(function Cart({ path, time, speed = 1.0, offset = 0 }: PathVehicleProps) {
  const rootRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Group | null)[]>([]);
  const leg0Ref = useRef<THREE.Group>(null);
  const leg1Ref = useRef<THREE.Group>(null);

  useWorldAnimation(
    time,
    (t) => {
      const p = alongPath(path, t * speed + offset);
      const rot = (t * speed + offset) / 0.35;
      const step = Math.sin(t * speed * 5);
      if (rootRef.current) {
        rootRef.current.position.set(p.x, p.y, p.z);
        rootRef.current.rotation.set(p.pitch, p.heading, 0, 'YXZ');
      }
      for (let i = 0; i < 2; i++) {
        const w = wheelRefs.current[i];
        if (w) w.rotation.x = rot;
      }
      if (leg0Ref.current) leg0Ref.current.rotation.x = step * 0.55;
      if (leg1Ref.current) leg1Ref.current.rotation.x = -step * 0.55;
    },
    [path, speed, offset]
  );

  const deckMat = getToonMat('#9b6a38');
  const sideMat = getToonMat('#7d5328');
  const shaftMat = getToonMat('#5a3a20');
  const shirtMat = getToonMat('#b5673b');
  const cartTorsoMat = getRiderOutfitMat('flannelSarong', '#b5673b', '#292524', '#fbbf24');

  return (
    <group ref={rootRef}>
      <mesh position={[0, 0.6, 0]} castShadow geometry={UNIT_BOX} scale={[0.9, 0.1, 1.3]} material={deckMat} />
      {[-0.45, 0.45].map((x) => (
        <mesh key={x} position={[x, 0.85, 0]} castShadow geometry={UNIT_BOX} scale={[0.06, 0.4, 1.3]} material={sideMat} />
      ))}
      <mesh position={[0, 0.85, -0.65]} geometry={UNIT_BOX} scale={[0.9, 0.4, 0.06]} material={sideMat} />
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[-0.25 + i * 0.25, 0.85, 0.1]}
          castShadow
          geometry={UNIT_BOX}
          scale={[0.24, 0.32, 0.34]}
          material={getToonMat(i % 2 ? '#d7b04a' : '#7fae4c')}
        />
      ))}
      {[-0.5, 0.5].map((x, idx) => (
        <group key={x} position={[x, 0.35, -0.1]}>
          <Wheel
            ref={(el) => {
              wheelRefs.current[idx] = el;
            }}
            r={0.35}
          />
        </group>
      ))}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, 0.7, -1.1]} geometry={UNIT_BOX} scale={[0.05, 0.05, 1.1]} material={shaftMat} />
      ))}
      {/* pendorong gerobak chibi-stickman berflanel + handuk leher + caping */}
      <group position={[0, 0, -1.55]}>
        <group ref={leg0Ref} position={[-0.085, 0.53, 0]}>
          <mesh position={[0, -0.26, 0]} geometry={STICK_LEG_GEO} material={STICK_MAT} />
          <mesh position={[0, -0.52, 0.025]} scale={[0.044, 0.024, 0.072]} geometry={STICK_SHOE_GEO} material={SHOE_MAT} />
          <mesh position={[0, -0.52, 0.025]} scale={[0.049, 0.029, 0.078]} geometry={STICK_SHOE_GEO} material={OUTLINE_MAT} />
        </group>
        <group ref={leg1Ref} position={[0.085, 0.53, 0]}>
          <mesh position={[0, -0.26, 0]} geometry={STICK_LEG_GEO} material={STICK_MAT} />
          <mesh position={[0, -0.52, 0.025]} scale={[0.044, 0.024, 0.072]} geometry={STICK_SHOE_GEO} material={SHOE_MAT} />
          <mesh position={[0, -0.52, 0.025]} scale={[0.049, 0.029, 0.078]} geometry={STICK_SHOE_GEO} material={OUTLINE_MAT} />
        </group>
        <group position={[0, 0.53, 0]} rotation={[0.25, 0, 0]}>
          <mesh castShadow geometry={BELL_TORSO_GEO} material={cartTorsoMat} />
          <mesh position={[0, -0.012, 0]} scale={[1.07, 1.05, 1.07]} geometry={BELL_TORSO_GEO} material={OUTLINE_MAT} />
          <mesh geometry={NECK_TOWEL_GEO} material={TOWEL_MAT} />
          <mesh scale={1.04} geometry={NECK_TOWEL_GEO} material={OUTLINE_MAT} />
          <mesh position={[0, 0.53, 0]} geometry={NECK_GEO} material={CHIBI_HEAD_MAT} />
          {[-1, 1].map((d) => (
            <group key={d} position={[d * 0.17, 0.44, 0]} rotation={[-0.78, 0, -d * 0.15]}>
              <mesh position={[0, -0.055, 0]} geometry={SLEEVE_CAP_GEO} material={shirtMat} />
              <mesh position={[0, -0.055, 0]} scale={[1.14, 1.06, 1.14]} geometry={SLEEVE_CAP_GEO} material={OUTLINE_MAT} />
              <mesh position={[0, -0.2, 0]} geometry={STICK_ARM_GEO} material={STICK_MAT} />
              <mesh position={[0, -0.41, 0]} geometry={STICK_HAND_GEO} material={SHOE_MAT} />
              <mesh position={[0, -0.41, 0]} scale={1.16} geometry={STICK_HAND_GEO} material={OUTLINE_MAT} />
            </group>
          ))}
          <group position={[0, 0.75, 0]}>
            <mesh castShadow geometry={CHIBI_HEAD_GEO} material={CHIBI_HEAD_MAT} />
            <mesh scale={1.06} geometry={CHIBI_HEAD_GEO} material={OUTLINE_MAT} />
            {[-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.072, 0.018, 0.206]} geometry={EYE_DOT_GEO} material={EYE_MAT} />
            ))}
            <group position={[0, 0.195, -0.01]} rotation={[-0.1, 0, 0]}>
              <mesh geometry={CART_HAT_GEO} material={CAPING_MAT} />
              <mesh scale={[1.05, 1.07, 1.05]} geometry={CART_HAT_GEO} material={OUTLINE_MAT} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
});

/** Sepeda dengan pengendara chibi-stickman, pedal & roda berputar. */
export const Bicycle = memo(function Bicycle({
  path,
  time,
  speed = 3.2,
  offset = 0,
  shirt = '#3f7fbf',
}: PathVehicleProps & { shirt?: string }) {
  const rootRef = useRef<THREE.Group>(null);
  const frontWheelRef = useRef<THREE.Group>(null);
  const rearWheelRef = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Group | null)[]>([]);

  useWorldAnimation(
    time,
    (t) => {
      const p = alongPath(path, t * speed + offset);
      const rot = (t * speed + offset) / 0.34;
      const sway = Math.sin(t * 2 + offset) * 0.03;
      const pedal = rot * 0.5;
      if (rootRef.current) {
        rootRef.current.position.set(p.x, p.y, p.z);
        rootRef.current.rotation.set(p.pitch, p.heading, sway, 'YXZ');
      }
      if (frontWheelRef.current) frontWheelRef.current.rotation.x = rot;
      if (rearWheelRef.current) rearWheelRef.current.rotation.x = rot;
      for (let i = 0; i < 2; i++) {
        const m = legRefs.current[i];
        if (m) {
          const l = Math.sin(pedal + i * Math.PI) * 0.24;
          m.position.y = 0.84 + l * 0.22;
          m.position.z = -0.16 + l * 0.22;
          m.rotation.x = -0.35 + l * 1.4;
        }
      }
    },
    [path, speed, offset]
  );

  const frameMat = getToonMat('#c0392b');
  const shirtMat = getToonMat(shirt);
  const bikeTorsoMat = getRiderOutfitMat('stripes', shirt, '#1e293b', '#fde047');
  const packMat = getToonMat('#2563eb');
  const capMat = getToonMat('#1e3a8a');

  return (
    <group ref={rootRef}>
      <group position={[0, 0.34, 0.5]}>
        <Wheel ref={frontWheelRef} r={0.34} w={0.04} />
      </group>
      <group position={[0, 0.34, -0.5]}>
        <Wheel ref={rearWheelRef} r={0.34} w={0.04} />
      </group>
      <mesh position={[0, 0.65, 0]} rotation={[0.1, 0, 0]} geometry={UNIT_BOX} scale={[0.04, 0.04, 1.0]} material={frameMat} />
      <mesh position={[0, 0.9, 0.5]} geometry={UNIT_BOX} scale={[0.5, 0.04, 0.04]} material={frameMat} />
      <mesh position={[0, 0.65, 0.5]} geometry={UNIT_BOX} scale={[0.04, 0.6, 0.04]} material={frameMat} />
      <mesh position={[0, 0.74, -0.16]} geometry={UNIT_BOX} scale={[0.035, 0.18, 0.035]} material={STICK_MAT} />
      <mesh position={[0, 0.83, -0.16]} geometry={UNIT_BOX} scale={[0.14, 0.04, 0.22]} material={SHOE_MAT} />
      {/* pengendara chibi-stickman berkaos garis + ransel + topi pet */}
      <group position={[0, 0.84, -0.18]} rotation={[0.32, 0, 0]}>
        <mesh castShadow scale={0.94} geometry={BELL_TORSO_GEO} material={bikeTorsoMat} />
        <mesh position={[0, -0.012, 0]} scale={[1.01, 0.99, 1.01]} geometry={BELL_TORSO_GEO} material={OUTLINE_MAT} />
        <mesh scale={0.94} geometry={MINI_BACKPACK_GEO} material={packMat} />
        <mesh scale={[1.0, 0.98, 1.0]} geometry={MINI_BACKPACK_GEO} material={OUTLINE_MAT} />
        <mesh position={[0, 0.5, 0]} geometry={NECK_GEO} material={CHIBI_HEAD_MAT} />
        {[-1, 1].map((d) => (
          <group key={d} position={[d * 0.16, 0.42, 0]} rotation={[-0.95, 0, -d * 0.06]}>
            <mesh position={[0, -0.055, 0]} geometry={SLEEVE_CAP_GEO} material={shirtMat} />
            <mesh position={[0, -0.055, 0]} scale={[1.14, 1.06, 1.14]} geometry={SLEEVE_CAP_GEO} material={OUTLINE_MAT} />
            <mesh position={[0, -0.24, 0]} scale={[1, 1.2, 1]} geometry={STICK_ARM_GEO} material={STICK_MAT} />
            <mesh position={[0, -0.49, 0]} geometry={STICK_HAND_GEO} material={SHOE_MAT} />
            <mesh position={[0, -0.49, 0]} scale={1.16} geometry={STICK_HAND_GEO} material={OUTLINE_MAT} />
          </group>
        ))}
        <group position={[0, 0.72, 0]}>
          <mesh castShadow scale={0.95} geometry={CHIBI_HEAD_GEO} material={CHIBI_HEAD_MAT} />
          <mesh scale={1.01} geometry={CHIBI_HEAD_GEO} material={OUTLINE_MAT} />
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.068, 0.018, 0.195]} geometry={EYE_DOT_GEO} material={EYE_MAT} />
          ))}
          <group position={[0, 0.18, -0.01]} rotation={[-0.08, 0, 0]}>
            <mesh scale={[1.1, 0.96, 1.18]} geometry={PECI_GEO} material={capMat} />
            <mesh scale={[1.17, 1.04, 1.25]} geometry={PECI_GEO} material={OUTLINE_MAT} />
            <mesh geometry={CAP_BRIM_GEO} material={capMat} />
          </group>
        </group>
      </group>
      {[-0.085, 0.085].map((x, i) => (
        <group
          key={x}
          ref={(el) => {
            legRefs.current[i] = el;
          }}
          position={[x, 0.84, -0.16]}
        >
          <mesh position={[0, -0.22, 0]} scale={[1, 0.84, 1]} geometry={STICK_LEG_GEO} material={STICK_MAT} />
          <mesh position={[0, -0.44, 0.025]} scale={[0.042, 0.022, 0.068]} geometry={STICK_SHOE_GEO} material={SHOE_MAT} />
          <mesh position={[0, -0.44, 0.025]} scale={[0.047, 0.027, 0.074]} geometry={STICK_SHOE_GEO} material={OUTLINE_MAT} />
        </group>
      ))}
    </group>
  );
});
