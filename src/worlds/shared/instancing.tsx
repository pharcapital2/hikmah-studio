import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

export interface InstanceData {
  position: [number, number, number];
  rotationY?: number;
  scale?: number | [number, number, number];
  color?: string;
}

interface Props {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  instances: InstanceData[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  frustumCulled?: boolean;
}

/** Static InstancedMesh helper for repeated objects (trees, rice, lamps, cars). */
export const Instances = memo(function Instances({
  geometry,
  material,
  instances,
  castShadow,
  receiveShadow,
  frustumCulled = true,
}: Props) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    instances.forEach((d, i) => {
      dummy.position.set(...d.position);
      dummy.rotation.set(0, d.rotationY ?? 0, 0);
      const s = d.scale ?? 1;
      Array.isArray(s) ? dummy.scale.set(...s) : dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      if (d.color) m.setColorAt(i, c.set(d.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [instances, geometry, dummy]);
  return (
    <instancedMesh
      key={instances.length}
      ref={ref}
      args={[geometry, material, instances.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      frustumCulled={frustumCulled}
    />
  );
});
