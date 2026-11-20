import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { BUILDING_SLOTS, HOUSE_SLOTS, heightAt } from '../layout';
import { lightsOn } from '../../shared/palette';
import type { TimeOfDay, Weather } from '../../shared/types';
import { BalaiDesa, House, Kandang, Lumbung, Market, Mosque, Saung, School, Warung, Well } from './Houses';
import { Box, GableRoof, Lantern, UNIT_BOX, UNIT_CYL } from './parts';

const Musholla: React.FC<{ lit?: boolean }> = memo(({ lit }) => (
  <group>
    <Box p={[0, 0.2, 0]} s={[8, 0.4, 8]} c="#c8c4b8" />
    <Box p={[0, 1.7, 0]} s={[6.4, 2.6, 6.4]} c="#f2efe6" />
    <GableRoof y={3} w={6.4} d={6.4} h={1.6} c="#2f6a4a" />
    <Box p={[0, 1.2, 3.22]} s={[1.2, 2, 0.08]} c="#5a3a20" />
    <Lantern p={[1.1, 2.2, 3.35]} lit={lit} />
  </group>
));

interface BatchedItem {
  matrix: THREE.Matrix4;
  color: THREE.Color;
}

interface BuildingBatches {
  boxShadow: BatchedItem[];
  boxFlat: BatchedItem[];
  cyl: BatchedItem[];
}

const INSTANCED_STD_MAT = new THREE.MeshStandardMaterial({ roughness: 0.9 });

const StaticInstancedBatch: React.FC<{
  geometry: THREE.BufferGeometry;
  items: BatchedItem[];
  castShadow?: boolean;
}> = memo(({ geometry, items, castShadow = false }) => {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m || items.length === 0) return;
    for (let i = 0; i < items.length; i++) {
      m.setMatrixAt(i, items[i].matrix);
      m.setColorAt(i, items[i].color);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items]);

  if (items.length === 0) return null;
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, INSTANCED_STD_MAT, items.length]}
      castShadow={castShadow}
      receiveShadow
    />
  );
});

export interface VillageBuildingsProps {
  timeOfDay?: TimeOfDay;
  weather?: Weather;
}

export const VillageBuildings: React.FC<VillageBuildingsProps> = memo(({ timeOfDay = 'day', weather = 'clear' }) => {
  const lit = lightsOn(timeOfDay, weather);
  const slots = useMemo(() => BUILDING_SLOTS, []);
  const srcRef = useRef<THREE.Group>(null);
  const [batches, setBatches] = useState<BuildingBatches | null>(null);

  useLayoutEffect(() => {
    const root = srcRef.current;
    if (!root) return;
    root.updateMatrixWorld(true);
    const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const boxShadow: BatchedItem[] = [];
    const boxFlat: BatchedItem[] = [];
    const cyl: BatchedItem[] = [];

    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.userData?.skipBatch) return;
      if (obj.geometry !== UNIT_BOX && obj.geometry !== UNIT_CYL) return;
      const mat = obj.material;
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (mat.emissiveIntensity > 0) return;

      const localMatrix = new THREE.Matrix4().multiplyMatrices(invRoot, obj.matrixWorld);
      const color = mat.color.clone();
      if (obj.geometry === UNIT_BOX) {
        if (obj.castShadow) {
          boxShadow.push({ matrix: localMatrix, color });
        } else {
          boxFlat.push({ matrix: localMatrix, color });
        }
      } else {
        cyl.push({ matrix: localMatrix, color });
      }
      obj.visible = false;
    });

    setBatches({ boxShadow, boxFlat, cyl });
  }, []);

  const renderSlot = (k: string) => {
    switch (k) {
      case 'mosque': return <Mosque lit={lit} />;
      case 'hall': return <BalaiDesa lit={lit} />;
      case 'school': return <School lit={lit} />;
      case 'warung': return <Warung lit={lit} />;
      case 'market': return <Market seed={7} lit={lit} />;
      case 'barn': return <Lumbung />;
      case 'musholla': return <Musholla lit={lit} />;
      case 'well': return <Well />;
      case 'gazebo': return <Saung />;
      case 'cowshed': return <Kandang kind="sapi" />;
      case 'goatshed': return <Kandang kind="kambing" />;
      case 'coop': return <Kandang kind="ayam" />;
      case 'duckpen': return <Kandang kind="bebek" />;
      default: return null;
    }
  };

  return (
    <group name="village-buildings">
      <group ref={srcRef}>
        {slots.map((s) => (
          <group
            key={s.id}
            position={[s.position[0], heightAt(s.position[0], s.position[2]), s.position[2]]}
            rotation={[0, s.rotationY, 0]}
          >
            {renderSlot(s.kind)}
          </group>
        ))}
        {HOUSE_SLOTS.map((h, i) => (
          <group
            key={h.id}
            position={[h.position[0], heightAt(h.position[0], h.position[2]), h.position[2]]}
            rotation={[0, h.rotationY, 0]}
          >
            <House kind={h.style} seed={i + 1} lit={lit} />
          </group>
        ))}
      </group>

      {batches && (
        <>
          <StaticInstancedBatch geometry={UNIT_BOX} items={batches.boxShadow} castShadow />
          <StaticInstancedBatch geometry={UNIT_BOX} items={batches.boxFlat} />
          <StaticInstancedBatch geometry={UNIT_CYL} items={batches.cyl} />
        </>
      )}
    </group>
  );
});

export default VillageBuildings;
