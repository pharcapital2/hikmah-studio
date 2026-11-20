import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RIVER, riverZ, WORLD_HALF, BRIDGES } from '../layout';
import { Instances, useWorldAnimation } from '../../shared';

/** Sungai: pita air + garis aliran bergerak (digerakkan `time` atau R3F clock) + batu tepi sungai. */
export const River = memo(function River({ time }: { time?: number }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_HALF * 2 + 40, 1, 80, 4);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const v = p.getZ(i); // -0.5..0.5
      p.setZ(i, riverZ(x) + v * (RIVER.width + 3));
      p.setY(i, RIVER.waterY + 0.3);
    }
    g.computeVertexNormals();
    return g;
  }, []);

  const waterMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3d8fbf', transparent: true, opacity: 0.82, roughness: 0.15, metalness: 0.2 }),
    []
  );

  const stripeGeo = useMemo(() => new THREE.PlaneGeometry(2.4, 0.18).rotateX(-Math.PI / 2), []);
  const stripeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d9f1ff', transparent: true, opacity: 0.55 }), []);
  const N = 90;
  const stripes = useMemo(() => Array.from({ length: N }, (_, i) => ({ k: i, off: (i * 0.6180339) % 1, lane: ((i * 0.37) % 1) - 0.5 })), []);
  const speed = 3; // m/s ke timur
  const stripeRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useWorldAnimation(
    time,
    (t) => {
      const m = stripeRef.current;
      if (!m) return;
      const span = WORLD_HALF * 2;
      for (let i = 0; i < stripes.length; i++) {
        const s = stripes[i];
        const x = -WORLD_HALF + ((s.off * span + t * speed) % span);
        const sc = 0.6 + (s.k % 4) * 0.3;
        dummy.position.set(x, RIVER.waterY + 0.33, riverZ(x) + s.lane * (RIVER.width - 2));
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [stripes, dummy]
  );

  const rocks = useMemo(() => {
    const out: { position: [number, number, number]; scale: [number, number, number]; rotationY: number; color: string }[] = [];
    let s = 99;
    const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 260; i++) {
      const x = -WORLD_HALF + r() * WORLD_HALF * 2;
      const side = r() < 0.5 ? -1 : 1;
      const off = RIVER.width / 2 + (r() - 0.3) * 2.5;
      if (BRIDGES.some((b) => Math.abs(x - b.position[0]) < 4)) continue;
      if (side === -1 && Math.abs(x - (-7.5)) < 3.4) continue;
      const sc = 0.2 + r() * 0.7;
      out.push({ position: [x, RIVER.waterY + 0.1, riverZ(x) + side * off], scale: [sc * 1.3, sc * 0.7, sc], rotationY: r() * 6, color: r() < 0.5 ? '#8a8a85' : '#6f6f6a' });
    }
    return out;
  }, []);
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const rockMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1 }), []);

  return (
    <group>
      <mesh geometry={geo} material={waterMat} />
      <instancedMesh ref={stripeRef} args={[stripeGeo, stripeMat, stripes.length]} frustumCulled={false} />
      <Instances geometry={rockGeo} material={rockMat} instances={rocks} />
    </group>
  );
});
