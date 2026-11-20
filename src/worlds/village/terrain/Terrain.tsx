import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { WORLD_SIZE, heightAt, distToRoads, riverZ, RIVER, ZONES, RICE } from '../layout';

const SEG = 128;

/** Terrain berkontur dengan warna vertex: rumput, tanah jalan, lumpur sungai, batu gunung, salju tipis. */
export const Terrain = memo(function Terrain() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(WORLD_SIZE + 120, WORLD_SIZE + 120, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const grassA = new THREE.Color('#6aa84f'), grassB = new THREE.Color('#8bbf5a'), dirt = new THREE.Color('#8b6b45');
    const mud = new THREE.Color('#5d4a33'), rock = new THREE.Color('#7b7a75'), snow = new THREE.Color('#e8eef2');
    const forest = new THREE.Color('#3f7a3a'), paddy = new THREE.Color('#5a8a3a');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const n = (Math.sin(x * 0.31) * Math.cos(z * 0.27) + Math.sin(x * 0.07 + z * 0.05)) * 0.5;
      c.copy(grassA).lerp(grassB, 0.5 + n * 0.5);
      if (x < -100) c.lerp(forest, Math.min(1, (-100 - x) / 40));
      if (Math.abs(x - RICE.center[0]) < RICE.size[0] / 2 && Math.abs(z - RICE.center[1]) < RICE.size[1] / 2) c.lerp(paddy, 0.6);
      const dr = distToRoads(x, z);
      if (dr < 1.2) c.lerp(dirt, Math.max(0, Math.min(1, 1 - dr / 1.2 + 0.3)));
      const dz = Math.abs(z - riverZ(x));
      if (dz < RIVER.width / 2 + 3) c.lerp(mud, Math.min(1, 1 - (dz - RIVER.width / 2) / 3));
      if (h > 22) c.lerp(rock, Math.min(1, (h - 22) / 20));
      if (h > 85) c.lerp(snow, Math.min(1, (h - 85) / 25));
      // jalan rumput di pusat
      if (Math.hypot(x - ZONES.center.center[0], z - ZONES.center.center[1]) < 22 && dr > 2) c.lerp(dirt, 0.25);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  const mat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: false }), []);

  return <mesh geometry={geo} material={mat} receiveShadow />;
});
