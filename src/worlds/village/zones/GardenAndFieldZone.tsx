import { memo, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ZONES, heightAt } from '../layout';
import { Instances, seededRandom, useWorldAnimation, type InstanceData } from '../../shared';

/** Kebun sayur & pisang, Lapangan bola desa (+ bendera berkibar), serta area Pemakaman desa. */
export const GardenAndFieldZone = memo(function GardenAndFieldZone({ time }: { time?: number }) {
  // ---- 1. Kebun Desa (bedengan sayur, jagung, pohon pisang) ----
  const [gx, gz] = ZONES.garden.center;
  const [gw, gd] = ZONES.garden.size;

  const { beds, crops, bananaTrunks, bananaLeaves } = useMemo(() => {
    const r = seededRandom(3030);
    const beds: InstanceData[] = [];
    const crops: InstanceData[] = [];
    const bananaTrunks: InstanceData[] = [];
    const bananaLeaves: InstanceData[] = [];

    // 7 baris bedengan tanah memanjang di X
    for (let row = 0; row < 7; row++) {
      const bz = gz - gd / 2 + 4 + row * 3.2;
      const by = heightAt(gx, bz);
      beds.push({ position: [gx - 2, by + 0.14, bz], scale: [gw - 10, 0.28, 1.4] });
      // Tanaman sayur / jagung di atas bedengan
      const isCorn = row % 2 === 0;
      for (let x = gx - gw / 2 + 4; x < gx + gw / 2 - 7; x += 1.3) {
        const y = heightAt(x, bz) + 0.28;
        const sc = 0.7 + r() * 0.5;
        crops.push({
          position: [x + (r() - 0.5) * 0.25, y + (isCorn ? 0.45 * sc : 0.22 * sc), bz + (r() - 0.5) * 0.35],
          scale: isCorn ? [0.22, 0.9 * sc, 0.22] : [0.35 * sc, 0.4 * sc, 0.35 * sc],
          rotationY: r() * 6.28,
          color: isCorn ? '#76b83f' : '#4a9e45',
        });
      }
    }

    // Rumpun pohon pisang di sisi timur kebun
    for (let i = 0; i < 9; i++) {
      const px = gx + gw / 2 - 4 + (r() - 0.5) * 4;
      const pz = gz - gd / 2 + 3 + i * 3 + (r() - 0.5) * 1.5;
      const py = heightAt(px, pz);
      const h = 2.4 + r() * 0.8;
      bananaTrunks.push({ position: [px, py + h / 2, pz], scale: [1, h / 2.6, 1] });
      for (let l = 0; l < 4; l++) {
        bananaLeaves.push({
          position: [px, py + h, pz],
          rotationY: (l / 4) * Math.PI * 2 + r() * 0.5,
          scale: [1, 1, 1],
        });
      }
    }

    return { beds, crops, bananaTrunks, bananaLeaves };
  }, [gx, gz, gw, gd]);

  const bedGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const bedMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#694d32', roughness: 1 }), []);
  const cropGeo = useMemo(() => new THREE.DodecahedronGeometry(0.5, 0), []);
  const cropMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9 }), []);
  const banTrunkGeo = useMemo(() => new THREE.CylinderGeometry(0.14, 0.22, 2.6, 6), []);
  const banTrunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#6b873c', roughness: 0.9 }), []);

  // ---- 1b. Pohon Tua Pahlawan (hero Konten 4) + daun berguguran ----
  // Berdiri di tepi kebun dekat jalan menuju sawah (x=-38, z=-46.5), di
  // samping slot dialog 'kebun-talk' — dahannya menaungi jalan, akarnya
  // mencengkeram tanah. Daun berserakan di sekitar pangkal batang (n2).
  const treeY = heightAt(-38, -46.5);
  const fallenLeaves = useMemo(() => {
    const r = seededRandom(4040);
    const leaves: InstanceData[] = [];
    const cols = ['#d9a441', '#8a5a2b', '#5a8a3c', '#c98f2e'];
    for (let i = 0; i < 48; i++) {
      const a = r() * Math.PI * 2;
      const d = 1.5 + r() * 6.5;
      const lx = -41 + Math.cos(a) * d;
      const lz = -46.5 + Math.sin(a) * d;
      leaves.push({
        position: [lx, heightAt(lx, lz) + 0.06, lz],
        rotationY: r() * 6.28,
        scale: [0.8 + r() * 0.6, 1, 0.8 + r() * 0.6],
        color: cols[Math.floor(r() * cols.length)],
      });
    }
    return leaves;
  }, []);
  const leafGeo = useMemo(() => new THREE.BoxGeometry(0.22, 0.03, 0.16), []);
  const leafMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1 }), []);
  const banLeafGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1.5, 0.06, 0.45);
    g.translate(0.75, 0.1, 0);
    return g;
  }, []);
  const banLeafMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#58a83e', roughness: 0.85 }), []);

  // ---- 2. Lapangan Desa ----
  const [fx, fz] = ZONES.field.center;
  const fy = heightAt(fx, fz);

  // ---- 3. Pemakaman Desa (nisan digambar VillageProps; di sini pohon kamboja peneduh) ----
  const [cx, cz] = ZONES.cemetery.center;

  const flagRef = useRef<THREE.Group>(null);
  useWorldAnimation(time, (t) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 4.5) * 0.12;
    }
  });

  return (
    <group>
      {/* Kebun */}
      <Instances geometry={bedGeo} material={bedMat} instances={beds} receiveShadow />
      <Instances geometry={cropGeo} material={cropMat} instances={crops} castShadow />
      <Instances geometry={banTrunkGeo} material={banTrunkMat} instances={bananaTrunks} castShadow />
      <Instances geometry={banLeafGeo} material={banLeafMat} instances={bananaLeaves} castShadow />

      {/* Pohon Tua Pahlawan — hero Konten 4, di tepi kebun dekat jalan */}
      <group position={[-38, treeY, -46.5]}>
        {/* Batang tua yang miring sedikit */}
        <mesh position={[0, 3.5, 0]} rotation={[0, 0, 0.04]} castShadow>
          <cylinderGeometry args={[0.55, 0.95, 7, 7]} />
          <meshStandardMaterial color="#6b4a2f" roughness={1} />
        </mesh>
        {/* Akar mencengkeram tanah — 6 akar menjalar dari pangkal batang */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} rotation={[0, (i / 6) * Math.PI * 2 + 0.3, 0]}>
            <mesh position={[1.0, 0.45, 0]} rotation={[0, 0, -1.87]} castShadow>
              <cylinderGeometry args={[0.16, 0.34, 2.4, 5]} />
              <meshStandardMaterial color="#6b4a2f" roughness={1} />
            </mesh>
          </group>
        ))}
        {/* Dahan rendah menjulur ke arah jalan (timur) */}
        <mesh position={[2.2, 5.8, 0.6]} rotation={[0, 0, -1.1]} castShadow>
          <cylinderGeometry args={[0.14, 0.22, 3.2, 5]} />
          <meshStandardMaterial color="#6b4a2f" roughness={1} />
        </mesh>
        {/* Tajuk lebar — dahannya menutupi jalan */}
        <mesh position={[0, 8.6, 0]} castShadow>
          <dodecahedronGeometry args={[4.2, 0]} />
          <meshStandardMaterial color="#2f6b33" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[-2.6, 7.6, 0.8]} castShadow>
          <dodecahedronGeometry args={[3.0, 0]} />
          <meshStandardMaterial color="#3a7d44" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[2.4, 7.9, -0.9]} castShadow>
          <dodecahedronGeometry args={[3.2, 0]} />
          <meshStandardMaterial color="#357a3d" flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0.6, 10.2, 0.3]} castShadow>
          <dodecahedronGeometry args={[2.6, 0]} />
          <meshStandardMaterial color="#2f6b33" flatShading roughness={0.9} />
        </mesh>
      </group>
      {/* Daun berguguran di sekitar pangkal pohon */}
      <Instances geometry={leafGeo} material={leafMat} instances={fallenLeaves} receiveShadow />

      {/* Lapangan Desa */}
      <group position={[fx, fy, fz]}>
        {/* Batas tanah/kapur sekeliling lapangan */}
        <mesh position={[0, 0.04, 0]} receiveShadow>
          <boxGeometry args={[43.4, 0.08, 27.4]} />
          <meshStandardMaterial color="#8f7553" roughness={1} />
        </mesh>
        {/* Rumput lapangan padat rata di atas terrain */}
        <mesh position={[0, 0.07, 0]} receiveShadow>
          <boxGeometry args={[42, 0.14, 26]} />
          <meshStandardMaterial color="#5ea342" roughness={0.95} />
        </mesh>
        {/* Garis batas lapangan (40m x 24m) & garis tengah di y=0.146 tanpa z-fighting */}
        {[-12, 12].map((zPos) => (
          <mesh key={`long-${zPos}`} position={[0, 0.146, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[40.22, 0.22]} />
            <meshBasicMaterial color="#f5f5f0" />
          </mesh>
        ))}
        {[-20, 20].map((xPos) => (
          <mesh key={`end-${xPos}`} position={[xPos, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.22, 23.78]} />
            <meshBasicMaterial color="#f5f5f0" />
          </mesh>
        ))}
        <mesh position={[0, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.22, 23.78]} />
          <meshBasicMaterial color="#f5f5f0" />
        </mesh>
        {/* Garis kotak penalti di x=±15.5 */}
        {[-1, 1].map((side) => (
          <group key={`pen-${side}`}>
            <mesh position={[side * 15.5, 0.146, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.22, 11.22]} />
              <meshBasicMaterial color="#f5f5f0" />
            </mesh>
            {[-5.5, 5.5].map((zSide) => (
              <mesh key={`pen-side-${side}-${zSide}`} position={[side * 17.75, 0.146, zSide]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[4.28, 0.22]} />
                <meshBasicMaterial color="#f5f5f0" />
              </mesh>
            ))}
          </group>
        ))}
        {/* Lingkaran tengah di y=0.152 */}
        <mesh position={[0, 0.152, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.4, 3.65, 28]} />
          <meshBasicMaterial color="#f5f5f0" />
        </mesh>
        {/* Dua gawang sepak bola */}
        {[-19.5, 19.5].map((gxPos, i) => (
          <group key={i} position={[gxPos, 0.14, 0]}>
            <mesh position={[0, 1.1, -2.5]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
              <meshStandardMaterial color="#f0f0eb" />
            </mesh>
            <mesh position={[0, 1.1, 2.5]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 2.2, 6]} />
              <meshStandardMaterial color="#f0f0eb" />
            </mesh>
            <mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 5.1, 6]} />
              <meshStandardMaterial color="#f0f0eb" />
            </mesh>
          </group>
        ))}
        {/* Tiang bendera Merah Putih di tepi lapangan */}
        <group position={[-18, 0.14, -14]}>
          <mesh position={[0, -0.04, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.26, 0.34, 0.24, 8]} />
            <meshStandardMaterial color="#9ca3af" roughness={0.9} />
          </mesh>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 7, 6]} />
            <meshStandardMaterial color="#d8dde2" metalness={0.3} />
          </mesh>
          <group ref={flagRef} position={[0.9, 6.4, 0]}>
            <mesh position={[0, 0.25, 0]}>
              <boxGeometry args={[1.7, 0.5, 0.04]} />
              <meshStandardMaterial color="#d92b2b" />
            </mesh>
            <mesh position={[0, -0.25, 0]}>
              <boxGeometry args={[1.7, 0.5, 0.04]} />
              <meshStandardMaterial color="#f7f7f5" />
            </mesh>
          </group>
        </group>
      </group>

      {/* Pohon kamboja pemakaman */}
      {[
        [cx - 10, cz - 7],
        [cx + 9, cz + 7],
      ].map(([kx, kz], i) => {
        const ky = heightAt(kx, kz);
        return (
          <group key={i} position={[kx, ky, kz]}>
            <mesh position={[0, 1.4, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.28, 2.8, 6]} />
              <meshStandardMaterial color="#78634d" />
            </mesh>
            <mesh position={[0, 3.0, 0]} castShadow>
              <dodecahedronGeometry args={[1.5, 0]} />
              <meshStandardMaterial color="#4e8042" flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});
