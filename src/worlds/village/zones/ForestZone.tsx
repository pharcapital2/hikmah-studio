import { memo, useMemo } from 'react';
import * as THREE from 'three';
import { Instances, seededRandom, type InstanceData } from '../../shared';
import {
  BUILDING_SLOTS,
  HOUSE_SLOTS,
  RIVER,
  RICE,
  ZONES,
  distToRoads,
  heightAt,
  riverZ,
} from '../layout';

function isClearOfStructures(x: number, z: number): boolean {
  if (distToRoads(x, z) < 3.6) return false;
  if (Math.abs(z - riverZ(x)) < RIVER.width * 0.5 + 3.2) return false;
  // Bebaskan zona kincir air irigasi, saluran bambu, bak batu, & bedengan tepi sungai
  if (x >= -15.0 && x <= -4.0 && z >= 49.5 && z <= 67.0) return false;
  if (
    Math.abs(x - RICE.center[0]) < RICE.size[0] / 2 + 3 &&
    Math.abs(z - RICE.center[1]) < RICE.size[1] / 2 + 3
  )
    return false;
  if (
    Math.abs(x - ZONES.field.center[0]) < ZONES.field.size[0] / 2 + 2 &&
    Math.abs(z - ZONES.field.center[1]) < ZONES.field.size[1] / 2 + 2
  )
    return false;
  if (
    Math.abs(x - ZONES.garden.center[0]) < ZONES.garden.size[0] / 2 + 2 &&
    Math.abs(z - ZONES.garden.center[1]) < ZONES.garden.size[1] / 2 + 2
  )
    return false;
  if (Math.hypot(x - ZONES.center.center[0], z - ZONES.center.center[1]) < 24) return false;
  for (const b of BUILDING_SLOTS) {
    if (
      Math.abs(x - b.position[0]) < b.size[0] / 2 + 4 &&
      Math.abs(z - b.position[2]) < b.size[1] / 2 + 4
    )
      return false;
  }
  for (const h of HOUSE_SLOTS) {
    if (
      Math.abs(x - h.position[0]) < h.size[0] / 2 + 3.5 &&
      Math.abs(z - h.position[2]) < h.size[1] / 2 + 3.5
    )
      return false;
  }
  return true;
}

/** Hutan & vegetasi desa (pohon rimbun tropis, pinus gunung, kelapa, semak, rumpun rumput) dengan InstancedMesh. */
export const ForestZone = memo(function ForestZone() {
  const {
    broadTrunks,
    broadCanopies,
    pineTrunks,
    pineConesLow,
    pineConesTop,
    palmTrunks,
    palmCrowns,
    bushes,
    grassTufts,
  } = useMemo(() => {
    const r = seededRandom(55123);
    const broadTrunks: InstanceData[] = [];
    const broadCanopies: InstanceData[] = [];
    const pineTrunks: InstanceData[] = [];
    const pineConesLow: InstanceData[] = [];
    const pineConesTop: InstanceData[] = [];
    const palmTrunks: InstanceData[] = [];
    const palmCrowns: InstanceData[] = [];
    const bushes: InstanceData[] = [];
    const grassTufts: InstanceData[] = [];

    const greenShades = ['#3d7a36', '#4c8f3e', '#2f6b30', '#5b9e45', '#447d38'];
    const pineShades = ['#255233', '#2e613c', '#1f452b'];

    const addBroad = (x: number, z: number, sc: number) => {
      const y = heightAt(x, z);
      const th = 3.2 * sc;
      broadTrunks.push({ position: [x, y + th / 2, z], scale: [sc, sc, sc], rotationY: r() * 6.28 });
      broadCanopies.push({
        position: [x, y + th + 1.5 * sc, z],
        scale: [2.2 * sc, 1.9 * sc, 2.2 * sc],
        rotationY: r() * 6.28,
        color: greenShades[Math.floor(r() * greenShades.length)],
      });
      broadCanopies.push({
        position: [x + (r() - 0.5) * 1.4 * sc, y + th + 2.3 * sc, z + (r() - 0.5) * 1.4 * sc],
        scale: [1.5 * sc, 1.4 * sc, 1.5 * sc],
        rotationY: r() * 6.28,
        color: greenShades[Math.floor(r() * greenShades.length)],
      });
    };

    const addPine = (x: number, z: number, sc: number) => {
      const y = heightAt(x, z);
      const th = 2.6 * sc;
      pineTrunks.push({ position: [x, y + th / 2, z], scale: [sc, sc, sc] });
      const col = pineShades[Math.floor(r() * pineShades.length)];
      pineConesLow.push({ position: [x, y + th + 1.8 * sc, z], scale: [sc, sc, sc], color: col });
      pineConesTop.push({ position: [x, y + th + 3.8 * sc, z], scale: [sc * 0.78, sc * 0.85, sc * 0.78], color: col });
    };

    const addPalm = (x: number, z: number, sc: number) => {
      const y = heightAt(x, z);
      const th = 6.2 * sc;
      const rot = r() * Math.PI * 2;
      palmTrunks.push({ position: [x, y + th / 2, z], scale: [sc, sc, sc], rotationY: rot });
      palmCrowns.push({ position: [x, y + th + 0.2 * sc, z], scale: [sc, sc, sc], rotationY: rot });
    };

    // 1. Hutan barat lebat
    for (let i = 0; i < 160; i++) {
      const x = -195 + r() * 88;
      const z = -155 + r() * 320;
      if (!isClearOfStructures(x, z)) continue;
      addBroad(x, z, 0.9 + r() * 0.8);
    }

    // 2. Hutan & lereng utara (campuran pohon rimbun + pinus di ketinggian)
    for (let i = 0; i < 190; i++) {
      const x = -190 + r() * 380;
      const z = -195 + r() * 85;
      if (!isClearOfStructures(x, z)) continue;
      const y = heightAt(x, z);
      if (y > 8) addPine(x, z, 0.9 + r() * 0.9);
      else addBroad(x, z, 0.85 + r() * 0.75);
    }

    // 3. Pohon tersebar di tepi desa, selatan, dan bukit timur
    for (let i = 0; i < 160; i++) {
      const x = -180 + r() * 365;
      const z = -110 + r() * 295;
      if (!isClearOfStructures(x, z)) continue;
      if (r() < 0.22 && x > 40) addPalm(x, z, 0.85 + r() * 0.4);
      else addBroad(x, z, 0.75 + r() * 0.65);
    }

    // 4. Pohon kelapa khas di tepi sungai & pinggir sawah
    for (let i = 0; i < 42; i++) {
      const x = -150 + r() * 320;
      const side = r() < 0.5 ? -1 : 1;
      const z = riverZ(x) + side * (RIVER.width * 0.5 + 4 + r() * 7);
      if (!isClearOfStructures(x, z)) continue;
      addPalm(x, z, 0.85 + r() * 0.4);
    }

    // 5. Semak & perdu agar area padang rumput tidak datar kosong
    for (let i = 0; i < 280; i++) {
      const x = -190 + r() * 380;
      const z = -160 + r() * 340;
      if (!isClearOfStructures(x, z)) continue;
      const y = heightAt(x, z);
      const sc = 0.5 + r() * 0.9;
      bushes.push({
        position: [x, y + sc * 0.45, z],
        scale: [sc * 1.2, sc * 0.8, sc * 1.1],
        rotationY: r() * 6.28,
        color: greenShades[Math.floor(r() * greenShades.length)],
      });
    }

    // 6. Rumpun rumput & bunga liar instanced (jauh dari jalan, sungai, sawah, lapangan, kebun & bangunan)
    for (let i = 0; i < 550; i++) {
      const x = -185 + r() * 370;
      const z = -150 + r() * 330;
      if (distToRoads(x, z) < 0.8) continue;
      if (Math.abs(z - riverZ(x)) < RIVER.width * 0.5 + 0.8) continue;
      if (x >= -15.0 && x <= -4.0 && z >= 49.5 && z <= 67.0) continue;
      if (
        Math.abs(x - ZONES.field.center[0]) < ZONES.field.size[0] / 2 + 1.5 &&
        Math.abs(z - ZONES.field.center[1]) < ZONES.field.size[1] / 2 + 1.5
      )
        continue;
      if (
        Math.abs(x - ZONES.garden.center[0]) < ZONES.garden.size[0] / 2 + 1.0 &&
        Math.abs(z - ZONES.garden.center[1]) < ZONES.garden.size[1] / 2 + 1.0
      )
        continue;
      if (
        Math.abs(x - RICE.center[0]) < RICE.size[0] / 2 + 1.5 &&
        Math.abs(z - RICE.center[1]) < RICE.size[1] / 2 + 1.5
      )
        continue;
      if (
        BUILDING_SLOTS.some(
          (b) => Math.abs(x - b.position[0]) < b.size[0] / 2 + 1.5 && Math.abs(z - b.position[2]) < b.size[1] / 2 + 1.5
        )
      )
        continue;
      if (
        HOUSE_SLOTS.some(
          (h) => Math.abs(x - h.position[0]) < h.size[0] / 2 + 1.5 && Math.abs(z - h.position[2]) < h.size[1] / 2 + 1.5
        )
      )
        continue;
      const y = heightAt(x, z);
      if (y > 24) continue;
      const sc = 0.4 + r() * 0.65;
      grassTufts.push({
        position: [x, y + sc * 0.25, z],
        scale: [sc, sc, sc],
        rotationY: r() * 6.28,
        color: r() < 0.12 ? '#e8d05a' : r() < 0.55 ? '#6db349' : '#589c3b',
      });
    }

    return {
      broadTrunks,
      broadCanopies,
      pineTrunks,
      pineConesLow,
      pineConesTop,
      palmTrunks,
      palmCrowns,
      bushes,
      grassTufts,
    };
  }, []);

  const broadTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.28, 0.45, 3.2, 6), []);
  const broadCanopyGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const pineTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.2, 0.35, 2.6, 6), []);
  const pineConeGeo = useMemo(() => new THREE.ConeGeometry(1.9, 4.4, 7), []);
  const palmTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.16, 0.28, 6.2, 6), []);
  const palmCrownGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(2.6, 1.3, 6);
    g.rotateX(Math.PI);
    return g;
  }, []);
  const bushGeo = useMemo(() => new THREE.DodecahedronGeometry(0.8, 0), []);
  const grassGeo = useMemo(() => new THREE.ConeGeometry(0.35, 0.7, 4), []);

  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b472a', roughness: 0.95 }), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), []);
  const palmLeafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#478f3c', roughness: 0.85, flatShading: true }), []);

  return (
    <group>
      <Instances geometry={broadTrunkGeo} material={trunkMat} instances={broadTrunks} castShadow />
      <Instances geometry={broadCanopyGeo} material={leafMat} instances={broadCanopies} castShadow receiveShadow />
      <Instances geometry={pineTrunkGeo} material={trunkMat} instances={pineTrunks} castShadow />
      <Instances geometry={pineConeGeo} material={leafMat} instances={pineConesLow} castShadow />
      <Instances geometry={pineConeGeo} material={leafMat} instances={pineConesTop} castShadow />
      <Instances geometry={palmTrunkGeo} material={trunkMat} instances={palmTrunks} castShadow />
      <Instances geometry={palmCrownGeo} material={palmLeafMat} instances={palmCrowns} castShadow />
      <Instances geometry={bushGeo} material={leafMat} instances={bushes} receiveShadow />
      <Instances geometry={grassGeo} material={leafMat} instances={grassTufts} />
    </group>
  );
});
