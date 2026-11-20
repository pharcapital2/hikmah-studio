import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RICE } from '../layout';
import { Instances, seededRandom, useWorldAnimation } from '../../shared';

function createScarecrowTunicGeo(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.2, 0.01),
    new THREE.Vector2(0.26, 0.06),
    new THREE.Vector2(0.24, 0.2),
    new THREE.Vector2(0.2, 0.36),
    new THREE.Vector2(0.15, 0.5),
    new THREE.Vector2(0.1, 0.59),
    new THREE.Vector2(0.0, 0.62),
  ];
  return new THREE.LatheGeometry(pts, 14);
}

const SCARECROW_TUNIC_GEO = createScarecrowTunicGeo();
const SCARECROW_OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: '#111827', side: THREE.BackSide });

/** Sawah bertingkat: 8 teras + pematang + genangan air + saluran irigasi bambu + ribuan batang padi bergoyang angin (`time` atau R3F clock). */
export const RiceFieldZone = memo(function RiceFieldZone({ time }: { time?: number }) {
  const [cx, cz] = RICE.center;
  const [w, d] = RICE.size;
  const tierD = d / RICE.terraceCount;

  const stalks = useMemo(() => {
    const r = seededRandom(7171);
    const out: { x: number; y: number; z: number; h: number; phase: number; color: string }[] = [];
    const cols = ['#6ab840', '#7ec84b', '#8cd14f', '#5ca838', '#a3c948'];
    for (let t = 0; t < RICE.terraceCount; t++) {
      // t = 0 di selatan (paling rendah) -> t = terraceCount-1 di utara (paling tinggi)
      const tz = cz + d / 2 - (t + 0.5) * tierD;
      const ty = RICE.baseY + t * RICE.terraceStepY;
      // 3 petak per teras (dipisahkan pematang X)
      for (let plot = 0; plot < 3; plot++) {
        const px0 = cx - w / 2 + plot * (w / 3) + 2.5;
        const px1 = cx - w / 2 + (plot + 1) * (w / 3) - 2.5;
        const pz0 = tz - tierD / 2 + 1.8;
        const pz1 = tz + tierD / 2 - 1.8;
        for (let x = px0; x <= px1; x += 1.65) {
          for (let z = pz0; z <= pz1; z += 1.65) {
            out.push({
              x: x + (r() - 0.5) * 0.7,
              y: ty,
              z: z + (r() - 0.5) * 0.7,
              h: 0.75 + r() * 0.35,
              phase: x * 0.14 + z * 0.11 + r() * 1.2,
              color: cols[Math.floor(r() * cols.length)],
            });
          }
        }
      }
    }
    return out;
  }, [cx, cz, w, d, tierD]);

  const stalkRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const stalkGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.18, 0.9, 4);
    g.translate(0, 0.45, 0);
    return g;
  }, []);
  const stalkMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), []);

  useLayoutEffect(() => {
    const m = stalkRef.current;
    if (!m) return;
    const c = new THREE.Color();
    stalks.forEach((s, i) => m.setColorAt(i, c.set(s.color)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [stalks]);

  useWorldAnimation(
    time,
    (t) => {
      const m = stalkRef.current;
      if (!m) return;
      for (let i = 0; i < stalks.length; i++) {
        const s = stalks[i];
        const sway = Math.sin(t * 2.1 + s.phase) * 0.16;
        dummy.position.set(s.x, s.y + 0.04, s.z);
        dummy.rotation.set(sway * 0.6, 0, sway);
        dummy.scale.set(1, s.h, 1);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [stalks, dummy]
  );

  // Pematang & genangan air per teras (di-instance agar hemat draw call)
  const { waterInstances, bundInstances, spoutInstances, streamInstances } = useMemo(() => {
    const water: { position: [number, number, number]; scale: [number, number, number]; rotationX: number; color: string }[] = [];
    const bunds: { position: [number, number, number]; scale: [number, number, number]; color: string }[] = [];
    const spouts: { position: [number, number, number]; rotationX: number; color: string }[] = [];
    const streams: { position: [number, number, number]; color: string }[] = [];

    for (let t = 0; t < RICE.terraceCount; t++) {
      const tz = cz + d / 2 - (t + 0.5) * tierD;
      const ty = RICE.baseY + t * RICE.terraceStepY;
      water.push({ position: [cx, ty + 0.03, tz], scale: [w - 2, tierD - 1.2, 1], rotationX: -Math.PI / 2, color: '#4a8fa3' });
      bunds.push({ position: [cx, ty + 0.14, tz + tierD / 2], scale: [w, 0.36, 0.9], color: '#7b613f' });
      bunds.push({ position: [cx - w / 6, ty + 0.12, tz], scale: [0.7, 0.28, tierD], color: '#7b613f' });
      bunds.push({ position: [cx + w / 6, ty + 0.12, tz], scale: [0.7, 0.28, tierD], color: '#7b613f' });
      if (t > 0) {
        const sx = cx - w / 3 + 4;
        const sy = ty + 0.05;
        const sz = tz + tierD / 2;
        spouts.push({ position: [sx, sy, sz], rotationX: Math.PI / 2 + 0.25, color: '#8fa844' });
        streams.push({ position: [sx, sy - 0.55, sz + 0.7], color: '#bfe9ff' });
      }
    }
    return { waterInstances: water, bundInstances: bunds, spoutInstances: spouts, streamInstances: streams };
  }, [cx, cz, w, tierD]);

  const unitPlaneGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const waterMat = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.25, transparent: true, opacity: 0.78 }),
    []
  );
  const unitBoxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bundMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95 }), []);
  const spoutGeo = useMemo(() => new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), []);
  const spoutMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8 }), []);
  const streamGeo = useMemo(() => new THREE.CylinderGeometry(0.05, 0.08, 1.1, 6), []);
  const streamMat = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.65 }), []);

  return (
    <group>
      <Instances geometry={unitPlaneGeo} material={waterMat} instances={waterInstances} receiveShadow />
      <Instances geometry={unitBoxGeo} material={bundMat} instances={bundInstances} castShadow receiveShadow />
      <Instances geometry={spoutGeo} material={spoutMat} instances={spoutInstances} />
      <Instances geometry={streamGeo} material={streamMat} instances={streamInstances} />

      {/* Saluran irigasi utama di sisi barat sawah */}
      <mesh position={[cx - w / 2 - 1.2, RICE.baseY + (RICE.terraceCount * RICE.terraceStepY) * 0.45, cz]} rotation={[-0.085, 0, 0]}>
        <boxGeometry args={[1.4, 0.35, d]} />
        <meshStandardMaterial color="#4a8fa3" roughness={0.2} />
      </mesh>

      {/* Batang padi instanced bergoyang */}
      <instancedMesh
        key={stalks.length}
        ref={stalkRef}
        args={[stalkGeo, stalkMat, stalks.length]}
        frustumCulled={false}
      />

      {/* Orang-orangan sawah chibi-stickman */}
      <group position={[cx + 8, RICE.baseY + 2 * RICE.terraceStepY, cz + 20]}>
        <mesh position={[0, 1.1, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 2.2, 5]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
        <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.4, 5]} />
          <meshStandardMaterial color="#6b4423" />
        </mesh>
        <mesh position={[0, 0.98, 0]} geometry={SCARECROW_TUNIC_GEO} castShadow>
          <meshToonMaterial color="#c94b3b" />
        </mesh>
        <mesh position={[0, 0.965, 0]} scale={[1.06, 1.05, 1.06]} geometry={SCARECROW_TUNIC_GEO} material={SCARECROW_OUTLINE_MAT} />
        <group position={[0, 1.84, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.23, 14, 10]} />
            <meshToonMaterial color="#f5ebd6" />
          </mesh>
          <mesh scale={1.06} material={SCARECROW_OUTLINE_MAT}>
            <sphereGeometry args={[0.23, 14, 10]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.075, 0.02, 0.215]}>
              <sphereGeometry args={[0.022, 8, 6]} />
              <meshBasicMaterial color="#0f172a" />
            </mesh>
          ))}
        </group>
        <group position={[0, 2.06, -0.01]} rotation={[-0.08, 0, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.42, 0.2, 14]} />
            <meshToonMaterial color="#d97706" />
          </mesh>
          <mesh scale={[1.05, 1.07, 1.05]} material={SCARECROW_OUTLINE_MAT}>
            <coneGeometry args={[0.42, 0.2, 14]} />
          </mesh>
        </group>
      </group>
    </group>
  );
});
