import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../../shared/seededRandom';
import { useWorldAnimation } from '../../shared/useWorldTime';
import { RIVER, riverZ, heightAt } from '../layout';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const BIRD_MAT = new THREE.MeshToonMaterial({ color: '#2c2c34' });
const BF_MAT = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const FISH_MAT = new THREE.MeshToonMaterial({ color: '#ffffff' });

interface AreaProps {
  center: [number, number, number];
  spread: number;
  count: number;
  time?: number;
  seed?: number;
}

/** Burung terbang melingkar dengan kepakan sayap, di atas ketinggian tanah setempat. */
export const Birds = memo(function Birds({ center, spread, count, time, seed = 1 }: AreaProps) {
  const [cx, cy, cz] = center;
  const specs = useMemo(() => {
    const r = seededRandom(seed * 7 + 3);
    return Array.from({ length: count }, () => ({
      rad: spread * (0.4 + r() * 0.6),
      sp: 0.14 + r() * 0.14,
      ph: r() * Math.PI * 2,
      h: 16 + r() * 14,
    }));
  }, [count, spread, seed]);

  const ref = useRef<THREE.InstancedMesh>(null);
  const { parentObj, childObj, tmpMat } = useMemo(
    () => ({
      parentObj: new THREE.Object3D(),
      childObj: new THREE.Object3D(),
      tmpMat: new THREE.Matrix4(),
    }),
    []
  );

  useWorldAnimation(
    time,
    (t) => {
      const m = ref.current;
      if (!m) return;
      for (let i = 0; i < specs.length; i++) {
        const s = specs[i];
        const a = t * s.sp + s.ph;
        const x = cx + Math.cos(a) * s.rad;
        const z = cz + Math.sin(a) * s.rad;
        const y = Math.max(cy, heightAt(x, z)) + s.h + Math.sin(a * 2) * 1.5;
        const flap = Math.sin(t * 10 + i) * 0.7;

        parentObj.position.set(x, y, z);
        parentObj.rotation.set(0, -a, 0);
        parentObj.scale.set(1, 1, 1);
        parentObj.updateMatrix();

        // Body
        childObj.position.set(0, 0, 0);
        childObj.rotation.set(0, 0, 0);
        childObj.scale.set(0.5, 0.12, 0.2);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 3, tmpMat);

        // Wing +Z
        childObj.position.set(0, 0, 0.3);
        childObj.rotation.set(0, 0, flap);
        childObj.scale.set(0.9, 0.03, 0.25);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 3 + 1, tmpMat);

        // Wing -Z
        childObj.position.set(0, 0, -0.3);
        childObj.rotation.set(0, 0, -flap);
        childObj.scale.set(0.9, 0.03, 0.25);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 3 + 2, tmpMat);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [specs, cx, cy, cz, parentObj, childObj, tmpMat]
  );

  return <instancedMesh key={count} ref={ref} args={[UNIT_BOX, BIRD_MAT, count * 3]} frustumCulled={false} />;
});

const BF_COLORS = ['#f6c343', '#f28c38', '#ffffff', '#6fb7e8'];

/** Kupu-kupu beterbangan di atas taman/sawah/tepi sungai mengikuti kontur tanah. */
export const Butterflies = memo(function Butterflies({ center, spread, count, time, seed = 1 }: AreaProps) {
  const [cx, , cz] = center;
  const specs = useMemo(() => {
    const r = seededRandom(seed * 13 + 5);
    return Array.from({ length: count }, (_, i) => ({
      ox: (r() - 0.5) * spread * 2,
      oz: (r() - 0.5) * spread * 2,
      ph: r() * 20,
      color: BF_COLORS[i % BF_COLORS.length],
    }));
  }, [count, spread, seed]);

  const ref = useRef<THREE.InstancedMesh>(null);
  const { parentObj, childObj, tmpMat } = useMemo(
    () => ({
      parentObj: new THREE.Object3D(),
      childObj: new THREE.Object3D(),
      tmpMat: new THREE.Matrix4(),
    }),
    []
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const col = new THREE.Color();
    for (let i = 0; i < specs.length; i++) {
      col.set(specs[i].color);
      m.setColorAt(i * 2, col);
      m.setColorAt(i * 2 + 1, col);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [specs]);

  useWorldAnimation(
    time,
    (t) => {
      const m = ref.current;
      if (!m) return;
      for (let i = 0; i < specs.length; i++) {
        const s = specs[i];
        const bt = t * 0.45 + s.ph;
        const x = cx + s.ox + Math.sin(bt) * 2.5 + Math.sin(bt * 2.3) * 0.8;
        const z = cz + s.oz + Math.cos(bt * 0.8) * 2.5;
        const y = heightAt(x, z) + 0.9 + Math.sin(bt * 1.7) * 0.4;
        const flap = Math.sin(t * 18 + i * 2) * 0.9;

        parentObj.position.set(x, y, z);
        parentObj.rotation.set(0, bt, 0);
        parentObj.scale.set(1, 1, 1);
        parentObj.updateMatrix();

        // Wing +X
        childObj.position.set(0.07, 0, 0);
        childObj.rotation.set(0, 0, flap);
        childObj.scale.set(0.14, 0.01, 0.12);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 2, tmpMat);

        // Wing -X
        childObj.position.set(-0.07, 0, 0);
        childObj.rotation.set(0, 0, -flap);
        childObj.scale.set(0.14, 0.01, 0.12);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 2 + 1, tmpMat);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [specs, cx, cz, parentObj, childObj, tmpMat]
  );

  return <instancedMesh key={count} ref={ref} args={[UNIT_BOX, BF_MAT, count * 2]} frustumCulled={false} />;
});

/** Ikan berenang di sepanjang alur sungai `riverZ(x)` tepat di bawah permukaan air. */
export const RiverFish = memo(function RiverFish({
  count = 18,
  time,
  seed = 1,
}: {
  count?: number;
  time?: number;
  seed?: number;
}) {
  const specs = useMemo(() => {
    const r = seededRandom(seed * 19 + 11);
    return Array.from({ length: count }, (_, i) => ({
      baseX: -150 + r() * 300,
      lane: (r() - 0.5) * (RIVER.width * 0.65),
      speed: 0.7 + r() * 0.9,
      dir: r() > 0.5 ? 1 : -1,
      depth: 0.12 + (i % 3) * 0.12,
      color: i % 3 === 0 ? '#e8892b' : i % 3 === 1 ? '#d8e0e6' : '#c86a3a',
    }));
  }, [count, seed]);

  const ref = useRef<THREE.InstancedMesh>(null);
  const { parentObj, childObj, tmpMat } = useMemo(
    () => ({
      parentObj: new THREE.Object3D(),
      childObj: new THREE.Object3D(),
      tmpMat: new THREE.Matrix4(),
    }),
    []
  );

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const col = new THREE.Color();
    for (let i = 0; i < specs.length; i++) {
      col.set(specs[i].color);
      m.setColorAt(i * 2, col);
      m.setColorAt(i * 2 + 1, col);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [specs]);

  useWorldAnimation(
    time,
    (t) => {
      const m = ref.current;
      if (!m) return;
      const span = 320;
      for (let i = 0; i < specs.length; i++) {
        const f = specs[i];
        const raw = ((f.baseX + 160 + t * f.speed * f.dir) % span + span) % span;
        const x = -160 + raw;
        const z = riverZ(x) + f.lane + Math.sin(t * 1.2 + i) * 0.4;
        const zNext = riverZ(x + f.dir * 0.5) + f.lane;
        const heading = Math.atan2(f.dir * 0.5, zNext - z);
        const y = RIVER.waterY + 0.26 - f.depth;
        const wag = Math.sin(t * 9 + i) * 0.35;

        parentObj.position.set(x, y, z);
        parentObj.rotation.set(0, heading, 0);
        parentObj.scale.set(1, 1, 1);
        parentObj.updateMatrix();

        // Body
        childObj.position.set(0, 0, 0);
        childObj.rotation.set(0, 0, 0);
        childObj.scale.set(0.1, 0.1, 0.34);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 2, tmpMat);

        // Tail
        childObj.position.set(0, 0, -0.21);
        childObj.rotation.set(0, wag, 0);
        childObj.scale.set(0.02, 0.12, 0.12);
        childObj.updateMatrix();
        tmpMat.multiplyMatrices(parentObj.matrix, childObj.matrix);
        m.setMatrixAt(i * 2 + 1, tmpMat);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [specs, parentObj, childObj, tmpMat]
  );

  return <instancedMesh key={count} ref={ref} args={[UNIT_BOX, FISH_MAT, count * 2]} frustumCulled={false} />;
});
