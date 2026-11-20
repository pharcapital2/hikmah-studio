import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { getToonGradientTexture } from '../../../utils/toonGradient';

export interface RiceFieldZoneProps {
  isNight?: boolean;
  isGolden?: boolean;
  isPlaying?: boolean;
}

interface TerraceTier {
  xMin: number;
  xMax: number;
  plotXMin: number;
  plotXMax: number;
  bedY: number;
}

interface PlotSpan {
  zMin: number;
  zMax: number;
}

interface StalkInstanceData {
  x: number;
  y: number;
  z: number;
  rotY: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  phase: number;
}

interface RippleInstanceData {
  x: number;
  y: number;
  z: number;
  width: number;
  phase: number;
  speed: number;
}

interface PalmSpec {
  pos: [number, number, number];
  leanYaw: number;
  leanAmount: number;
  height: number;
  frondCount: number;
}

const BUND_WIDTH = 0.34;
const BUND_HEIGHT_ABOVE_BED = 0.13;

const TERRACE_TIERS: TerraceTier[] = [
  {
    xMin: 8.5,
    xMax: 13.0,
    plotXMin: 8.84,
    plotXMax: 12.83,
    bedY: 0.22,
  },
  {
    xMin: 13.0,
    xMax: 17.5,
    plotXMin: 13.17,
    plotXMax: 17.33,
    bedY: 0.48,
  },
  {
    xMin: 17.5,
    xMax: 22.0,
    plotXMin: 17.67,
    plotXMax: 21.66,
    bedY: 0.74,
  },
];

const Z_BUNDS = [-11.83, -6.75, -1.67, 3.33];

const PLOT_Z_SPANS: PlotSpan[] = [
  { zMin: -11.66, zMax: -6.92 },
  { zMin: -6.58, zMax: -1.84 },
  { zMin: -1.5, zMax: 3.16 },
];

const X_BUNDS: Array<{ x: number; topY: number }> = [
  { x: 8.67, topY: 0.35 },
  { x: 13.0, topY: 0.61 },
  { x: 17.5, topY: 0.87 },
  { x: 21.83, topY: 0.87 },
];

const PALM_SPECS: PalmSpec[] = [
  {
    pos: [9.2, 0.3, -6.5],
    leanYaw: 0.45,
    leanAmount: 0.82,
    height: 4.35,
    frondCount: 7,
  },
  {
    pos: [16.8, 0.4, -7.2],
    leanYaw: 2.65,
    leanAmount: 0.92,
    height: 4.85,
    frondCount: 8,
  },
  {
    pos: [17.5, 0.3, 1.5],
    leanYaw: -2.05,
    leanAmount: 0.78,
    height: 4.5,
    frondCount: 7,
  },
];

const PALM_TRUNK_SEGMENTS = 7;

function hash2D(x: number, z: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function mergeNonIndexedGeometries(
  geometries: THREE.BufferGeometry[]
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  let totalVertices = 0;

  for (const geom of geometries) {
    const nonIdx = geom.index ? geom.toNonIndexed() : geom;
    const pos = nonIdx.getAttribute('position');
    totalVertices += pos.count;
    parts.push(nonIdx);
    if (nonIdx !== geom) {
      geom.dispose();
    }
  }

  const positions = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const part of parts) {
    const posAttr = part.getAttribute('position');
    const array = posAttr.array as Float32Array;
    positions.set(array, offset);
    offset += array.length;
    part.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Builds a single low-poly rice clump (rumpun padi) with 5 curved tapered blades
 * anchored at y = 0 so instance rotation bends naturally from the submerged root.
 */
function createRiceClumpGeometry(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const bladeConfigs = [
    { angle: 0.0, rootR: 0.0, lean: 0.035, height: 0.54, radius: 0.028 },
    { angle: 0.35, rootR: 0.024, lean: 0.125, height: 0.48, radius: 0.026 },
    { angle: 1.92, rootR: 0.024, lean: 0.135, height: 0.44, radius: 0.026 },
    { angle: 3.49, rootR: 0.024, lean: 0.12, height: 0.49, radius: 0.026 },
    { angle: 5.06, rootR: 0.024, lean: 0.14, height: 0.45, radius: 0.026 },
  ];

  for (const cfg of bladeConfigs) {
    const blade = new THREE.ConeGeometry(cfg.radius, cfg.height, 3, 3);
    blade.translate(0, cfg.height * 0.5, 0);
    blade.rotateY(cfg.angle);

    const pos = blade.getAttribute('position');
    const cosA = Math.cos(cfg.angle);
    const sinA = Math.sin(cfg.angle);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = Math.max(0, Math.min(1, y / cfg.height));
      const radialShift = cfg.rootR + cfg.lean * t * t;
      pos.setX(i, pos.getX(i) + cosA * radialShift);
      pos.setZ(i, pos.getZ(i) + sinA * radialShift);
    }
    pos.needsUpdate = true;
    blades.push(blade);
  }

  return mergeNonIndexedGeometries(blades);
}

/**
 * Builds drooping rice grain panicle heads (bulir padi) positioned near the blade tips.
 */
function createRicePanicleGeometry(): THREE.BufferGeometry {
  const panicles: THREE.BufferGeometry[] = [];
  const tips = [
    { angle: 0.35, r: 0.145, y: 0.45 },
    { angle: 2.45, r: 0.15, y: 0.42 },
    { angle: 4.55, r: 0.14, y: 0.46 },
  ];

  for (const tip of tips) {
    const grain = new THREE.ConeGeometry(0.022, 0.12, 4);
    grain.rotateZ(-1.95);
    grain.rotateY(-tip.angle);
    grain.translate(
      Math.cos(tip.angle) * tip.r,
      tip.y,
      Math.sin(tip.angle) * tip.r
    );
    panicles.push(grain);
  }

  return mergeNonIndexedGeometries(panicles);
}

function isInClearing(x: number, z: number): boolean {
  // Clearing around Saung / Gubuk Sawah at [13.5, 0.35, -2.5]
  if (Math.abs(x - 13.5) < 1.32 && Math.abs(z - -2.5) < 1.28) {
    return true;
  }

  // Clearing around Scarecrow at [10.4, 0.3, -0.8]
  const dxScare = x - 10.4;
  const dzScare = z - -0.8;
  if (dxScare * dxScare + dzScare * dzScare < 0.52 * 0.52) {
    return true;
  }

  // Clearing around Coconut Palm bases
  for (const palm of PALM_SPECS) {
    const dx = x - palm.pos[0];
    const dz = z - palm.pos[2];
    if (dx * dx + dz * dz < 0.58 * 0.58) {
      return true;
    }
  }

  return false;
}

const CurvedCoconutPalm: React.FC<{
  spec: PalmSpec;
  palmIndex: number;
  gradientMap: THREE.DataTexture;
  frondColor: string;
  trunkColor: string;
  coconutColor: string;
  isPlaying: boolean;
}> = ({
  spec,
  palmIndex,
  gradientMap,
  frondColor,
  trunkColor,
  coconutColor,
  isPlaying,
}) => {
  const crownRef = useRef<THREE.Group | null>(null);
  const swayTimeRef = useRef(0);

  const segments = useMemo(() => {
    const list: Array<{
      midR: number;
      midY: number;
      len: number;
      tilt: number;
      rBottom: number;
      rTop: number;
    }> = [];

    for (let i = 0; i < PALM_TRUNK_SEGMENTS; i++) {
      const t0 = i / PALM_TRUNK_SEGMENTS;
      const t1 = (i + 1) / PALM_TRUNK_SEGMENTS;
      const y0 = t0 * spec.height;
      const y1 = t1 * spec.height;
      const r0 = spec.leanAmount * (t0 * t0 * 0.8 + t0 * 0.2);
      const r1 = spec.leanAmount * (t1 * t1 * 0.8 + t1 * 0.2);

      const dr = r1 - r0;
      const dy = y1 - y0;

      list.push({
        midR: (r0 + r1) * 0.5,
        midY: (y0 + y1) * 0.5,
        len: Math.hypot(dr, dy) + 0.045,
        tilt: Math.atan2(dr, dy),
        rBottom: 0.2 * (1 - t0 * 0.52),
        rTop: 0.2 * (1 - t1 * 0.52),
      });
    }
    return list;
  }, [spec.height, spec.leanAmount]);

  const crownTilt = segments[segments.length - 1]?.tilt ?? 0.2;

  useFrame((_, delta) => {
    if (!crownRef.current) return;
    if (isPlaying) {
      swayTimeRef.current += Math.min(delta, 0.05);
    }
    const t = swayTimeRef.current;
    crownRef.current.rotation.z =
      -crownTilt * 0.45 + Math.sin(t * 1.45 + palmIndex * 1.7) * 0.035;
    crownRef.current.rotation.x =
      Math.cos(t * 1.15 + palmIndex * 2.3) * 0.025;
  });

  const frondAngles = useMemo(
    () =>
      Array.from(
        { length: spec.frondCount },
        (_, i) => (i / spec.frondCount) * Math.PI * 2 + palmIndex * 0.35
      ),
    [spec.frondCount, palmIndex]
  );

  return (
    <group position={spec.pos} rotation={[0, -spec.leanYaw, 0]}>
      {/* Earthy root mound anchoring trunk into bund */}
      <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.38, 0]} />
        <meshToonMaterial color="#5c4033" gradientMap={gradientMap} />
        <Outlines thickness={0.02} color="#111827" />
      </mesh>

      {/* Curved Trunk Cylinder Segments */}
      {segments.map((seg, idx) => (
        <mesh
          key={`palm-${palmIndex}-seg-${idx}`}
          position={[seg.midR, seg.midY, 0]}
          rotation={[0, 0, -seg.tilt]}
          castShadow
          receiveShadow
        >
          <cylinderGeometry args={[seg.rTop, seg.rBottom, seg.len, 7]} />
          <meshToonMaterial
            color={idx % 2 === 0 ? trunkColor : '#92400e'}
            gradientMap={gradientMap}
          />
          <Outlines thickness={0.018} color="#111827" />
        </mesh>
      ))}

      {/* Crown: Coconut Cluster + Arched Low-Poly Palm Fronds */}
      <group ref={crownRef} position={[spec.leanAmount, spec.height - 0.04, 0]}>
        {/* Coconut cluster spheres */}
        {[
          { p: [0.16, -0.08, 0.14] as [number, number, number], r: 0.14 },
          { p: [-0.14, -0.1, 0.16] as [number, number, number], r: 0.13 },
          { p: [0.02, -0.11, -0.18] as [number, number, number], r: 0.14 },
        ].map((coco, cIdx) => (
          <mesh
            key={`palm-${palmIndex}-coco-${cIdx}`}
            position={coco.p}
            castShadow
          >
            <sphereGeometry args={[coco.r, 8, 6]} />
            <meshToonMaterial color={coconutColor} gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}

        {/* Arched Palm Fronds */}
        {frondAngles.map((angle, fIdx) => {
          const pitchLift = fIdx % 2 === 0 ? -0.24 : -0.14;
          return (
            <group key={`palm-${palmIndex}-frond-${fIdx}`} rotation={[0, angle, 0]}>
              {/* Inner ascending frond rib (boxGeometry) */}
              <mesh
                position={[0, 0.14, 0.44]}
                rotation={[pitchLift, 0, 0]}
                castShadow
              >
                <boxGeometry args={[0.32, 0.055, 0.92]} />
                <meshToonMaterial color={frondColor} gradientMap={gradientMap} />
                <Outlines thickness={0.016} color="#111827" />
              </mesh>
              {/* Outer drooping tapered frond blade (coneGeometry) */}
              <group position={[0, 0.24, 0.86]} rotation={[0.48, 0, 0]}>
                <mesh
                  position={[0, 0, 0.56]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[1.25, 1.0, 0.16]}
                  castShadow
                >
                  <coneGeometry args={[0.25, 1.15, 4]} />
                  <meshToonMaterial color={frondColor} gradientMap={gradientMap} />
                  <Outlines thickness={0.016} color="#111827" />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

export const RiceFieldZone: React.FC<RiceFieldZoneProps> = ({
  isNight = false,
  isGolden = false,
  isPlaying = true,
}) => {
  const gradientMap = useMemo(() => getToonGradientTexture(), []);
  const stalkMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const panicleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const rippleMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const scarecrowBodyRef = useRef<THREE.Group | null>(null);
  const windTimeRef = useRef(0);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const rippleDummy = useMemo(() => new THREE.Object3D(), []);

  // Theme colors consistent with VillageEnvironment.tsx
  const mudBundColor = isNight ? '#451a03' : isGolden ? '#854d0e' : '#78350f';
  const mudBedColor = isNight ? '#291509' : isGolden ? '#5c3415' : '#4a2c18';
  const waterColor = isNight ? '#0369a1' : isGolden ? '#38bdf8' : '#0ea5e9';
  const rippleColor = isNight ? '#7dd3fc' : isGolden ? '#fef08a' : '#e0f2fe';
  const stalkColor = isNight ? '#365314' : isGolden ? '#eab308' : '#65a30d';
  const panicleColor = isNight ? '#4d7c0f' : isGolden ? '#facc15' : '#a3e635';
  const grassBorderColor = isNight
    ? '#1e3a2f'
    : isGolden
      ? '#65a30d'
      : '#4d7c0f';
  const palmFrondColor = isNight
    ? '#14532d'
    : isGolden
      ? '#4d7c0f'
      : '#16a34a';
  const palmTrunkColor = isNight ? '#451a03' : '#78350f';
  const coconutColor = isNight ? '#365314' : '#65a30d';
  const roofMainColor = isNight ? '#5c2808' : '#92400e';
  const roofTrimColor = isNight ? '#713f12' : '#a16207';
  const lanternGlow = isNight ? '#fef08a' : isGolden ? '#fde047' : '#fcd34d';
  const capingColor = isNight ? '#854d0e' : isGolden ? '#eab308' : '#ca8a04';

  // Deterministic rice stalk positions across the 9 paddy plots (3 tiers x 3 plots)
  const stalkInstances = useMemo<StalkInstanceData[]>(() => {
    const list: StalkInstanceData[] = [];
    const margin = 0.34;
    const stepX = 0.56;
    const stepZ = 0.55;

    for (const tier of TERRACE_TIERS) {
      const startX = tier.plotXMin + margin;
      const endX = tier.plotXMax - margin;

      for (const plot of PLOT_Z_SPANS) {
        const startZ = plot.zMin + margin;
        const endZ = plot.zMax - margin;

        for (let gx = startX; gx <= endX; gx += stepX) {
          for (let gz = startZ; gz <= endZ; gz += stepZ) {
            const jx = (hash2D(gx, gz) - 0.5) * 0.12;
            const jz = (hash2D(gz + 17.3, gx + 9.1) - 0.5) * 0.12;
            const x = gx + jx;
            const z = gz + jz;

            if (isInClearing(x, z)) continue;

            const rScale = hash2D(gx * 2.1, gz * 1.7);
            const scaleY = 0.85 + rScale * 0.36;
            const scaleXZ = 0.88 + hash2D(gz * 3.1, gx * 0.7) * 0.28;

            list.push({
              x,
              y: tier.bedY + 0.005,
              z,
              rotY: hash2D(gx * 4.3, gz * 5.9) * Math.PI * 2,
              scaleX: scaleXZ,
              scaleY,
              scaleZ: scaleXZ,
              phase: x * 0.55 - z * 0.35,
            });
          }
        }
      }
    }
    return list;
  }, []);

  // Deterministic water surface shimmer streaks across the 9 flooded plots
  const rippleInstances = useMemo<RippleInstanceData[]>(() => {
    const list: RippleInstanceData[] = [];
    TERRACE_TIERS.forEach((tier, tIdx) => {
      PLOT_Z_SPANS.forEach((plot, pIdx) => {
        const cx = (tier.plotXMin + tier.plotXMax) * 0.5;
        const cz = (plot.zMin + plot.zMax) * 0.5;
        list.push(
          {
            x: cx - 0.7,
            y: tier.bedY + 0.038,
            z: cz - 0.8,
            width: 1.05,
            phase: tIdx * 1.4 + pIdx * 0.9,
            speed: 0.75 + (tIdx % 2) * 0.2,
          },
          {
            x: cx + 0.65,
            y: tier.bedY + 0.038,
            z: cz + 0.9,
            width: 0.85,
            phase: tIdx * 1.9 + pIdx * 1.3 + 2.1,
            speed: 0.65 + (pIdx % 2) * 0.25,
          }
        );
      });
    });
    return list;
  }, []);

  // Shared geometries & materials for InstancedMeshes with cleanup on unmount
  const stalkGeo = useMemo(() => createRiceClumpGeometry(), []);
  const panicleGeo = useMemo(() => createRicePanicleGeometry(), []);
  const rippleGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 0.14);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, []);

  const stalkMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#65a30d',
        gradientMap,
      }),
    [gradientMap]
  );

  const panicleMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#a3e635',
        gradientMap,
      }),
    [gradientMap]
  );

  const rippleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    []
  );

  // Sync material colors cleanly without recreating GPU materials
  useEffect(() => {
    stalkMat.color.set(stalkColor);
    panicleMat.color.set(panicleColor);
    rippleMat.color.set(rippleColor);
  }, [
    stalkMat,
    panicleMat,
    rippleMat,
    stalkColor,
    panicleColor,
    rippleColor,
  ]);

  // Dispose shared geometries and materials on unmount
  useEffect(() => {
    return () => {
      stalkGeo.dispose();
      panicleGeo.dispose();
      rippleGeo.dispose();
      stalkMat.dispose();
      panicleMat.dispose();
      rippleMat.dispose();
    };
  }, [stalkGeo, panicleGeo, rippleGeo, stalkMat, panicleMat, rippleMat]);

  // Initialize instance matrices immediately on mount so paused renders show full paddies
  useEffect(() => {
    const stalks = stalkMeshRef.current;
    const panicles = panicleMeshRef.current;
    if (stalks && panicles) {
      dummy.rotation.order = 'XZY';
      for (let i = 0; i < stalkInstances.length; i++) {
        const s = stalkInstances[i];
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(0, s.rotY, 0.03);
        dummy.scale.set(s.scaleX, s.scaleY, s.scaleZ);
        dummy.updateMatrix();
        stalks.setMatrixAt(i, dummy.matrix);
        panicles.setMatrixAt(i, dummy.matrix);
      }
      stalks.instanceMatrix.needsUpdate = true;
      panicles.instanceMatrix.needsUpdate = true;
    }

    const ripples = rippleMeshRef.current;
    if (ripples) {
      for (let i = 0; i < rippleInstances.length; i++) {
        const r = rippleInstances[i];
        rippleDummy.position.set(r.x, r.y, r.z);
        rippleDummy.rotation.set(0, 0, 0);
        rippleDummy.scale.set(r.width, 1, 1);
        rippleDummy.updateMatrix();
        ripples.setMatrixAt(i, rippleDummy.matrix);
      }
      ripples.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, rippleDummy, stalkInstances, rippleInstances]);

  // Gentle breeze sway across rice stalks, water shimmer, and scarecrow
  useFrame((_, delta) => {
    if (!isPlaying) return;

    const dt = Math.min(delta, 0.05);
    windTimeRef.current += dt;
    const t = windTimeRef.current;

    const stalks = stalkMeshRef.current;
    const panicles = panicleMeshRef.current;
    if (stalks && panicles) {
      dummy.rotation.order = 'XZY';
      for (let i = 0; i < stalkInstances.length; i++) {
        const s = stalkInstances[i];
        const wave = Math.sin(t * 2.1 - s.phase);
        const gust = Math.sin(t * 0.9 + s.z * 0.25) * 0.045;
        const swayZ = 0.035 + wave * 0.095 + gust;
        const swayX = Math.cos(t * 1.65 + s.phase * 1.1) * 0.038;

        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(swayX, s.rotY, swayZ);
        dummy.scale.set(s.scaleX, s.scaleY, s.scaleZ);
        dummy.updateMatrix();
        stalks.setMatrixAt(i, dummy.matrix);
        panicles.setMatrixAt(i, dummy.matrix);
      }
      stalks.instanceMatrix.needsUpdate = true;
      panicles.instanceMatrix.needsUpdate = true;
    }

    const ripples = rippleMeshRef.current;
    if (ripples) {
      for (let i = 0; i < rippleInstances.length; i++) {
        const r = rippleInstances[i];
        const drift = Math.sin(t * r.speed + r.phase) * 0.28;
        const pulse = 0.72 + Math.sin(t * 1.6 + r.phase) * 0.25;
        rippleDummy.position.set(r.x + drift, r.y, r.z);
        rippleDummy.scale.set(r.width * pulse, 1, 1);
        rippleDummy.updateMatrix();
        ripples.setMatrixAt(i, rippleDummy.matrix);
      }
      ripples.instanceMatrix.needsUpdate = true;
    }

    if (scarecrowBodyRef.current) {
      scarecrowBodyRef.current.rotation.z = Math.sin(t * 1.8) * 0.035;
      scarecrowBodyRef.current.rotation.x = Math.cos(t * 1.3) * 0.02;
    }
  });

  return (
    <group name="rice-field-zone">
      {/* EASTERN STEPPED HILLSIDE BORDER & OUTER GRASSY BERMS (x: 7.5..26.0, z: -15.0..+4.5) */}
      <group name="terrace-surrounding-banks">
        {/* Eastern hillside backing Tier 3 */}
        <mesh position={[23.8, 0.51, -5.2]} receiveShadow castShadow>
          <boxGeometry args={[3.6, 1.02, 18.8]} />
          <meshToonMaterial color={mudBundColor} gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>
        <mesh position={[23.8, 1.05, -5.2]} receiveShadow>
          <boxGeometry args={[3.7, 0.1, 18.9]} />
          <meshToonMaterial color={grassBorderColor} gradientMap={gradientMap} />
        </mesh>

        {/* North & South outer grassy paddy borders */}
        <mesh position={[15.1, 0.14, -13.35]} receiveShadow>
          <boxGeometry args={[13.8, 0.28, 2.5]} />
          <meshToonMaterial color={grassBorderColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[15.1, 0.14, 3.95]} receiveShadow>
          <boxGeometry args={[13.8, 0.28, 0.9]} />
          <meshToonMaterial color={grassBorderColor} gradientMap={gradientMap} />
        </mesh>

        {/* West irrigation canal bordering Tier 0 along x = 7.6..8.45 */}
        <mesh position={[8.0, 0.03, -4.25]} receiveShadow>
          <boxGeometry args={[0.85, 0.06, 16.0]} />
          <meshToonMaterial color={mudBedColor} gradientMap={gradientMap} />
        </mesh>
        <mesh
          position={[8.0, 0.08, -4.25]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[0.62, 15.6]} />
          <meshStandardMaterial
            color={waterColor}
            transparent
            opacity={0.76}
            roughness={0.14}
            metalness={0.22}
          />
        </mesh>

        {/* Bamboo water spout (pancuran) draining from Tier 0 bund to irrigation canal */}
        <group position={[8.42, 0.28, -4.2]}>
          <mesh rotation={[0, 0, 0.28]} castShadow>
            <cylinderGeometry args={[0.045, 0.055, 0.62, 6]} />
            <meshToonMaterial color="#a16207" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <mesh position={[-0.36, -0.1, 0]} rotation={[0, 0, -0.22]}>
            <cylinderGeometry args={[0.025, 0.04, 0.26, 6]} />
            <meshStandardMaterial
              color={waterColor}
              transparent
              opacity={0.68}
              roughness={0.1}
            />
          </mesh>
        </group>

        {/* Low-poly hillside shrubs & border stones */}
        {[
          { pos: [22.8, 1.35, -10.5] as [number, number, number], s: 0.72 },
          { pos: [23.4, 1.4, -3.2] as [number, number, number], s: 0.85 },
          { pos: [22.9, 1.35, 2.2] as [number, number, number], s: 0.68 },
          { pos: [11.2, 0.45, -13.2] as [number, number, number], s: 0.58 },
          { pos: [19.4, 0.48, -13.4] as [number, number, number], s: 0.65 },
        ].map((bush, idx) => (
          <mesh
            key={`field-bush-${idx}`}
            position={bush.pos}
            scale={bush.s}
            castShadow
            receiveShadow
          >
            <icosahedronGeometry args={[0.55, 0]} />
            <meshToonMaterial
              color={palmFrondColor}
              gradientMap={gradientMap}
            />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
        ))}

        {[
          { pos: [7.62, 0.14, -9.8] as [number, number, number], r: 0.22 },
          { pos: [7.65, 0.15, -4.6] as [number, number, number], r: 0.24 },
          { pos: [7.6, 0.14, 1.1] as [number, number, number], r: 0.2 },
        ].map((rock, idx) => (
          <mesh
            key={`canal-rock-${idx}`}
            position={rock.pos}
            rotation={[idx * 0.5, idx * 0.9, 0]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[rock.r, 0]} />
            <meshToonMaterial color="#78716c" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
        ))}
      </group>

      {/* 1. SAWAH TERASERING (3 Stepped Eastward Terrace Tiers) */}
      <group name="sawah-terasering">
        {TERRACE_TIERS.map((tier, tIdx) => {
          const plotWidth = tier.plotXMax - tier.plotXMin;
          const plotCenterX = (tier.plotXMin + tier.plotXMax) * 0.5;
          const zSpanLength = Z_BUNDS[Z_BUNDS.length - 1] - Z_BUNDS[0];
          const zSpanCenter = (Z_BUNDS[0] + Z_BUNDS[Z_BUNDS.length - 1]) * 0.5;
          const bundTopY = tier.bedY + BUND_HEIGHT_ABOVE_BED;

          return (
            <group key={`terrace-tier-${tIdx}`}>
              {/* Muddy Paddy Bed Base */}
              <mesh
                position={[plotCenterX, tier.bedY * 0.5, zSpanCenter]}
                receiveShadow
              >
                <boxGeometry args={[plotWidth, tier.bedY, zSpanLength]} />
                <meshToonMaterial
                  color={mudBedColor}
                  gradientMap={gradientMap}
                />
              </mesh>

              {/* Cross-Bund Mud Dividers (Pematang Sawah) along Z */}
              {Z_BUNDS.map((bz, bIdx) => (
                <mesh
                  key={`z-bund-${tIdx}-${bIdx}`}
                  position={[plotCenterX, bundTopY * 0.5, bz]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[plotWidth, bundTopY, BUND_WIDTH]} />
                  <meshToonMaterial
                    color={mudBundColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.02} color="#111827" />
                </mesh>
              ))}

              {/* Flooded Reflective Water Surfaces for the 3 Plots in This Tier */}
              {PLOT_Z_SPANS.map((plot, pIdx) => {
                const plotDepth = plot.zMax - plot.zMin;
                const plotCenterZ = (plot.zMin + plot.zMax) * 0.5;
                return (
                  <mesh
                    key={`paddy-water-${tIdx}-${pIdx}`}
                    position={[plotCenterX, tier.bedY + 0.032, plotCenterZ]}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                  >
                    <planeGeometry args={[plotWidth, plotDepth]} />
                    <meshStandardMaterial
                      color={waterColor}
                      transparent
                      opacity={0.72}
                      roughness={0.12}
                      metalness={0.26}
                      emissive={isGolden ? '#f59e0b' : '#000000'}
                      emissiveIntensity={isGolden ? 0.14 : 0}
                    />
                  </mesh>
                );
              })}
            </group>
          );
        })}

        {/* Longitudinal Terrace Step Bunds along X */}
        {X_BUNDS.map((xb, idx) => (
          <mesh
            key={`x-bund-${idx}`}
            position={[xb.x, xb.topY * 0.5, -4.25]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[BUND_WIDTH, xb.topY, 15.5]} />
            <meshToonMaterial color={mudBundColor} gradientMap={gradientMap} />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
        ))}

        {/* Instanced Water Shimmer Streaks */}
        <instancedMesh
          ref={rippleMeshRef}
          args={[rippleGeo, rippleMat, rippleInstances.length]}
          frustumCulled={false}
        />

        {/* Instanced Low-Poly Rice Stalk Clumps (Rumpun Padi) */}
        <instancedMesh
          ref={stalkMeshRef}
          args={[stalkGeo, stalkMat, stalkInstances.length]}
          castShadow
          receiveShadow
          frustumCulled={false}
        />

        {/* Instanced Drooping Rice Grain Panicles (Bulir Padi) */}
        <instancedMesh
          ref={panicleMeshRef}
          args={[panicleGeo, panicleMat, stalkInstances.length]}
          castShadow
          frustumCulled={false}
        />
      </group>

      {/* 2. SAUNG / GUBUK SAWAH ([13.5, 0.35, -2.5]) */}
      <group
        name="saung-gubuk-sawah"
        position={[13.5, 0.35, -2.5]}
        rotation={[0, -0.45, 0]}
      >
        {/* 4 Corner Bamboo Stilts anchored into the paddy/bund */}
        {[-0.9, 0.9].map((sx) =>
          [-0.8, 0.8].map((sz) => (
            <mesh
              key={`saung-stilt-${sx}-${sz}`}
              position={[sx, 0.94, sz]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.06, 0.075, 2.24, 6]} />
              <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
              <Outlines thickness={0.02} color="#111827" />
            </mesh>
          ))
        )}

        {/* Under-deck Support Cross-beams */}
        {[-0.8, 0.8].map((bz, idx) => (
          <mesh
            key={`saung-beam-${idx}`}
            position={[0, 0.44, bz]}
            castShadow
          >
            <boxGeometry args={[2.0, 0.09, 0.1]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}

        {/* Raised Bamboo/Wooden Floor Platform */}
        <mesh position={[0, 0.52, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.08, 0.09, 1.86]} />
          <meshToonMaterial color="#a16207" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>

        {/* Bamboo Floor Slat Accents */}
        {[-0.62, -0.31, 0, 0.31, 0.62].map((sz, idx) => (
          <mesh
            key={`saung-slat-${idx}`}
            position={[0, 0.575, sz]}
            receiveShadow
          >
            <boxGeometry args={[2.0, 0.02, 0.18]} />
            <meshToonMaterial color="#b45309" gradientMap={gradientMap} />
          </mesh>
        ))}

        {/* Open-sided Low Bamboo Back & Side Guard Rails */}
        <mesh position={[0, 0.98, -0.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.032, 0.032, 1.82, 6]} />
          <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>
        {[-0.9, 0.9].map((rx, idx) => (
          <mesh
            key={`saung-side-rail-${idx}`}
            position={[rx, 0.98, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.032, 0.032, 1.6, 6]} />
            <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}

        {/* Small Wooden Step Ladder at Open Front */}
        <group position={[0, 0.25, 1.05]} rotation={[-0.35, 0, 0]}>
          {[-0.24, 0.24].map((lx, idx) => (
            <mesh key={`ladder-rail-${idx}`} position={[lx, 0, 0]} castShadow>
              <boxGeometry args={[0.06, 0.65, 0.06]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              <Outlines thickness={0.015} color="#111827" />
            </mesh>
          ))}
          {[-0.14, 0.08].map((ry, idx) => (
            <mesh key={`ladder-rung-${idx}`} position={[0, ry, 0]} castShadow>
              <boxGeometry args={[0.52, 0.05, 0.09]} />
              <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
              <Outlines thickness={0.015} color="#111827" />
            </mesh>
          ))}
        </group>

        {/* Wooden Sitting Bench Inside the Saung */}
        <group position={[-0.12, 0.58, -0.35]}>
          <mesh position={[0, 0.29, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.26, 0.075, 0.44]} />
            <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
          {[-0.48, 0.48].map((lx, idx) => (
            <mesh
              key={`saung-bench-leg-${idx}`}
              position={[lx, 0.145, 0]}
              castShadow
            >
              <boxGeometry args={[0.09, 0.29, 0.34]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              <Outlines thickness={0.015} color="#111827" />
            </mesh>
          ))}
        </group>

        {/* Top Roof Support Beams */}
        {[-0.8, 0.8].map((tz, idx) => (
          <mesh
            key={`saung-top-beam-${idx}`}
            position={[0, 2.02, tz]}
            castShadow
          >
            <boxGeometry args={[1.95, 0.09, 0.09]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}

        {/* Pitched Thatched Rumbia Roof (Cone/Prism with Outlines) */}
        <mesh
          position={[0, 2.55, 0]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[1.08, 1.0, 0.98]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[1.95, 1.15, 4]} />
          <meshToonMaterial color={roofMainColor} gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>

        {/* Rumbia Eave Ridge Trim */}
        <mesh
          position={[0, 1.98, 0]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[1.1, 1.0, 1.0]}
          castShadow
        >
          <coneGeometry args={[2.06, 0.22, 4]} />
          <meshToonMaterial color={roofTrimColor} gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>

        {/* Warm Hanging Lantern Under Roof */}
        <group position={[0, 1.98, 0.45]}>
          <mesh position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.28, 5]} />
            <meshToonMaterial color="#1f2937" gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, -0.29, 0]} castShadow>
            <coneGeometry args={[0.11, 0.08, 6]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <mesh position={[0, -0.39, 0]}>
            <cylinderGeometry args={[0.065, 0.055, 0.14, 6]} />
            <meshBasicMaterial color={lanternGlow} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <pointLight
            position={[0, -0.42, 0]}
            color="#fbbf24"
            intensity={isNight ? 3.2 : isGolden ? 1.6 : 0.7}
            distance={6.5}
          />
        </group>
      </group>

      {/* 3A. POHON KELAPA MELENGKUNG (3 Curved Coconut Palms) */}
      <group name="coconut-palms">
        {PALM_SPECS.map((spec, idx) => (
          <CurvedCoconutPalm
            key={`coconut-palm-${idx}`}
            spec={spec}
            palmIndex={idx}
            gradientMap={gradientMap}
            frondColor={palmFrondColor}
            trunkColor={palmTrunkColor}
            coconutColor={coconutColor}
            isPlaying={isPlaying}
          />
        ))}
      </group>

      {/* 3B. ORANG-ORANGAN SAWAH (Scarecrow with Caping at [10.4, 0.3, -0.8]) */}
      <group
        name="orang-orangan-sawah"
        position={[10.4, 0.3, -0.8]}
        rotation={[0, -0.45, 0]}
      >
        {/* Main Bamboo Support Stake planted in Tier 0 paddy mud */}
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.038, 0.052, 1.66, 6]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>

        {/* Swaying Upper Body, Arms, Shirt, Burlap Head & Caping */}
        <group ref={scarecrowBodyRef} position={[0, 0.72, 0]}>
          {/* Horizontal Crossbar Arm Pole */}
          <mesh
            position={[0, 0.42, 0]}
            rotation={[0, 0, Math.PI / 2 + 0.06]}
            castShadow
          >
            <cylinderGeometry args={[0.03, 0.03, 1.28, 6]} />
            <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>

          {/* Shirt Torso */}
          <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.42, 0.56, 0.24]} />
            <meshToonMaterial
              color={isNight ? '#7f1d1d' : '#dc2626'}
              gradientMap={gradientMap}
            />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>

          {/* Waist Cloth Sash */}
          <mesh position={[0, 0.08, 0]} castShadow>
            <boxGeometry args={[0.45, 0.1, 0.27]} />
            <meshToonMaterial
              color={isNight ? '#854d0e' : '#eab308'}
              gradientMap={gradientMap}
            />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>

          {/* Flared Shirt Sleeves & Straw Hands */}
          {[-1, 1].map((side) => (
            <group
              key={`scarecrow-arm-${side}`}
              position={[side * 0.36, 0.42 + side * 0.02, 0]}
              rotation={[0, 0, side * 0.06]}
            >
              <mesh castShadow>
                <boxGeometry args={[0.36, 0.16, 0.16]} />
                <meshToonMaterial
                  color={isNight ? '#7f1d1d' : '#dc2626'}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.016} color="#111827" />
              </mesh>
              <mesh
                position={[side * 0.23, 0, 0]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.06, 0.035, 0.14, 6]} />
                <meshToonMaterial color="#eab308" gradientMap={gradientMap} />
                <Outlines thickness={0.014} color="#111827" />
              </mesh>
            </group>
          ))}

          {/* Straw/Burlap Head */}
          <mesh position={[0, 0.72, 0]} castShadow>
            <dodecahedronGeometry args={[0.19, 0]} />
            <meshToonMaterial
              color={isNight ? '#a8a29e' : '#e7e5e4'}
              gradientMap={gradientMap}
            />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>

          {/* Button Eyes */}
          {[-0.065, 0.065].map((ex, idx) => (
            <mesh key={`scarecrow-eye-${idx}`} position={[ex, 0.73, 0.175]}>
              <sphereGeometry args={[0.024, 6, 6]} />
              <meshBasicMaterial color="#111827" />
            </mesh>
          ))}

          {/* Conical Bamboo Caping Hat */}
          <group position={[0, 0.91, 0]} rotation={[0.08, 0, -0.07]}>
            <mesh castShadow receiveShadow>
              <coneGeometry args={[0.45, 0.26, 12]} />
              <meshToonMaterial color={capingColor} gradientMap={gradientMap} />
              <Outlines thickness={0.02} color="#111827" />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.05, 0.08, 0.06, 8]} />
              <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
