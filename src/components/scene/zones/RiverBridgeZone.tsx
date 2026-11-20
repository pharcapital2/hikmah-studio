import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { getToonGradientTexture } from '../../../utils/toonGradient';

export interface RiverBridgeZoneProps {
  isNight?: boolean;
  isGolden?: boolean;
  isPlaying?: boolean;
}

const RIVER_CENTER_Z = 8.0;
const BRIDGE_HALF_SPAN_Z = 2.6;
const BRIDGE_BASE_Y = 0.35;
const BRIDGE_ARCH_RISE = 0.27;
const PLANK_COUNT = 17;
const RIPPLE_COUNT = 72;
const RIVERBED_STONE_COUNT = 84;
const SPLASH_DROPLET_COUNT = 24;
const WHEEL_SPOKE_DIAMETERS = 4;
const WHEEL_RIM_SEGMENTS = 12;
const WHEEL_RIM_RADIUS = 0.86;
const WHEEL_PADDLE_COUNT = 12;
const WHEEL_AXLE_Y = 1.05;

const RAIL_POST_Z = [5.6, 6.4, 7.2, 8.0, 8.8, 9.6, 10.4];

interface BankClusterConfig {
  x: number;
  z: number;
  bank: 'north' | 'south';
  stalkCount: number;
  rockScale: number;
  seed: number;
}

const BANK_CLUSTERS: BankClusterConfig[] = [
  // North bank (x = ±4 .. ±20, framing the waterwheel at x = -5.4 without colliding)
  { x: -19.2, z: 5.38, bank: 'north', stalkCount: 5, rockScale: 0.42, seed: 1 },
  { x: -15.0, z: 5.45, bank: 'north', stalkCount: 4, rockScale: 0.36, seed: 2 },
  { x: -11.2, z: 5.35, bank: 'north', stalkCount: 6, rockScale: 0.45, seed: 3 },
  { x: -7.6, z: 5.42, bank: 'north', stalkCount: 4, rockScale: 0.34, seed: 4 },
  { x: -4.05, z: 5.46, bank: 'north', stalkCount: 3, rockScale: 0.3, seed: 5 },
  { x: 4.2, z: 5.44, bank: 'north', stalkCount: 5, rockScale: 0.38, seed: 6 },
  { x: 7.8, z: 5.36, bank: 'north', stalkCount: 6, rockScale: 0.46, seed: 7 },
  { x: 11.6, z: 5.46, bank: 'north', stalkCount: 4, rockScale: 0.34, seed: 8 },
  { x: 15.6, z: 5.38, bank: 'north', stalkCount: 5, rockScale: 0.44, seed: 9 },
  { x: 19.4, z: 5.44, bank: 'north', stalkCount: 4, rockScale: 0.38, seed: 10 },
  // South bank (x = ±4 .. ±20)
  { x: -18.8, z: 10.62, bank: 'south', stalkCount: 5, rockScale: 0.4, seed: 11 },
  { x: -14.4, z: 10.56, bank: 'south', stalkCount: 4, rockScale: 0.35, seed: 12 },
  { x: -10.4, z: 10.64, bank: 'south', stalkCount: 6, rockScale: 0.46, seed: 13 },
  { x: -6.8, z: 10.55, bank: 'south', stalkCount: 4, rockScale: 0.32, seed: 14 },
  { x: -4.15, z: 10.6, bank: 'south', stalkCount: 3, rockScale: 0.28, seed: 15 },
  { x: 4.3, z: 10.58, bank: 'south', stalkCount: 4, rockScale: 0.36, seed: 16 },
  { x: 8.4, z: 10.64, bank: 'south', stalkCount: 5, rockScale: 0.42, seed: 17 },
  { x: 12.2, z: 10.54, bank: 'south', stalkCount: 6, rockScale: 0.44, seed: 18 },
  { x: 16.2, z: 10.62, bank: 'south', stalkCount: 4, rockScale: 0.38, seed: 19 },
  { x: 19.6, z: 10.56, bank: 'south', stalkCount: 5, rockScale: 0.4, seed: 20 },
];

function getBridgeDeckY(z: number): number {
  const u = (z - RIVER_CENTER_Z) / BRIDGE_HALF_SPAN_Z;
  return BRIDGE_BASE_Y + BRIDGE_ARCH_RISE * (1 - u * u);
}

function getBridgeDeckRotX(z: number): number {
  const u = (z - RIVER_CENTER_Z) / BRIDGE_HALF_SPAN_Z;
  const slope = (BRIDGE_ARCH_RISE * (-2 * u)) / BRIDGE_HALF_SPAN_Z;
  return -Math.atan(slope);
}

export const RiverBridgeZone: React.FC<RiverBridgeZoneProps> = ({
  isNight = false,
  isGolden = false,
  isPlaying = true,
}) => {
  const gradientMap = useMemo(() => getToonGradientTexture(), []);

  const rippleRef = useRef<THREE.InstancedMesh | null>(null);
  const riverbedStoneRef = useRef<THREE.InstancedMesh | null>(null);
  const splashRef = useRef<THREE.InstancedMesh | null>(null);
  const wheelRef = useRef<THREE.Group | null>(null);
  const northEdgeFoamRef = useRef<THREE.Mesh | null>(null);
  const southEdgeFoamRef = useRef<THREE.Mesh | null>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Palette adapting cleanly to day, golden hour, and night presets
  const waterColor = isNight ? '#0c4a6e' : isGolden ? '#0369a1' : '#0284c7';
  const riverbedColor = isNight ? '#1c1917' : isGolden ? '#44372c' : '#3f3a34';
  const sandColor = isNight ? '#57534e' : isGolden ? '#d97706' : '#d6b37c';
  const wetSandColor = isNight ? '#44403c' : isGolden ? '#b45309' : '#b8945e';
  const grassColor = isNight ? '#1e3a2f' : isGolden ? '#65a30d' : '#4d7c0f';
  const roadColor = isNight ? '#57534e' : isGolden ? '#b45309' : '#a16207';
  const stoneColor = isNight ? '#475569' : isGolden ? '#78716c' : '#6b7280';
  const darkStoneColor = isNight ? '#334155' : isGolden ? '#57534e' : '#4b5563';
  const darkWoodColor = isNight ? '#2c1205' : '#451a03';
  const railWoodColor = isNight ? '#4a2511' : isGolden ? '#92400e' : '#78350f';
  const bambooColor = isNight ? '#3f6212' : isGolden ? '#a16207' : '#84a92c';
  const reedStalkColor = isNight ? '#166534' : isGolden ? '#65a30d' : '#15803d';
  const leafColor = isNight ? '#14532d' : isGolden ? '#4d7c0f' : '#228b22';
  const lanternGlowColor = isNight
    ? '#fef08a'
    : isGolden
      ? '#fde047'
      : '#fbbf24';

  const woodPlankColors = useMemo(
    () =>
      isNight
        ? ['#5c3317', '#4a2811', '#6b3e1e']
        : isGolden
          ? ['#b45309', '#92400e', '#a16207']
          : ['#92400e', '#78350f', '#854d0e'],
    [isNight, isGolden]
  );

  // Deterministic flowing ripple strips data (-X to +X along z = 8.0)
  const rippleData = useMemo(() => {
    const items: Array<{
      x: number;
      z: number;
      length: number;
      width: number;
      speed: number;
      phase: number;
    }> = [];
    for (let i = 0; i < RIPPLE_COUNT; i++) {
      const x = -33 + ((i * 66) / RIPPLE_COUNT + ((i * 17) % 13) * 0.25);
      const lane = ((i * 37) % 100) / 100;
      const z = 6.0 + lane * 4.0;
      items.push({
        x: x > 33 ? x - 66 : x,
        z,
        length: 0.9 + (i % 5) * 0.35,
        width: 0.65 + (i % 3) * 0.28,
        speed: 1.65 + (i % 6) * 0.28,
        phase: (i * 0.85) % (Math.PI * 2),
      });
    }
    return items;
  }, []);

  // Deterministic submerged riverbed stone positions
  const riverbedStones = useMemo(() => {
    const items: Array<{
      x: number;
      y: number;
      z: number;
      rx: number;
      ry: number;
      rz: number;
      sx: number;
      sy: number;
      sz: number;
    }> = [];
    for (let i = 0; i < RIVERBED_STONE_COUNT; i++) {
      const t = i / RIVERBED_STONE_COUNT;
      const x = -29 + t * 58 + (((i * 23) % 7) - 3) * 0.22;
      const zSpread = ((i * 41) % 100) / 100;
      const z = 5.95 + zSpread * 4.1;
      const size = 0.16 + (i % 5) * 0.065;
      items.push({
        x,
        y: -0.11 + (i % 3) * 0.025,
        z,
        rx: (i * 0.5) % Math.PI,
        ry: (i * 1.1) % Math.PI,
        rz: (i * 0.3) % Math.PI,
        sx: size * (1.1 + (i % 3) * 0.15),
        sy: size * 0.5,
        sz: size * (0.95 + (i % 4) * 0.12),
      });
    }
    return items;
  }, []);

  // Deterministic waterwheel splash droplet trajectories
  const splashData = useMemo(() => {
    const items: Array<{
      phase: number;
      vx: number;
      vy: number;
      vz: number;
      offsetX: number;
      offsetZ: number;
      scale: number;
    }> = [];
    for (let i = 0; i < SPLASH_DROPLET_COUNT; i++) {
      const spread = (i % 6) / 5 - 0.5;
      items.push({
        phase: (i / SPLASH_DROPLET_COUNT) % 1,
        vx: 0.45 + (i % 4) * 0.22,
        vy: 1.05 + (i % 5) * 0.2,
        vz: spread * 0.55,
        offsetX: -0.15 + (i % 3) * 0.18,
        offsetZ: spread * 0.42,
        scale: 0.7 + (i % 4) * 0.22,
      });
    }
    return items;
  }, []);

  // Manually constructed BufferGeometries & Materials for InstancedMeshes (disposed on unmount)
  const rippleGeo = useMemo(() => new THREE.BoxGeometry(1, 0.022, 0.13), []);
  const rippleMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f0f9ff',
        transparent: true,
        opacity: 0.74,
        depthWrite: false,
      }),
    []
  );

  const riverbedStoneGeo = useMemo(
    () => new THREE.DodecahedronGeometry(1, 0),
    []
  );
  const riverbedStoneMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#57534e',
        gradientMap,
      }),
    [gradientMap]
  );

  const splashGeo = useMemo(() => new THREE.IcosahedronGeometry(0.075, 0), []);
  const splashMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e0f2fe',
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    []
  );

  // Sync dynamic colors/opacity on manually constructed materials
  useEffect(() => {
    rippleMat.color.set(
      isNight ? '#7dd3fc' : isGolden ? '#fef3c7' : '#f0f9ff'
    );
    rippleMat.opacity = isNight ? 0.48 : isGolden ? 0.78 : 0.74;

    riverbedStoneMat.color.set(
      isNight ? '#334155' : isGolden ? '#6b5b4d' : '#57534e'
    );

    splashMat.color.set(
      isNight ? '#7dd3fc' : isGolden ? '#fef3c7' : '#e0f2fe'
    );
    splashMat.opacity = isNight ? 0.62 : 0.85;
  }, [isNight, isGolden, rippleMat, riverbedStoneMat, splashMat]);

  // Dispose manually constructed BufferGeometry and Material instances on unmount
  useEffect(() => {
    return () => {
      rippleGeo.dispose();
      rippleMat.dispose();
      riverbedStoneGeo.dispose();
      riverbedStoneMat.dispose();
      splashGeo.dispose();
      splashMat.dispose();
    };
  }, [
    rippleGeo,
    rippleMat,
    riverbedStoneGeo,
    riverbedStoneMat,
    splashGeo,
    splashMat,
  ]);

  // Populate static riverbed stones + frame-0 initial matrices for ripples and splash
  useEffect(() => {
    if (riverbedStoneRef.current) {
      riverbedStones.forEach((s, i) => {
        dummy.position.set(s.x, s.y, s.z);
        dummy.rotation.set(s.rx, s.ry, s.rz);
        dummy.scale.set(s.sx, s.sy, s.sz);
        dummy.updateMatrix();
        riverbedStoneRef.current?.setMatrixAt(i, dummy.matrix);
      });
      riverbedStoneRef.current.instanceMatrix.needsUpdate = true;
    }

    if (rippleRef.current) {
      rippleData.forEach((r, i) => {
        dummy.position.set(r.x, 0.075, r.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(r.length, 1, r.width);
        dummy.updateMatrix();
        rippleRef.current?.setMatrixAt(i, dummy.matrix);
      });
      rippleRef.current.instanceMatrix.needsUpdate = true;
    }

    if (splashRef.current) {
      splashData.forEach((p, i) => {
        const u = p.phase;
        const px = -5.4 + p.offsetX + p.vx * u;
        const py = Math.max(0.07, 0.09 + p.vy * u - 1.95 * u * u);
        const pz = 7.4 + p.offsetZ + p.vz * u;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(u * 4, u * 2, 0);
        dummy.scale.setScalar(p.scale * (1 - u * 0.45));
        dummy.updateMatrix();
        splashRef.current?.setMatrixAt(i, dummy.matrix);
      });
      splashRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [dummy, riverbedStones, rippleData, splashData]);

  // Precomputed bridge planks along the parabolic arch
  const bridgePlanks = useMemo(() => {
    const planks: Array<{
      z: number;
      y: number;
      rotX: number;
      colorIdx: number;
    }> = [];
    for (let i = 0; i < PLANK_COUNT; i++) {
      const z = 5.45 + (i * 5.1) / (PLANK_COUNT - 1);
      planks.push({
        z,
        y: getBridgeDeckY(z),
        rotX: getBridgeDeckRotX(z),
        colorIdx: i % 3,
      });
    }
    return planks;
  }, []);

  // Precomputed railing segments connecting consecutive railing posts
  const railSegments = useMemo(() => {
    const segments: Array<{
      midZ: number;
      midY: number;
      rotX: number;
      length: number;
    }> = [];
    for (let i = 0; i < RAIL_POST_Z.length - 1; i++) {
      const z1 = RAIL_POST_Z[i];
      const z2 = RAIL_POST_Z[i + 1];
      const y1 = getBridgeDeckY(z1);
      const y2 = getBridgeDeckY(z2);
      const dz = z2 - z1;
      const dy = y2 - y1;
      segments.push({
        midZ: (z1 + z2) * 0.5,
        midY: (y1 + y2) * 0.5,
        rotX: -Math.atan2(dy, dz),
        length: Math.hypot(dz, dy),
      });
    }
    return segments;
  }, []);

  // Precomputed under-deck arched stringer beam segments
  const stringerSegments = useMemo(() => {
    const count = 8;
    const segments: Array<{
      midZ: number;
      midY: number;
      rotX: number;
      length: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const z1 = 5.48 + (i * 5.04) / count;
      const z2 = 5.48 + ((i + 1) * 5.04) / count;
      const y1 = getBridgeDeckY(z1) - 0.11;
      const y2 = getBridgeDeckY(z2) - 0.11;
      const dz = z2 - z1;
      const dy = y2 - y1;
      segments.push({
        midZ: (z1 + z2) * 0.5,
        midY: (y1 + y2) * 0.5,
        rotX: -Math.atan2(dy, dz),
        length: Math.hypot(dz, dy) + 0.04,
      });
    }
    return segments;
  }, []);

  // Precomputed waterwheel spokes (4 full-diameter pairs = 8 radial spokes), rim chords, and paddles
  const wheelAngles = useMemo(() => {
    const spokes = Array.from(
      { length: WHEEL_SPOKE_DIAMETERS },
      (_, i) => (i * Math.PI) / WHEEL_SPOKE_DIAMETERS
    );
    const rimChords = Array.from({ length: WHEEL_RIM_SEGMENTS }, (_, i) => {
      const angle = (i * Math.PI * 2) / WHEEL_RIM_SEGMENTS;
      const chordLength =
        2 * WHEEL_RIM_RADIUS * Math.sin(Math.PI / WHEEL_RIM_SEGMENTS) + 0.04;
      const rMid =
        WHEEL_RIM_RADIUS * Math.cos(Math.PI / WHEEL_RIM_SEGMENTS);
      return {
        x: Math.cos(angle) * rMid,
        y: Math.sin(angle) * rMid,
        rotZ: angle,
        length: chordLength,
      };
    });
    const paddles = Array.from({ length: WHEEL_PADDLE_COUNT }, (_, i) => {
      const angle = (i * Math.PI * 2) / WHEEL_PADDLE_COUNT;
      const rPaddle = WHEEL_RIM_RADIUS + 0.09;
      return {
        x: Math.cos(angle) * rPaddle,
        y: Math.sin(angle) * rPaddle,
        rotZ: angle + 0.15,
      };
    });
    return { spokes, rimChords, paddles };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const activeDt = isPlaying ? dt : dt * 0.15;
    const elapsed = state.clock.elapsedTime;

    // 1. Animate river white-foam / ripple strips flowing from -X to +X
    if (rippleRef.current) {
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const r = rippleData[i];
        r.x += r.speed * activeDt;
        if (r.x > 33.5) {
          r.x = -33.5;
        }
        const waveY = 0.074 + Math.sin(elapsed * 2.8 + r.phase) * 0.007;
        const pulseX =
          r.length * (1 + Math.sin(elapsed * 2.1 + r.phase) * 0.14);
        dummy.position.set(r.x, waveY, r.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(pulseX, 1, r.width);
        dummy.updateMatrix();
        rippleRef.current.setMatrixAt(i, dummy.matrix);
      }
      rippleRef.current.instanceMatrix.needsUpdate = true;
    }

    // Gentle shoreline foam drift
    if (northEdgeFoamRef.current) {
      northEdgeFoamRef.current.position.z =
        5.77 + Math.sin(elapsed * 1.9) * 0.025;
    }
    if (southEdgeFoamRef.current) {
      southEdgeFoamRef.current.position.z =
        10.23 - Math.sin(elapsed * 1.9 + 1.2) * 0.025;
    }

    // 2. Rotate Bamboo Waterwheel continuously around Z so bottom paddles move +X with river flow
    if (wheelRef.current) {
      wheelRef.current.rotation.z += activeDt * 0.95;
    }

    // 3. Animate water splash droplets underneath the waterwheel
    if (splashRef.current) {
      for (let i = 0; i < SPLASH_DROPLET_COUNT; i++) {
        const p = splashData[i];
        p.phase = (p.phase + activeDt * 1.25) % 1;
        const u = p.phase;
        const px = -5.4 + p.offsetX + p.vx * u;
        const py = Math.max(0.07, 0.09 + p.vy * u - 1.95 * u * u);
        const pz = 7.4 + p.offsetZ + p.vz * u;
        dummy.position.set(px, py, pz);
        dummy.rotation.set(u * 5, u * 3, 0);
        dummy.scale.setScalar(p.scale * (1 - u * 0.45));
        dummy.updateMatrix();
        splashRef.current.setMatrixAt(i, dummy.matrix);
      }
      splashRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name="river-bridge-zone">
      {/* ===================================================================== */}
      {/* 1. SUNGAI DESA (z = +8.0, channel width 4.6, spanning x = -34 .. +34) */}
      {/* ===================================================================== */}
      <group name="sungai-desa">
        {/* Riverbed Trench Floor (y = -0.15 top surface) */}
        <mesh position={[0, -0.17, RIVER_CENTER_Z]} receiveShadow>
          <boxGeometry args={[70, 0.04, 4.6]} />
          <meshToonMaterial color={riverbedColor} gradientMap={gradientMap} />
        </mesh>

        {/* Angled Bank Trench Slopes along z = +5.7 and z = +10.3 */}
        <mesh
          position={[0, -0.05, 5.64]}
          rotation={[0.45, 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[70, 0.24, 0.26]} />
          <meshToonMaterial color={wetSandColor} gradientMap={gradientMap} />
        </mesh>
        <mesh
          position={[0, -0.05, 10.36]}
          rotation={[-0.45, 0, 0]}
          receiveShadow
        >
          <boxGeometry args={[70, 0.24, 0.26]} />
          <meshToonMaterial color={wetSandColor} gradientMap={gradientMap} />
        </mesh>

        {/* Submerged Stony Riverbed Cobbles */}
        <instancedMesh
          ref={riverbedStoneRef}
          args={[riverbedStoneGeo, riverbedStoneMat, RIVERBED_STONE_COUNT]}
          receiveShadow
        />

        {/* Sandy Riverbanks & Grass Verges on Both Sides of Bridge Span */}
        {[-1, 1].map((side) => {
          const bankCenterX = side * 18.1; // Covers [-34, -2.2] and [2.2, 34]
          const bankLength = 31.8;
          return (
            <group key={`riverbank-side-${side}`}>
              {/* North Bank (z = 4.8 .. 5.75) */}
              <mesh
                position={[bankCenterX, 0.015, 5.68]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.07, 0.28]} />
                <meshToonMaterial
                  color={wetSandColor}
                  gradientMap={gradientMap}
                />
              </mesh>
              <mesh
                position={[bankCenterX, 0.045, 5.42]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.09, 0.42]} />
                <meshToonMaterial color={sandColor} gradientMap={gradientMap} />
              </mesh>
              <mesh
                position={[bankCenterX, 0.025, 5.02]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.07, 0.48]} />
                <meshToonMaterial
                  color={grassColor}
                  gradientMap={gradientMap}
                />
              </mesh>

              {/* South Bank (z = 10.25 .. 11.5) */}
              <mesh
                position={[bankCenterX, 0.015, 10.32]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.07, 0.28]} />
                <meshToonMaterial
                  color={wetSandColor}
                  gradientMap={gradientMap}
                />
              </mesh>
              <mesh
                position={[bankCenterX, 0.045, 10.58]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.09, 0.42]} />
                <meshToonMaterial color={sandColor} gradientMap={gradientMap} />
              </mesh>
              <mesh
                position={[bankCenterX, 0.025, 11.12]}
                receiveShadow
              >
                <boxGeometry args={[bankLength, 0.07, 0.78]} />
                <meshToonMaterial
                  color={grassColor}
                  gradientMap={gradientMap}
                />
              </mesh>
            </group>
          );
        })}

        {/* North & South Approach Road Pads connecting Village Road (z = 5.4) & South Road (z = 10.6) */}
        <mesh position={[0, 0.012, 5.12]} receiveShadow>
          <boxGeometry args={[4.4, 0.024, 0.68]} />
          <meshToonMaterial color={roadColor} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.012, 11.04]} receiveShadow>
          <boxGeometry args={[4.4, 0.024, 0.96]} />
          <meshToonMaterial color={roadColor} gradientMap={gradientMap} />
        </mesh>

        {/* Stylized Cel/Toon Water Surface (y = 0.06, z = 8.0) */}
        <mesh
          position={[0, 0.06, RIVER_CENTER_Z]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <planeGeometry args={[68, 4.6]} />
          <meshToonMaterial
            color={waterColor}
            gradientMap={gradientMap}
            transparent
            opacity={0.85}
          />
        </mesh>

        {/* Subtle Shoreline Foam Strips along z = 5.77 & z = 10.23 */}
        <mesh
          ref={northEdgeFoamRef}
          position={[0, 0.069, 5.77]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[68, 0.14]} />
          <meshBasicMaterial
            color={isNight ? '#38bdf8' : isGolden ? '#fef3c7' : '#e0f2fe'}
            transparent
            opacity={isNight ? 0.25 : 0.42}
            depthWrite={false}
          />
        </mesh>
        <mesh
          ref={southEdgeFoamRef}
          position={[0, 0.069, 10.23]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[68, 0.14]} />
          <meshBasicMaterial
            color={isNight ? '#38bdf8' : isGolden ? '#fef3c7' : '#e0f2fe'}
            transparent
            opacity={isNight ? 0.25 : 0.42}
            depthWrite={false}
          />
        </mesh>

        {/* Flowing White-Foam / Ripple Strips animated from -X to +X */}
        <instancedMesh
          ref={rippleRef}
          args={[rippleGeo, rippleMat, RIPPLE_COUNT]}
          frustumCulled={false}
        />

        {/* Riverbank Rocks & Bamboo/Reed Clusters (x = ±4 .. ±20) */}
        <group name="riverbank-flora-and-rocks">
          {BANK_CLUSTERS.map((cluster) => {
            const zSign = cluster.bank === 'north' ? -1 : 1;
            const rockZ = cluster.z + zSign * 0.06;
            return (
              <group
                key={`bank-cluster-${cluster.seed}`}
                position={[cluster.x, 0.05, rockZ]}
              >
                {/* Primary & Companion Riverbank Rocks */}
                <mesh
                  position={[0, cluster.rockScale * 0.35, 0]}
                  rotation={[
                    cluster.seed * 0.4,
                    cluster.seed * 0.9,
                    cluster.seed * 0.2,
                  ]}
                  scale={[1.15, 0.72, 0.95]}
                  castShadow
                  receiveShadow
                >
                  <dodecahedronGeometry args={[cluster.rockScale, 0]} />
                  <meshToonMaterial
                    color={cluster.seed % 2 === 0 ? stoneColor : darkStoneColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.02} color="#111827" />
                </mesh>

                <mesh
                  position={[
                    (cluster.seed % 2 === 0 ? 1 : -1) * cluster.rockScale * 0.9,
                    cluster.rockScale * 0.22,
                    zSign * 0.14,
                  ]}
                  rotation={[cluster.seed * 0.7, cluster.seed * 0.3, 0.2]}
                  scale={[1.0, 0.65, 0.85]}
                  castShadow
                  receiveShadow
                >
                  <dodecahedronGeometry args={[cluster.rockScale * 0.58, 0]} />
                  <meshToonMaterial
                    color={darkStoneColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.016} color="#111827" />
                </mesh>

                {/* Bamboo & Water Reed Stalks */}
                {Array.from({ length: cluster.stalkCount }).map((_, si) => {
                  const isTallBamboo = si < 2 && cluster.seed % 2 === 1;
                  const height = isTallBamboo
                    ? 2.1 + ((cluster.seed + si) % 3) * 0.45
                    : 0.95 + ((cluster.seed + si) % 3) * 0.24;
                  const offsetX = (si - (cluster.stalkCount - 1) / 2) * 0.16;
                  const offsetZ =
                    -zSign * 0.12 + (((si + cluster.seed) % 3) - 1) * 0.08;
                  const tiltX = -zSign * (0.04 + (si % 3) * 0.03);
                  const tiltZ = ((si % 2 === 0 ? 1 : -1) * 0.06);

                  return (
                    <group
                      key={`stalk-${cluster.seed}-${si}`}
                      position={[offsetX, 0.02, offsetZ]}
                      rotation={[tiltX, 0, tiltZ]}
                    >
                      <mesh position={[0, height * 0.5, 0]} castShadow>
                        <cylinderGeometry
                          args={[
                            isTallBamboo ? 0.036 : 0.02,
                            isTallBamboo ? 0.048 : 0.028,
                            height,
                            6,
                          ]}
                        />
                        <meshToonMaterial
                          color={isTallBamboo ? bambooColor : reedStalkColor}
                          gradientMap={gradientMap}
                        />
                        <Outlines thickness={0.012} color="#111827" />
                      </mesh>

                      {/* Bamboo Leaf Tuft or Cattail Reed Head */}
                      {isTallBamboo ? (
                        <mesh
                          position={[0, height - 0.12, 0]}
                          scale={[1.4, 0.85, 1.4]}
                          castShadow
                        >
                          <dodecahedronGeometry args={[0.24, 0]} />
                          <meshToonMaterial
                            color={leafColor}
                            gradientMap={gradientMap}
                          />
                          <Outlines thickness={0.015} color="#111827" />
                        </mesh>
                      ) : (
                        <mesh position={[0, height - 0.08, 0]} castShadow>
                          <cylinderGeometry args={[0.034, 0.034, 0.18, 6]} />
                          <meshToonMaterial
                            color={darkWoodColor}
                            gradientMap={gradientMap}
                          />
                          <Outlines thickness={0.01} color="#111827" />
                        </mesh>
                      )}
                    </group>
                  );
                })}
              </group>
            );
          })}
        </group>
      </group>

      {/* ===================================================================== */}
      {/* 2. JEMBATAN KAYU & BATU DESA ([0, 0, +8.0], width x = -2.2 .. +2.2)   */}
      {/* ===================================================================== */}
      <group name="jembatan-kayu-batu-desa">
        {/* Stone Abutments / Piers on Both Banks (z = 5.5 and z = 10.5) */}
        {[5.5, 10.5].map((abutZ, idx) => {
          const approachZ = idx === 0 ? 5.18 : 10.82;
          return (
            <group key={`abutment-${abutZ}`}>
              {/* Main Masonry Stone Pier */}
              <mesh
                position={[0, 0.055, abutZ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[4.65, 0.47, 0.68]} />
                <meshToonMaterial
                  color={stoneColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.025} color="#111827" />
              </mesh>

              {/* Dressed Stone Cap Sill */}
              <mesh
                position={[0, 0.29, abutZ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[4.76, 0.06, 0.74]} />
                <meshToonMaterial
                  color={darkStoneColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.02} color="#111827" />
              </mesh>

              {/* Low Stone Approach Ramp Step linking road (y = 0.02) to deck edge (y = 0.35) */}
              <mesh
                position={[0, 0.09, approachZ]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[4.38, 0.16, 0.38]} />
                <meshToonMaterial
                  color={darkStoneColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.02} color="#111827" />
              </mesh>

              {/* Corner Stone Wing Pilasters */}
              {[-2.28, 2.28].map((wx) => (
                <mesh
                  key={`wing-${abutZ}-${wx}`}
                  position={[wx, 0.14, abutZ]}
                  castShadow
                  receiveShadow
                >
                  <boxGeometry args={[0.48, 0.64, 0.82]} />
                  <meshToonMaterial
                    color={darkStoneColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.022} color="#111827" />
                </mesh>
              ))}
            </group>
          );
        })}

        {/* Under-Deck Arched Wooden Stringer Beams */}
        {[-1.65, 0, 1.65].map((beamX) => (
          <group key={`stringer-${beamX}`}>
            {stringerSegments.map((seg, si) => (
              <mesh
                key={`seg-${beamX}-${si}`}
                position={[beamX, seg.midY, seg.midZ]}
                rotation={[seg.rotX, 0, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[0.18, 0.16, seg.length]} />
                <meshToonMaterial
                  color={darkWoodColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.018} color="#111827" />
              </mesh>
            ))}
          </group>
        ))}

        {/* Arched Wooden Plank Deck (y = 0.35 .. 0.62 at crest z = 8.0) */}
        <group name="bridge-plank-deck">
          {bridgePlanks.map((plank, idx) => (
            <mesh
              key={`plank-${idx}`}
              position={[0, plank.y, plank.z]}
              rotation={[plank.rotX, 0, 0]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[4.2, 0.08, 0.25]} />
              <meshToonMaterial
                color={woodPlankColors[plank.colorIdx]}
                gradientMap={gradientMap}
              />
              <Outlines thickness={0.02} color="#111827" />
            </mesh>
          ))}
        </group>

        {/* Side Wooden Railings, Posts & 4 Corner Warm Lantern Posts (x = ±2.05) */}
        {[-2.05, 2.05].map((railX) => (
          <group key={`railing-side-${railX}`}>
            {/* Vertical Posts + Corner Lanterns */}
            {RAIL_POST_Z.map((postZ) => {
              const baseY = getBridgeDeckY(postZ);
              const isCornerLantern = postZ === 5.6 || postZ === 10.4;
              const postHeight = isCornerLantern ? 1.42 : 0.86;

              return (
                <group
                  key={`post-${railX}-${postZ}`}
                  position={[railX, baseY, postZ]}
                >
                  {/* Wooden Railing / Lantern Post */}
                  <mesh position={[0, postHeight * 0.5, 0]} castShadow>
                    <boxGeometry args={[0.13, postHeight, 0.13]} />
                    <meshToonMaterial
                      color={darkWoodColor}
                      gradientMap={gradientMap}
                    />
                    <Outlines thickness={0.018} color="#111827" />
                  </mesh>

                  {isCornerLantern && (
                    <group position={[0, postHeight + 0.16, 0]}>
                      {/* Wooden Lantern Base Tray */}
                      <mesh position={[0, -0.15, 0]} castShadow>
                        <boxGeometry args={[0.26, 0.05, 0.26]} />
                        <meshToonMaterial
                          color={darkWoodColor}
                          gradientMap={gradientMap}
                        />
                        <Outlines thickness={0.015} color="#111827" />
                      </mesh>

                      {/* Warm Glowing Lantern Core */}
                      <mesh position={[0, 0, 0]}>
                        <boxGeometry args={[0.19, 0.24, 0.19]} />
                        <meshBasicMaterial color={lanternGlowColor} />
                        <Outlines thickness={0.016} color="#111827" />
                      </mesh>

                      {/* Pitched Traditional Lantern Cap Roof */}
                      <mesh
                        position={[0, 0.18, 0]}
                        rotation={[0, Math.PI / 4, 0]}
                        castShadow
                      >
                        <coneGeometry args={[0.24, 0.16, 4]} />
                        <meshToonMaterial
                          color={railWoodColor}
                          gradientMap={gradientMap}
                        />
                        <Outlines thickness={0.016} color="#111827" />
                      </mesh>

                      {/* Subtle Warm Point Light Glow during Night Scene */}
                      {isNight && (
                        <pointLight
                          position={[0, 0.02, 0]}
                          color="#fbbf24"
                          intensity={1.6}
                          distance={5.5}
                          decay={2}
                        />
                      )}
                    </group>
                  )}
                </group>
              );
            })}

            {/* Arched Top Handrail & Mid-Rail Segments */}
            {railSegments.map((seg, si) => (
              <group key={`rail-seg-${railX}-${si}`}>
                <mesh
                  position={[railX, seg.midY + 0.79, seg.midZ]}
                  rotation={[seg.rotX, 0, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.1, 0.08, seg.length + 0.04]} />
                  <meshToonMaterial
                    color={railWoodColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.016} color="#111827" />
                </mesh>
                <mesh
                  position={[railX, seg.midY + 0.43, seg.midZ]}
                  rotation={[seg.rotX, 0, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.07, 0.06, seg.length + 0.02]} />
                  <meshToonMaterial
                    color={railWoodColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.014} color="#111827" />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* ===================================================================== */}
      {/* 3. KINCIR AIR BAMBU ([-5.4, 0.25, +7.4])                              */}
      {/* ===================================================================== */}
      <group name="kincir-air-bambu" position={[-5.4, 0, 7.4]}>
        {/* Wooden & Stone Support Frame anchored in river bank & bed */}
        <group name="waterwheel-support-frame">
          {/* Sill Anchor Platform at y = 0.25 */}
          <mesh position={[0, 0.25, -0.44]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.1, 0.16]} />
            <meshToonMaterial color={darkWoodColor} gradientMap={gradientMap} />
            <Outlines thickness={0.016} color="#111827" />
          </mesh>
          <mesh position={[0, 0.25, 0.44]} castShadow receiveShadow>
            <boxGeometry args={[1.45, 0.1, 0.16]} />
            <meshToonMaterial color={darkWoodColor} gradientMap={gradientMap} />
            <Outlines thickness={0.016} color="#111827" />
          </mesh>

          {/* Front & Back Timber A-Frames */}
          {[-0.44, 0.44].map((frameZ) => (
            <group key={`aframe-${frameZ}`} position={[0, 0, frameZ]}>
              {[-1, 1].map((legSide) => (
                <mesh
                  key={`leg-${frameZ}-${legSide}`}
                  position={[legSide * 0.34, 0.42, 0]}
                  rotation={[0, 0, legSide * 0.42]}
                  castShadow
                >
                  <cylinderGeometry args={[0.055, 0.07, 1.44, 6]} />
                  <meshToonMaterial
                    color={darkWoodColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.016} color="#111827" />
                </mesh>
              ))}
              {/* Axle Bearing Cradle */}
              <mesh position={[0, WHEEL_AXLE_Y, 0]} castShadow>
                <boxGeometry args={[0.24, 0.18, 0.14]} />
                <meshToonMaterial
                  color={railWoodColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.015} color="#111827" />
              </mesh>
            </group>
          ))}

          {/* North Bank Anchor Stone Footing & Diagonal Braces */}
          <mesh position={[0, 0.08, -1.65]} castShadow receiveShadow>
            <boxGeometry args={[0.85, 0.34, 0.55]} />
            <meshToonMaterial color={stoneColor} gradientMap={gradientMap} />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
          {[-0.28, 0.28].map((braceX) => (
            <mesh
              key={`bank-brace-${braceX}`}
              position={[braceX, 0.58, -1.04]}
              rotation={[0.78, 0, 0]}
              castShadow
            >
              <cylinderGeometry args={[0.04, 0.048, 1.56, 6]} />
              <meshToonMaterial
                color={railWoodColor}
                gradientMap={gradientMap}
              />
              <Outlines thickness={0.014} color="#111827" />
            </mesh>
          ))}

          {/* Bamboo Water Chute (Talang Bambu) angled toward north riverbank */}
          <mesh
            position={[0.28, 1.48, -0.92]}
            rotation={[Math.PI / 2 - 0.16, 0, -0.14]}
            castShadow
          >
            <cylinderGeometry args={[0.075, 0.085, 1.65, 7]} />
            <meshToonMaterial color={bambooColor} gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>

          {/* Horizontal Wooden Axle Shaft */}
          <mesh
            position={[0, WHEEL_AXLE_Y, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.07, 0.07, 1.18, 8]} />
            <meshToonMaterial color={darkWoodColor} gradientMap={gradientMap} />
            <Outlines thickness={0.016} color="#111827" />
          </mesh>
        </group>

        {/* Rotating Bamboo & Wood Waterwheel */}
        <group ref={wheelRef} position={[0, WHEEL_AXLE_Y, 0]}>
          {/* Central Wheel Hub */}
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 0.52, 8]} />
            <meshToonMaterial color={darkWoodColor} gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>

          {/* Dual Wheel Rings (Spokes & Rim Chords at z = -0.18 and +0.18) */}
          {[-0.18, 0.18].map((ringZ) => (
            <group key={`wheel-ring-${ringZ}`} position={[0, 0, ringZ]}>
              {wheelAngles.spokes.map((angle, si) => (
                <mesh
                  key={`spoke-${ringZ}-${si}`}
                  rotation={[0, 0, angle]}
                  castShadow
                >
                  <cylinderGeometry
                    args={[0.028, 0.028, WHEEL_RIM_RADIUS * 2, 6]}
                  />
                  <meshToonMaterial
                    color={bambooColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.013} color="#111827" />
                </mesh>
              ))}

              {wheelAngles.rimChords.map((chord, ci) => (
                <mesh
                  key={`rim-${ringZ}-${ci}`}
                  position={[chord.x, chord.y, 0]}
                  rotation={[0, 0, chord.rotZ]}
                  castShadow
                >
                  <boxGeometry args={[0.065, chord.length, 0.06]} />
                  <meshToonMaterial
                    color={railWoodColor}
                    gradientMap={gradientMap}
                  />
                  <Outlines thickness={0.015} color="#111827" />
                </mesh>
              ))}
            </group>
          ))}

          {/* Water Paddles & Bamboo Scoop Cups around Outer Perimeter */}
          {wheelAngles.paddles.map((paddle, pi) => (
            <group
              key={`paddle-${pi}`}
              position={[paddle.x, paddle.y, 0]}
              rotation={[0, 0, paddle.rotZ]}
            >
              <mesh castShadow>
                <boxGeometry args={[0.22, 0.045, 0.48]} />
                <meshToonMaterial
                  color={woodPlankColors[pi % 3]}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.015} color="#111827" />
              </mesh>
              <mesh
                position={[0.04, 0.05, 0.14]}
                rotation={[Math.PI / 2, 0, 0]}
                castShadow
              >
                <cylinderGeometry args={[0.038, 0.038, 0.18, 6]} />
                <meshToonMaterial
                  color={bambooColor}
                  gradientMap={gradientMap}
                />
                <Outlines thickness={0.012} color="#111827" />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* Water Splash Droplets underneath the Rotating Waterwheel */}
      <instancedMesh
        ref={splashRef}
        args={[splashGeo, splashMat, SPLASH_DROPLET_COUNT]}
        frustumCulled={false}
      />
    </group>
  );
};
