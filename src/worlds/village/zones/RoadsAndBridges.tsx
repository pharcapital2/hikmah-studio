import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ROADS, BRIDGES, heightAt, riverZ, RIVER } from '../layout';
import { Instances, seededRandom, useWorldAnimation } from '../../shared';

interface BoxTransform {
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number];
  color: string;
}

/** Jalan tanah mengikuti kontur terrain + menyambung rata ke kedua ujung jembatan + kincir air. */
export const RoadsAndBridges = memo(function RoadsAndBridges({ time }: { time?: number }) {
  const mainBridge = BRIDGES[0];
  const bambooBridge = BRIDGES[1];

  const roadGeos = useMemo(() => {
    const mainHalfL = mainBridge.length / 2; // 11
    return ROADS.map((road) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < road.path.length - 1; i++) {
        const [ax, az] = road.path[i];
        const [bx, bz] = road.path[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const steps = Math.max(4, Math.ceil(len / 2.2));
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          pts.push([ax + (bx - ax) * t, az + (bz - az) * t]);
        }
      }
      pts.push(road.path[road.path.length - 1]);

      const hw = road.width / 2;
      const positions: number[] = [];
      const indices: number[] = [];

      const roadYAt = (rx: number, rz: number, centerOffset: number) => {
        const dzMain = Math.abs(rz - mainBridge.position[2]);
        if (Math.abs(rx - mainBridge.position[0]) < 3.6) {
          if (dzMain < mainHalfL - 0.5) {
            // Tenggelamkan strip jalan di bawah sungai agar tidak menembus papan jembatan
            return -2.2;
          }
          if (dzMain <= mainHalfL + 5.0) {
            const blend = 1 - Math.min(1, Math.max(0, (dzMain - mainHalfL) / 5.0));
            const h = heightAt(rx, rz) + centerOffset;
            return h * (1 - blend) + 0.11 * blend;
          }
        }
        return heightAt(rx, rz) + centerOffset;
      };

      for (let i = 0; i < pts.length; i++) {
        const [x, z] = pts[i];
        const prev = pts[Math.max(0, i - 1)];
        const next = pts[Math.min(pts.length - 1, i + 1)];
        const dx = next[0] - prev[0];
        const dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        const nx = -dz / len;
        const nz = dx / len;

        const lx = x + nx * hw;
        const lz = z + nz * hw;
        const rx = x - nx * hw;
        const rz = z - nz * hw;
        const ly = roadYAt(lx, lz, 0.06);
        const ry = roadYAt(rx, rz, 0.06);
        const cy = roadYAt(x, z, 0.08);

        positions.push(lx, ly, lz, x, cy, z, rx, ry, rz);
        if (i < pts.length - 1) {
          const b = i * 3;
          indices.push(b, b + 3, b + 1, b + 1, b + 3, b + 4);
          indices.push(b + 1, b + 4, b + 2, b + 2, b + 4, b + 5);
        }
      }

      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setIndex(indices);
      g.computeVertexNormals();
      return g;
    });
  }, [mainBridge]);

  const roadMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#9c7a52', roughness: 0.98 }), []);

  const pebbles = useMemo(() => {
    const r = seededRandom(3311);
    const out: { position: [number, number, number]; scale: [number, number, number]; rotationY: number; color: string }[] = [];
    for (const road of ROADS) {
      for (let i = 0; i < road.path.length - 1; i++) {
        const [ax, az] = road.path[i];
        const [bx, bz] = road.path[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        const dx = (bx - ax) / len;
        const dz = (bz - az) / len;
        const nx = -dz;
        const nz = dx;
        const count = Math.floor(len / 3.5);
        for (let k = 0; k < count; k++) {
          const d = r() * len;
          const side = r() < 0.5 ? -1 : 1;
          const off = road.width * 0.5 + 0.15 + r() * 0.4;
          const x = ax + dx * d + nx * side * off;
          const z = az + dz * d + nz * side * off;
          if (Math.abs(z - riverZ(x)) < RIVER.width * 0.75) continue;
          const sc = 0.12 + r() * 0.22;
          out.push({
            position: [x, heightAt(x, z) + sc * 0.3, z],
            scale: [sc * 1.4, sc * 0.65, sc],
            rotationY: r() * Math.PI * 2,
            color: r() < 0.5 ? '#8f887d' : '#746c61',
          });
        }
      }
    }
    return out;
  }, []);

  const pebbleGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const pebbleMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95 }), []);

  return (
    <group>
      {roadGeos.map((g, i) => (
        <mesh key={i} geometry={g} material={roadMat} receiveShadow />
      ))}
      <Instances geometry={pebbleGeo} material={pebbleMat} instances={pebbles} receiveShadow />

      <MainBridge
        x={mainBridge.position[0]}
        z={mainBridge.position[2]}
        length={mainBridge.length}
        width={mainBridge.width}
      />

      <IrrigationWaterWheel time={time} />

      <BambooBridge
        x={bambooBridge.position[0]}
        z={bambooBridge.position[2]}
        length={bambooBridge.length}
        width={bambooBridge.width}
      />
    </group>
  );
});

const MainBridge = memo(function MainBridge({
  x,
  z,
  length,
  width,
}: {
  x: number;
  z: number;
  length: number;
  width: number;
}) {
  const plankMeshRef = useRef<THREE.InstancedMesh>(null);
  const postMeshRef = useRef<THREE.InstancedMesh>(null);

  const planks = 26;
  const posts = 9;
  const archH = 1.35;
  const baseY = 0.07; // Papan tebal 0.14 -> puncak ujung di y = 0.14m (sesuai bridgeDeckY)

  const { plankInstances, postInstances, unitBoxGeo, woodMat } = useMemo(() => {
    const pl: BoxTransform[] = [];
    const halfL = length / 2;

    // Papan jembatan mengikuti lengkungan + tilt X yang presisi
    for (let i = 0; i < planks; i++) {
      const u = (i / (planks - 1)) * 2 - 1;
      const pz = u * halfL;
      const py = baseY + archH * (1 - u * u);
      const slope = (-2 * archH * u) / halfL; // dy/dz
      const tilt = -Math.atan(slope);
      pl.push({
        position: [0, py, pz],
        scale: [width, 0.14, (length / planks) * 0.9],
        rotation: [tilt, 0, 0],
        color: i % 2 === 0 ? '#8c562c' : '#784722',
      });
    }

    // Gelagar lengkung bawah papan (10 segmen agar tidak menembus papan ujung)
    const girderSegs = 10;
    for (const ox of [-width * 0.36, 0, width * 0.36]) {
      for (let i = 0; i < girderSegs; i++) {
        const u0 = (i / girderSegs) * 2 - 1;
        const u1 = ((i + 1) / girderSegs) * 2 - 1;
        const z0 = u0 * halfL;
        const z1 = u1 * halfL;
        const y0 = baseY + archH * (1 - u0 * u0) - 0.19;
        const y1 = baseY + archH * (1 - u1 * u1) - 0.19;
        const dz = z1 - z0;
        const dy = y1 - y0;
        pl.push({
          position: [ox, (y0 + y1) * 0.5, (z0 + z1) * 0.5],
          scale: [0.24, 0.24, Math.hypot(dz, dy) + 0.04],
          rotation: [-Math.atan2(dy, dz), 0, 0],
          color: '#59381d',
        });
      }
    }

    // Tiang pagar & pegangan tangan melengkung menyambung antar-tiang
    const ps: BoxTransform[] = [];
    for (const rx of [-width / 2 + 0.16, width / 2 - 0.16]) {
      const postPts: [number, number][] = [];
      for (let i = 0; i < posts; i++) {
        const u = (i / (posts - 1)) * 2 - 1;
        const pz = u * (halfL - 0.4);
        const py = baseY + archH * (1 - u * u);
        postPts.push([py + 1.08, pz]);
        ps.push({
          position: [rx, py + 0.54, pz],
          scale: [0.16, 1.12, 0.16],
          rotation: [0, 0, 0],
          color: '#5c361a',
        });
      }
      for (let i = 0; i < postPts.length - 1; i++) {
        const [y0, z0] = postPts[i];
        const [y1, z1] = postPts[i + 1];
        const dz = z1 - z0;
        const dy = y1 - y0;
        ps.push({
          position: [rx, (y0 + y1) * 0.5, (z0 + z1) * 0.5],
          scale: [0.14, 0.1, Math.hypot(dz, dy) + 0.12],
          rotation: [-Math.atan2(dy, dz), 0, 0],
          color: '#6e4220',
        });
      }
    }

    return {
      plankInstances: pl,
      postInstances: ps,
      unitBoxGeo: new THREE.BoxGeometry(1, 1, 1),
      woodMat: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
    };
  }, [length, width]);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    const fill = (m: THREE.InstancedMesh | null, list: BoxTransform[]) => {
      if (!m) return;
      for (let i = 0; i < list.length; i++) {
        const d = list[i];
        dummy.position.set(...d.position);
        dummy.rotation.set(...d.rotation);
        dummy.scale.set(...d.scale);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        m.setColorAt(i, c.set(d.color));
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    };
    fill(plankMeshRef.current, plankInstances);
    fill(postMeshRef.current, postInstances);
  }, [plankInstances, postInstances]);

  return (
    <group position={[x, 0, z]}>
      {/* Fondasi batu tepat di bawah dek ujung jembatan (puncak di y=+0.05m agar rata, tidak menghalangi) */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, -1.05, side * (length / 2 - 0.5)]} castShadow receiveShadow>
          <boxGeometry args={[width + 0.7, 2.2, 2.2]} />
          <meshStandardMaterial color="#6e7175" roughness={0.95} />
        </mesh>
      ))}
      <instancedMesh
        key={`pl-${plankInstances.length}`}
        ref={plankMeshRef}
        args={[unitBoxGeo, woodMat, plankInstances.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        key={`ps-${postInstances.length}`}
        ref={postMeshRef}
        args={[unitBoxGeo, woodMat, postInstances.length]}
      />
    </group>
  );
});

const BambooBridge = memo(function BambooBridge({
  x,
  z,
  length,
  width,
}: {
  x: number;
  z: number;
  length: number;
  width: number;
}) {
  const poles = 22;
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const { cylInstances, unitCylGeo, bambooMat } = useMemo(() => {
    const inst: BoxTransform[] = [];
    const halfL = length / 2;
    const archH = 0.45;
    const baseY = 0.08;

    // Tiang pancang di air
    for (const pz of [-length * 0.3, 0, length * 0.3]) {
      for (const px of [-width * 0.45, width * 0.45]) {
        inst.push({
          position: [px, -0.45, pz],
          scale: [0.075, 2.1, 0.075],
          rotation: [0, 0, 0],
          color: '#7a8c3a',
        });
      }
    }

    // Gelagar bambu melengkung di bawah alas
    const segs = 8;
    for (const px of [-width * 0.35, width * 0.35]) {
      for (let i = 0; i < segs; i++) {
        const u0 = (i / segs) * 2 - 1;
        const u1 = ((i + 1) / segs) * 2 - 1;
        const z0 = u0 * halfL;
        const z1 = u1 * halfL;
        const y0 = baseY + archH * (1 - u0 * u0) - 0.09;
        const y1 = baseY + archH * (1 - u1 * u1) - 0.09;
        const dz = z1 - z0;
        const dy = y1 - y0;
        inst.push({
          position: [px, (y0 + y1) * 0.5, (z0 + z1) * 0.5],
          scale: [0.065, Math.hypot(dz, dy) + 0.05, 0.065],
          rotation: [Math.PI / 2 - Math.atan2(dy, dz), 0, 0],
          color: '#8ca642',
        });
      }
    }

    // Alas bambu melintang (horizontal sepanjang sumbu X)
    for (let i = 0; i < poles; i++) {
      const u = (i / (poles - 1)) * 2 - 1;
      const pz = u * halfL;
      const arch = archH * (1 - u * u);
      inst.push({
        position: [0, baseY + arch, pz],
        scale: [0.06, width, 0.06],
        rotation: [0, 0, Math.PI / 2],
        color: i % 2 === 0 ? '#9ab54b' : '#80993b',
      });
    }

    // Tiang & pegangan bambu satu sisi mengikuti lengkung jembatan
    const railPts: [number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const u = (i / 4) * 2 - 1;
      const pz = u * (halfL - 0.4);
      const py = baseY + archH * (1 - u * u);
      railPts.push([py + 0.9, pz]);
      inst.push({
        position: [width * 0.45, py + 0.45, pz],
        scale: [0.05, 0.92, 0.05],
        rotation: [0, 0, 0],
        color: '#7a8c3a',
      });
    }
    for (let i = 0; i < railPts.length - 1; i++) {
      const [y0, z0] = railPts[i];
      const [y1, z1] = railPts[i + 1];
      const dz = z1 - z0;
      const dy = y1 - y0;
      inst.push({
        position: [width * 0.45, (y0 + y1) * 0.5, (z0 + z1) * 0.5],
        scale: [0.045, Math.hypot(dz, dy) + 0.06, 0.045],
        rotation: [Math.PI / 2 - Math.atan2(dy, dz), 0, 0],
        color: '#8fa844',
      });
    }

    return {
      cylInstances: inst,
      unitCylGeo: new THREE.CylinderGeometry(1, 1, 1, 6),
      bambooMat: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    };
  }, [length, width]);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    const dummy = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < cylInstances.length; i++) {
      const d = cylInstances[i];
      dummy.position.set(...d.position);
      dummy.rotation.set(...d.rotation);
      dummy.scale.set(...d.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, c.set(d.color));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [cylInstances]);

  return (
    <group position={[x, 0, z]}>
      <instancedMesh
        key={cylInstances.length}
        ref={meshRef}
        args={[unitCylGeo, bambooMat, cylInstances.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
});

const WHEEL_UP_AXIS = new THREE.Vector3(0, 1, 0);

function pushCylSegment(
  list: BoxTransform[],
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  color: string,
  extraLen = 0,
) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return;
  const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
  const quat = new THREE.Quaternion().setFromUnitVectors(WHEEL_UP_AXIS, dir);
  const euler = new THREE.Euler().setFromQuaternion(quat, 'XYZ');
  list.push({
    position: [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5],
    scale: [radius, len + extraLen, radius],
    rotation: [euler.x, euler.y, euler.z],
    color,
  });
}

function applyBoxTransforms(mesh: THREE.InstancedMesh | null, list: BoxTransform[]) {
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  for (let i = 0; i < list.length; i++) {
    const d = list[i];
    dummy.position.set(...d.position);
    dummy.rotation.set(...d.rotation);
    dummy.scale.set(...d.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, c.set(d.color));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/**
 * Kincir air irigasi tradisional lengkap di sisi barat jembatan utama:
 * roda bambu/kayu bertimba 12 jari-jari -> talang penadah -> saluran bambu miring
 * bertiang silang -> pancuran air -> bak penampung batu -> parit & bedengan sayur.
 */
const IrrigationWaterWheel = memo(function IrrigationWaterWheel({ time }: { time?: number }) {
  const wx = -7.5;
  const rz = riverZ(wx);
  const waterY = RIVER.waterY + 0.3; // -0.80m
  const wheelZ = rz - 3.6; // ~64.70m, sisi utara tepi aliran sungai
  const wheelRadius = 1.85;
  const axleY = waterY + wheelRadius - 0.52; // +0.53m, sudu bawah tercelup ~0.52m di arus sungai

  const wheelRef = useRef<THREE.Group>(null);
  const wheelBoxRef = useRef<THREE.InstancedMesh>(null);
  const wheelCylRef = useRef<THREE.InstancedMesh>(null);
  const staticBoxRef = useRef<THREE.InstancedMesh>(null);
  const staticCylRef = useRef<THREE.InstancedMesh>(null);
  const staticLeafRef = useRef<THREE.InstancedMesh>(null);

  const pourRef = useRef<THREE.InstancedMesh>(null);
  const flowRef = useRef<THREE.InstancedMesh>(null);
  const fallRef = useRef<THREE.InstancedMesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const splashEntryRef = useRef<THREE.Mesh>(null);
  const splashExitRef = useRef<THREE.Mesh>(null);

  const basinZWorld = 52.5;
  const endZWorld = 53.55;
  const startZLocal = -0.86;
  const endZLocal = endZWorld - wheelZ;
  const basinZLocal = basinZWorld - wheelZ;
  const basinY = useMemo(() => heightAt(wx, basinZWorld), [wx, basinZWorld]);
  const startY = 1.84;
  const endY = Math.max(0.88, basinY + 0.78);

  const {
    wheelBoxes,
    wheelCyls,
    staticBoxes,
    staticCyls,
    leafClusters,
    aqueductPitch,
    aqueductLen,
    aqueductMidY,
    aqueductMidZ,
    jetGeo,
    unitBoxGeo,
    unitCylGeo,
    unitDodecGeo,
    rimOuterGeo,
    rimInnerGeo,
    rippleGeo,
    splashGeo,
    dropGeo,
    streakGeo,
    solidMat,
    woodMat,
    darkWoodMat,
    bambooFloorMat,
    bambooRailMat,
    waterSurfaceMat,
    waterJetMat,
    foamMat,
    dummy,
  } = useMemo(() => {
    const wb: BoxTransform[] = [];
    const wc: BoxTransform[] = [];
    const sb: BoxTransform[] = [];
    const sc: BoxTransform[] = [];
    const lc: BoxTransform[] = [];

    // 1. Bagian Roda Berputar (lokal terhadap pusat poros [0, axleY, 0])
    pushCylSegment(wc, [0, 0, -0.98], [0, 0, 0.98], 0.13, '#4a2e16');
    pushCylSegment(wc, [0, 0, -0.46], [0, 0, 0.46], 0.25, '#663e1e');

    const stations = 12;
    for (let k = 0; k < stations; k++) {
      const a = (k / stations) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rTip = wheelRadius;
      const rPad = wheelRadius - 0.08;
      const rScoop = wheelRadius - 0.06;

      // Jari-jari depan & belakang sejajar bidang XY
      for (const sz of [-0.36, 0.36]) {
        pushCylSegment(wc, [0, 0, sz], [rTip * ca, rTip * sa, sz], 0.042, '#663e1e');
      }

      // Sudu kayuh penggerak arus antar dua pelek
      wb.push({
        position: [rPad * ca, rPad * sa, 0],
        scale: [0.36, 0.055, 0.78],
        rotation: [0, 0, a],
        color: k % 2 === 0 ? '#8f6236' : '#7d542d',
      });

      // Tabung timba bambu miring di sisi utara roda (z = -0.50) beserta cincin ruas, penahan, & mulut berlubang
      const sx = rScoop * ca;
      const sy = rScoop * sa;
      const tubeAngle = a - 0.35;
      wc.push({
        position: [sx, sy, -0.50],
        scale: [0.08, 0.50, 0.08],
        rotation: [0, 0, tubeAngle],
        color: '#8fa644',
      });
      // Cincin ruas pangkal bambu
      const nx = -Math.sin(tubeAngle);
      const ny = Math.cos(tubeAngle);
      wc.push({
        position: [sx - nx * 0.14, sy - ny * 0.14, -0.50],
        scale: [0.09, 0.045, 0.09],
        rotation: [0, 0, tubeAngle],
        color: '#5a6926',
      });
      // Tutup gelap lubang mulut timba
      wc.push({
        position: [sx + nx * 0.244, sy + ny * 0.244, -0.50],
        scale: [0.064, 0.025, 0.064],
        rotation: [0, 0, tubeAngle],
        color: '#1f290e',
      });
      // Ikat bambu pengunci ke pelek luar
      pushCylSegment(wc, [sx, sy, -0.36], [sx, sy, -0.50], 0.024, '#5a6926');
    }

    // 2. Penyangga Rangka-A & Pondasi Batu Kali Dasar Sungai (z = +/- 0.82)
    for (const pz of [-0.82, 0.82]) {
      sb.push({
        position: [0, -2.0, pz],
        scale: [1.65, 1.85, 0.56],
        rotation: [0, 0, 0],
        color: '#696f73',
      });
      pushCylSegment(sc, [-0.64, -1.38, pz], [0, axleY - 0.06, pz], 0.095, '#4a2e16');
      pushCylSegment(sc, [0.64, -1.38, pz], [0, axleY - 0.06, pz], 0.095, '#4a2e16');
      sb.push({
        position: [0, waterY + 0.35, pz],
        scale: [0.98, 0.14, 0.14],
        rotation: [0, 0, 0],
        color: '#5c391b',
      });
      sb.push({
        position: [0, axleY - 0.05, pz],
        scale: [0.34, 0.22, 0.24],
        rotation: [0, 0, 0],
        color: '#3b2410',
      });
      sb.push({
        position: [0, axleY + 0.10, pz],
        scale: [0.28, 0.08, 0.22],
        rotation: [0, 0, 0],
        color: '#475569',
      });
    }

    // 3. Talang Penadah di atas sisi utara roda (z = -0.86, bebas benturan dari timba z >= -0.585)
    sb.push({
      position: [-0.35, startY - 0.03, startZLocal],
      scale: [1.40, 0.06, 0.40],
      rotation: [0, 0, 0],
      color: '#7a4c26',
    });
    // Dinding belakang talang (terbelah di x in [-0.17, +0.17] untuk mulut keluar ke saluran bambu)
    sb.push({
      position: [-0.61, startY + 0.10, startZLocal - 0.175],
      scale: [0.88, 0.24, 0.05],
      rotation: [0, 0, 0],
      color: '#6b4220',
    });
    sb.push({
      position: [0.26, startY + 0.10, startZLocal - 0.175],
      scale: [0.18, 0.24, 0.05],
      rotation: [0, 0, 0],
      color: '#6b4220',
    });
    // Dinding ujung kiri/kanan talang
    sb.push({
      position: [-1.025, startY + 0.10, startZLocal],
      scale: [0.05, 0.24, 0.40],
      rotation: [0, 0, 0],
      color: '#6b4220',
    });
    sb.push({
      position: [0.325, startY + 0.10, startZLocal],
      scale: [0.05, 0.24, 0.40],
      rotation: [0, 0, 0],
      color: '#6b4220',
    });
    // Dinding depan rendah + bibir penangkap cipratan miring (terhenti aman di z = -0.615)
    sb.push({
      position: [-0.35, startY + 0.05, startZLocal + 0.175],
      scale: [1.40, 0.14, 0.05],
      rotation: [0, 0, 0],
      color: '#6b4220',
    });
    sb.push({
      position: [-0.35, startY + 0.11, startZLocal + 0.22],
      scale: [1.34, 0.04, 0.09],
      rotation: [-0.45, 0, 0],
      color: '#8f6236',
    });
    // Dua tiang penopang belakang talang tertancap ke dasar sungai (di z = -1.04, bebas rangka-A)
    for (const tx of [-0.96, 0.26]) {
      pushCylSegment(sc, [tx, -2.8, startZLocal - 0.18], [tx, startY + 0.06, startZLocal - 0.18], 0.072, '#4a2e16');
    }
    pushCylSegment(sc, [-0.96, waterY + 0.6, startZLocal - 0.18], [0.26, waterY + 0.6, startZLocal - 0.18], 0.055, '#5c391b');

    // 4. Saluran Irigasi Bambu Miring (gravitasi dari startY -> endY) + 4 Tiang Silang X-Frame
    const dzAq = endZLocal - startZLocal; // negatif (-z ke utara)
    const dyAq = endY - startY; // negatif (turun ke utara)
    const aqLen = Math.hypot(dzAq, dyAq);
    const aqPitch = Math.atan2(dyAq, startZLocal - endZLocal);
    const aqMidY = (startY + endY) * 0.5;
    const aqMidZ = (startZLocal + endZLocal) * 0.5;

    // Cincin ruas sepanjang saluran bambu terbuka
    for (let i = 0; i < 8; i++) {
      const f = (i + 0.5) / 8;
      const cz = startZLocal + dzAq * f;
      const cy = startY + dyAq * f;
      sb.push({
        position: [0, cy + 0.02, cz],
        scale: [0.34, 0.16, 0.06],
        rotation: [aqPitch, 0, 0],
        color: '#566622',
      });
    }

    // 4 Tiang silang X-frame menyangga tepat di bawah talang bambu & menancap ke kontur tepi sungai
    for (const frac of [0.20, 0.44, 0.68, 0.92]) {
      const bzLocal = startZLocal + dzAq * frac;
      const bzWorld = wheelZ + bzLocal;
      const ay = startY + dyAq * frac;
      const gy = heightAt(wx, bzWorld);
      const botY = Math.min(gy, waterY - 0.2) - 0.35;
      const topY = ay - 0.06;
      pushCylSegment(sc, [-0.46, botY, bzLocal], [0.20, topY, bzLocal], 0.055, '#809638');
      pushCylSegment(sc, [0.46, botY, bzLocal], [-0.20, topY, bzLocal], 0.055, '#809638');
      pushCylSegment(sc, [-0.25, topY - 0.02, bzLocal], [0.25, topY - 0.02, bzLocal], 0.05, '#687a2a');
      pushCylSegment(sc, [-0.18, topY - 0.04, bzLocal], [-0.18, topY + 0.14, bzLocal], 0.032, '#687a2a');
      pushCylSegment(sc, [0.18, topY - 0.04, bzLocal], [0.18, topY + 0.14, bzLocal], 0.032, '#687a2a');
    }

    // 5. Bak Penampung Batu Kali di Tepi Utara (tertanam kuat di terrain)
    const wallTop = basinY + 0.48;
    const wallBot = basinY - 0.55;
    const wallH = wallTop - wallBot;
    const wallMidY = (wallTop + wallBot) * 0.5;
    // Lantai bak tertanam
    sb.push({
      position: [0, basinY - 0.36, basinZLocal],
      scale: [2.50, 0.84, 2.10],
      rotation: [0, 0, 0],
      color: '#595e63',
    });
    // Dinding Utara, Selatan, Timur
    sb.push({
      position: [0, wallMidY, basinZLocal - 0.90],
      scale: [2.40, wallH, 0.24],
      rotation: [0, 0, 0],
      color: '#73787d',
    });
    sb.push({
      position: [0, wallMidY, basinZLocal + 0.90],
      scale: [2.40, wallH, 0.24],
      rotation: [0, 0, 0],
      color: '#73787d',
    });
    sb.push({
      position: [1.08, wallMidY, basinZLocal],
      scale: [0.24, wallH, 1.60],
      rotation: [0, 0, 0],
      color: '#6b7075',
    });
    // Dinding Barat terbelah membentuk cerukan pelimpah (overflow notch di z = 52.55)
    sb.push({
      position: [-1.08, wallMidY, basinZLocal - 0.53],
      scale: [0.24, wallH, 0.64],
      rotation: [0, 0, 0],
      color: '#6b7075',
    });
    sb.push({
      position: [-1.08, wallMidY, basinZLocal + 0.57],
      scale: [0.24, wallH, 0.56],
      rotation: [0, 0, 0],
      color: '#6b7075',
    });
    // Ambang pelimpah rendah (puncak di basinY + 0.29, di bawah permukaan air bak +0.36)
    const sillTop = basinY + 0.29;
    sb.push({
      position: [-1.08, (sillTop + wallBot) * 0.5, basinZLocal + 0.05],
      scale: [0.30, sillTop - wallBot, 0.54],
      rotation: [0, 0, 0],
      color: '#5c6659',
    });
    // Batu kali & lumut dekoratif di bibir bak
    const r = seededRandom(9182);
    for (let i = 0; i < 14; i++) {
      const side = i % 4;
      let rx = 0;
      let rzl = basinZLocal;
      if (side === 0) {
        rx = -1.0 + (i / 14) * 2.0;
        rzl = basinZLocal - 0.90;
      } else if (side === 1) {
        rx = -1.0 + (i / 14) * 2.0;
        rzl = basinZLocal + 0.90;
      } else if (side === 2) {
        rx = 1.08;
        rzl = basinZLocal - 0.65 + (i / 14) * 1.30;
      } else {
        rx = -1.08;
        rzl = i % 2 === 0 ? basinZLocal - 0.6 : basinZLocal + 0.62;
      }
      const stoneH = 0.14 + r() * 0.10;
      sb.push({
        position: [rx, wallTop + stoneH * 0.35, rzl],
        scale: [0.28 + r() * 0.14, stoneH, 0.26 + r() * 0.1],
        rotation: [0, (r() - 0.5) * 0.6, 0],
        color: r() < 0.35 ? '#5f7054' : r() < 0.7 ? '#83888c' : '#6f7478',
      });
    }
    // Ember timba bambu kecil di pinggir utara bak
    sc.push({
      position: [0.72, wallTop + 0.16, basinZLocal - 0.90],
      scale: [0.16, 0.32, 0.16],
      rotation: [0, 0, 0],
      color: '#93aa46',
    });
    sc.push({
      position: [0.72, wallTop + 0.30, basinZLocal - 0.90],
      scale: [0.175, 0.04, 0.175],
      rotation: [0, 0, 0],
      color: '#5a6926',
    });

    // 6. Parit Batu Mengalir ke Barat -> Bedengan Sayur/Talas Irigasi
    const furrowZWorld = 52.55;
    const furrowZLocal = furrowZWorld - wheelZ;
    for (let s = 0; s < 4; s++) {
      const fxLocal = -1.25 - s * 0.42;
      const fy = heightAt(wx + fxLocal, furrowZWorld);
      sb.push({
        position: [fxLocal, fy - 0.08, furrowZLocal],
        scale: [0.46, 0.22, 0.42],
        rotation: [0, 0, 0],
        color: '#3f2c1f',
      });
      sb.push({
        position: [fxLocal, fy + 0.05, furrowZLocal - 0.24],
        scale: [0.44, 0.18, 0.16],
        rotation: [0, (r() - 0.5) * 0.3, 0],
        color: s % 2 === 0 ? '#74797d' : '#616d56',
      });
      sb.push({
        position: [fxLocal, fy + 0.05, furrowZLocal + 0.24],
        scale: [0.44, 0.18, 0.16],
        rotation: [0, (r() - 0.5) * 0.3, 0],
        color: s % 2 === 1 ? '#74797d' : '#616d56',
      });
    }

    // Bedengan kebun sayur tepi sungai di (x = -11.6, z = 52.65)
    const gxWorld = -11.6;
    const gzWorld = 52.65;
    const gxLocal = gxWorld - wx; // -4.10
    const gzLocal = gzWorld - wheelZ;
    const bedY = heightAt(gxWorld, gzWorld);

    // Tanah bedengan gelap tertanam ke kontur
    sb.push({
      position: [gxLocal, bedY - 0.31, gzLocal],
      scale: [3.05, 0.90, 2.40],
      rotation: [0, 0, 0],
      color: '#4e3626',
    });
    // Alur tanah lembap di tengah bedengan untuk air irigasi
    sb.push({
      position: [gxLocal, bedY + 0.04, gzLocal],
      scale: [3.08, 0.20, 0.40],
      rotation: [0, 0, 0],
      color: '#322117',
    });
    // Pembatas bambu keliling bedengan + patok sudut
    pushCylSegment(sc, [gxLocal - 1.54, bedY + 0.16, gzLocal - 1.22], [gxLocal + 1.54, bedY + 0.16, gzLocal - 1.22], 0.055, '#8ca340');
    pushCylSegment(sc, [gxLocal - 1.54, bedY + 0.16, gzLocal + 1.22], [gxLocal + 1.54, bedY + 0.16, gzLocal + 1.22], 0.055, '#8ca340');
    pushCylSegment(sc, [gxLocal - 1.54, bedY + 0.16, gzLocal - 1.22], [gxLocal - 1.54, bedY + 0.16, gzLocal + 1.22], 0.055, '#8ca340');
    pushCylSegment(sc, [gxLocal + 1.54, bedY + 0.16, gzLocal - 1.22], [gxLocal + 1.54, bedY + 0.16, gzLocal - 0.26], 0.055, '#8ca340');
    pushCylSegment(sc, [gxLocal + 1.54, bedY + 0.16, gzLocal + 0.26], [gxLocal + 1.54, bedY + 0.16, gzLocal + 1.22], 0.055, '#8ca340');
    for (const cxp of [-1.54, 1.54]) {
      for (const czp of [-1.22, 1.22]) {
        pushCylSegment(sc, [gxLocal + cxp, bedY - 0.25, gzLocal + czp], [gxLocal + cxp, bedY + 0.30, gzLocal + czp], 0.048, '#5a6e27');
      }
    }

    // 16 Rumpun tanaman talas/kangkung segar deterministik di kiri-kanan alur irigasi
    const leafColors = ['#4ea83b', '#3e8f2f', '#65bd45', '#58b342'];
    for (const rowOffZ of [-0.66, 0.66]) {
      for (let c = 0; c < 8; c++) {
        const px = gxLocal - 1.22 + c * 0.35 + (r() - 0.5) * 0.06;
        const pz = gzLocal + rowOffZ + (r() - 0.5) * 0.08;
        const py = heightAt(wx + px, wheelZ + pz);
        const plantBaseY = Math.max(bedY + 0.14, py);
        for (let lf = 0; lf < 3; lf++) {
          const ang = lf * 2.1 + r() * 0.8;
          const scLeaf = 0.15 + r() * 0.06;
          lc.push({
            position: [px + Math.cos(ang) * 0.07, plantBaseY + 0.10 + (lf === 0 ? 0.06 : 0), pz + Math.sin(ang) * 0.07],
            scale: [scLeaf * 1.15, scLeaf * 0.85, scLeaf * 1.15],
            rotation: [(r() - 0.5) * 0.4, r() * Math.PI * 2, (r() - 0.5) * 0.4],
            color: leafColors[(c + lf) % leafColors.length],
          });
        }
      }
    }

    // Kurva pancuran air mulus dari mulut saluran bambu ke permukaan air bak
    const jetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, endY + 0.01, endZLocal + 0.06),
      new THREE.Vector3(0, endY - 0.06, endZLocal - 0.20),
      new THREE.Vector3(0, endY - 0.26, endZLocal - 0.38),
      new THREE.Vector3(0, basinY + 0.34, endZLocal - 0.50),
    ]);

    return {
      wheelBoxes: wb,
      wheelCyls: wc,
      staticBoxes: sb,
      staticCyls: sc,
      leafClusters: lc,
      aqueductPitch: aqPitch,
      aqueductLen: aqLen,
      aqueductMidY: aqMidY,
      aqueductMidZ: aqMidZ,
      jetGeo: new THREE.TubeGeometry(jetCurve, 14, 0.055, 8, false),
      unitBoxGeo: new THREE.BoxGeometry(1, 1, 1),
      unitCylGeo: new THREE.CylinderGeometry(1, 1, 1, 8),
      unitDodecGeo: new THREE.DodecahedronGeometry(1, 0),
      rimOuterGeo: new THREE.TorusGeometry(wheelRadius, 0.065, 8, 28),
      rimInnerGeo: new THREE.TorusGeometry(wheelRadius * 0.62, 0.045, 7, 24),
      rippleGeo: new THREE.RingGeometry(0.16, 0.28, 18),
      splashGeo: new THREE.RingGeometry(0.24, 0.38, 16),
      dropGeo: new THREE.CylinderGeometry(0.025, 0.036, 0.18, 6),
      streakGeo: new THREE.BoxGeometry(0.06, 0.025, 0.32),
      solidMat: new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      woodMat: new THREE.MeshStandardMaterial({ color: '#7a4c26', roughness: 0.88 }),
      darkWoodMat: new THREE.MeshStandardMaterial({ color: '#5c381a', roughness: 0.9 }),
      bambooFloorMat: new THREE.MeshStandardMaterial({ color: '#8fa644', roughness: 0.85 }),
      bambooRailMat: new THREE.MeshStandardMaterial({ color: '#7c9138', roughness: 0.85 }),
      waterSurfaceMat: new THREE.MeshStandardMaterial({
        color: '#3d9ed6',
        roughness: 0.18,
        metalness: 0.15,
        transparent: true,
        opacity: 0.85,
      }),
      waterJetMat: new THREE.MeshStandardMaterial({
        color: '#8ad4f5',
        roughness: 0.15,
        transparent: true,
        opacity: 0.82,
      }),
      foamMat: new THREE.MeshBasicMaterial({
        color: '#e0f6ff',
        transparent: true,
        opacity: 0.82,
      }),
      dummy: new THREE.Object3D(),
    };
  }, [wx, wheelZ, waterY, wheelRadius, axleY, startY, endY, basinY, startZLocal, endZLocal, basinZLocal]);

  useLayoutEffect(() => {
    applyBoxTransforms(wheelBoxRef.current, wheelBoxes);
    applyBoxTransforms(wheelCylRef.current, wheelCyls);
    applyBoxTransforms(staticBoxRef.current, staticBoxes);
    applyBoxTransforms(staticCylRef.current, staticCyls);
    applyBoxTransforms(staticLeafRef.current, leafClusters);
  }, [wheelBoxes, wheelCyls, staticBoxes, staticCyls, leafClusters]);

  useWorldAnimation(
    time,
    (t) => {
      // Putar roda berlawanan arah jarum jam (+Z) mengikuti aliran sungai ke timur (+X)
      if (wheelRef.current) {
        wheelRef.current.rotation.z = t * 0.72;
      }

      // 5 aliran air tumpah dari timba bambu puncak roda ke talang penadah
      const pm = pourRef.current;
      if (pm) {
        for (let i = 0; i < 5; i++) {
          const p = (t * 2.1 + i * 0.2) % 1;
          const x = -0.78 + (i % 3) * 0.28 + Math.sin(i * 1.9) * 0.05;
          const y = 2.26 - p * 0.38;
          const z = -0.56 - p * 0.28;
          dummy.position.set(x, y, z);
          dummy.rotation.set(0.55, 0, 0);
          dummy.scale.set(0.9, 0.85 + p * 0.7, 0.9);
          dummy.updateMatrix();
          pm.setMatrixAt(i, dummy.matrix);
        }
        pm.instanceMatrix.needsUpdate = true;
      }

      // 10 garis arus mengalir menuruni saluran bambu miring menuju bak batu
      const fm = flowRef.current;
      if (fm) {
        for (let i = 0; i < 10; i++) {
          const p = (t * 0.55 + i * 0.1) % 1;
          const x = (i % 2 === 0 ? -0.045 : 0.045) * Math.cos(i);
          const y = startY + (endY - startY) * p + 0.055;
          const z = startZLocal + (endZLocal - startZLocal) * p;
          dummy.position.set(x, y, z);
          dummy.rotation.set(aqueductPitch, 0, 0);
          dummy.scale.set(1, 1, 0.85 + 0.35 * Math.sin(t * 4 + i));
          dummy.updateMatrix();
          fm.setMatrixAt(i, dummy.matrix);
        }
        fm.instanceMatrix.needsUpdate = true;
      }

      // 4 butir air jatuh di pancuran ujung utara masuk ke dalam bak penampung
      const wm = fallRef.current;
      if (wm) {
        const dropTopY = endY - 0.02;
        const dropBotY = basinY + 0.36;
        for (let i = 0; i < 4; i++) {
          const p = (t * 2.4 + i * 0.25) % 1;
          const y = dropTopY + (dropBotY - dropTopY) * p;
          const z = endZLocal - 0.12 - p * 0.38;
          const x = ((i % 2) - 0.5) * 0.06;
          dummy.position.set(x, y, z);
          dummy.rotation.set(0.32, 0, 0);
          dummy.scale.set(1.1, 0.8 + p * 0.7, 1.1);
          dummy.updateMatrix();
          wm.setMatrixAt(i, dummy.matrix);
        }
        wm.instanceMatrix.needsUpdate = true;
      }

      // Riak air di permukaan bak penampung
      if (rippleRef.current) {
        const pulse = (t * 1.4) % 1;
        rippleRef.current.scale.setScalar(0.6 + pulse * 1.35);
      }

      // Cipratan buih di kiri & kanan dasar roda yang mencelup sungai
      if (splashEntryRef.current) {
        const s1 = 0.85 + Math.sin(t * 5.2) * 0.25;
        splashEntryRef.current.scale.setScalar(s1);
      }
      if (splashExitRef.current) {
        const s2 = 0.85 + Math.cos(t * 5.2 + 1.1) * 0.25;
        splashExitRef.current.scale.setScalar(s2);
      }
    },
    [aqueductPitch, basinY, dummy, endY, endZLocal, startY, startZLocal]
  );

  const furrowZLocal = 52.55 - wheelZ;
  const gxLocal = -11.6 - wx;
  const gzLocal = 52.65 - wheelZ;
  const furrowYEast = heightAt(wx - 1.05, 52.55);
  const furrowYWest = heightAt(wx - 2.70, 52.55);
  const furrowAvgY = (furrowYEast + furrowYWest) * 0.5;
  const furrowTiltZ = Math.atan2(furrowYEast - furrowYWest, 1.65);
  const bedY = heightAt(-11.6, 52.65);

  return (
    <group position={[wx, 0, wheelZ]}>
      {/* Roda Kincir Berputar */}
      <group ref={wheelRef} position={[0, axleY, 0]}>
        <mesh position={[0, 0, -0.36]} geometry={rimOuterGeo} material={woodMat} castShadow />
        <mesh position={[0, 0, 0.36]} geometry={rimOuterGeo} material={woodMat} castShadow />
        <mesh position={[0, 0, -0.36]} geometry={rimInnerGeo} material={darkWoodMat} />
        <mesh position={[0, 0, 0.36]} geometry={rimInnerGeo} material={darkWoodMat} />
        <instancedMesh
          key={`wb-${wheelBoxes.length}`}
          ref={wheelBoxRef}
          args={[unitBoxGeo, solidMat, wheelBoxes.length]}
          castShadow
        />
        <instancedMesh
          key={`wc-${wheelCyls.length}`}
          ref={wheelCylRef}
          args={[unitCylGeo, solidMat, wheelCyls.length]}
          castShadow
        />
      </group>

      {/* Rangka Statis (Rangka-A, Talang Penadah, Tiang Silang, Bak Batu Kali, Bedengan) */}
      <instancedMesh
        key={`sb-${staticBoxes.length}`}
        ref={staticBoxRef}
        args={[unitBoxGeo, solidMat, staticBoxes.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        key={`sc-${staticCyls.length}`}
        ref={staticCylRef}
        args={[unitCylGeo, solidMat, staticCyls.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh
        key={`lc-${leafClusters.length}`}
        ref={staticLeafRef}
        args={[unitDodecGeo, solidMat, leafClusters.length]}
        castShadow
        receiveShadow
      />

      {/* Saluran Bambu Terbuka Berkemiringan Menuju Bak Penampung */}
      <group position={[0, aqueductMidY, aqueductMidZ]} rotation={[aqueductPitch, 0, 0]}>
        <mesh position={[0, -0.02, 0]} material={bambooFloorMat} castShadow receiveShadow>
          <boxGeometry args={[0.26, 0.04, aqueductLen]} />
        </mesh>
        <mesh position={[-0.14, 0.055, 0]} material={bambooRailMat} castShadow>
          <boxGeometry args={[0.045, 0.15, aqueductLen]} />
        </mesh>
        <mesh position={[0.14, 0.055, 0]} material={bambooRailMat} castShadow>
          <boxGeometry args={[0.045, 0.15, aqueductLen]} />
        </mesh>
        <mesh position={[0, 0.028, 0]} material={waterSurfaceMat}>
          <boxGeometry args={[0.20, 0.028, aqueductLen - 0.06]} />
        </mesh>
      </group>

      {/* Genangan Air di Talang Penadah, Bak Penampung, Parit & Bedengan */}
      <mesh position={[-0.35, startY + 0.045, startZLocal]} material={waterSurfaceMat}>
        <boxGeometry args={[1.30, 0.03, 0.28]} />
      </mesh>
      <mesh position={[0, basinY + 0.34, basinZLocal]} material={waterSurfaceMat}>
        <boxGeometry args={[1.94, 0.07, 1.54]} />
      </mesh>
      <mesh position={[-1.88, furrowAvgY + 0.04, furrowZLocal]} rotation={[0, 0, furrowTiltZ]} material={waterSurfaceMat}>
        <boxGeometry args={[1.65, 0.03, 0.24]} />
      </mesh>
      <mesh position={[gxLocal, bedY + 0.15, gzLocal]} material={waterSurfaceMat}>
        <boxGeometry args={[2.92, 0.028, 0.24]} />
      </mesh>

      {/* Aliran Air Mancur, Tetesan Timba, Riak Bak, dan Buih Sungai */}
      <mesh geometry={jetGeo} material={waterJetMat} />
      <instancedMesh ref={pourRef} args={[dropGeo, foamMat, 5]} frustumCulled={false} />
      <instancedMesh ref={flowRef} args={[streakGeo, foamMat, 10]} frustumCulled={false} />
      <instancedMesh ref={fallRef} args={[dropGeo, foamMat, 4]} frustumCulled={false} />

      <mesh
        ref={rippleRef}
        position={[0, basinY + 0.382, endZLocal - 0.50]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={rippleGeo}
        material={foamMat}
      />
      <mesh
        ref={splashEntryRef}
        position={[-1.42, waterY + 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={splashGeo}
        material={foamMat}
      />
      <mesh
        ref={splashExitRef}
        position={[1.42, waterY + 0.04, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={splashGeo}
        material={foamMat}
      />
    </group>
  );
});
