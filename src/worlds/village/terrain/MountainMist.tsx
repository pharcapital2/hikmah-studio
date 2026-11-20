import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Weather } from '../../shared';
import { Instances, seededRandom, useWorldAnimation } from '../../shared';
import { heightAt } from '../layout';

/** Gunung berbatu utara + kabut lereng bergerak deterministik mengikuti `time` (atau R3F clock). */
export const MountainMist = memo(function MountainMist({ time, weather }: { time?: number; weather: Weather }) {
  // Batu-batu besar di lereng gunung utara
  const cliffs = useMemo(() => {
    const r = seededRandom(8811);
    const out: { position: [number, number, number]; scale: [number, number, number]; rotationY: number; color: string }[] = [];
    for (let i = 0; i < 65; i++) {
      const x = -195 + r() * 390;
      const z = -155 - r() * 75;
      const y = heightAt(x, z);
      const s = 3 + r() * 8;
      out.push({
        position: [x, y + s * 0.25, z],
        scale: [s * (0.9 + r() * 0.7), s * (0.7 + r() * 0.8), s * (0.8 + r() * 0.6)],
        rotationY: r() * Math.PI * 2,
        color: r() < 0.5 ? '#757570' : '#5e5f5b',
      });
    }
    return out;
  }, []);

  const cliffGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const cliffMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), []);

  // Pita kabut gunung yang melayang pelan sepanjang lereng
  const mistBands = useMemo(() => {
    const r = seededRandom(9922);
    return Array.from({ length: 14 }, (_, i) => ({
      x0: -180 + i * 28 + (r() - 0.5) * 14,
      y: 22 + r() * 24,
      z: -165 - r() * 55,
      rx: 26 + r() * 22,
      ry: 4 + r() * 4,
      rz: 12 + r() * 10,
      speed: 1.2 + r() * 1.4,
      phase: r() * Math.PI * 2,
    }));
  }, []);

  const mistOpacity = weather === 'fog' ? 0.42 : weather === 'rain' ? 0.32 : 0.22;
  const mistGeo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const mistMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#e8f1f8', transparent: true, opacity: 0.22, depthWrite: false }),
    []
  );

  useLayoutEffect(() => {
    mistMat.opacity = mistOpacity;
  }, [mistMat, mistOpacity]);

  const mistRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useWorldAnimation(
    time,
    (t) => {
      const inst = mistRef.current;
      if (!inst) return;
      const span = 420;
      for (let i = 0; i < mistBands.length; i++) {
        const b = mistBands[i];
        const x = ((b.x0 + t * b.speed + span / 2) % span) - span / 2;
        const y = b.y + Math.sin(t * 0.35 + b.phase) * 1.6;
        dummy.position.set(x, y, b.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(b.rx, b.ry, b.rz);
        dummy.updateMatrix();
        inst.setMatrixAt(i, dummy.matrix);
      }
      inst.instanceMatrix.needsUpdate = true;
    },
    [mistBands, dummy]
  );

  return (
    <group>
      <Instances geometry={cliffGeo} material={cliffMat} instances={cliffs} castShadow receiveShadow />
      <instancedMesh ref={mistRef} args={[mistGeo, mistMat, mistBands.length]} frustumCulled={false} />
    </group>
  );
});
