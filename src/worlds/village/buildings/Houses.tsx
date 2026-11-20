import React, { memo, useMemo } from 'react';
import { seededRandom } from '../../shared/seededRandom';
import { Box, Cyl, Door, GableRoof, Lantern, Window } from './parts';

export type HouseKind = 'bamboo' | 'wood' | 'brick';
export interface HouseProps { kind?: HouseKind; seed?: number; lit?: boolean }

const WALL: Record<HouseKind, string[]> = {
  bamboo: ['#c9a96a', '#b8955a', '#d2b57a'],
  wood: ['#8a5a36', '#7a4e30', '#9a6a40'],
  brick: ['#b5533c', '#a64a35', '#c0654a', '#d9cbb3'],
};
const ROOF: Record<HouseKind, string[]> = {
  bamboo: ['#6b5a2a', '#7a6a35'],
  wood: ['#8a3a2a', '#6a3a2a', '#7a4a30'],
  brick: ['#9a3a2a', '#a04030', '#555a60'],
};

export const House: React.FC<HouseProps> = memo(({ kind = 'wood', seed = 1, lit = false }) => {
  const { w, d, h, roofH, wall, roof, stilt } = useMemo(() => {
    const r = seededRandom(seed * 977 + 13);
    return {
      w: 6 + r() * 3,
      d: 5 + r() * 2.5,
      h: 2.8 + r() * 0.4,
      wall: WALL[kind][Math.floor(r() * WALL[kind].length)],
      roof: ROOF[kind][Math.floor(r() * ROOF[kind].length)],
      roofH: 1.6 + r() * 0.5,
      stilt: kind === 'bamboo' ? 0.9 : kind === 'wood' ? 0.4 : 0,
    };
  }, [kind, seed]);

  return (
    <group>
      {stilt > 0 &&
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
          <Cyl key={i} p={[(sx * (w - 0.4)) / 2, stilt / 2, (sz * (d - 0.4)) / 2]} r={0.12} h={stilt} c="#6a4a28" seg={6} />
        ))}
      <Box p={[0, stilt + h / 2, 0]} s={[w, h, d]} c={wall} />
      <Box p={[0, stilt + 0.05, 0]} s={[w + 0.2, 0.1, d + 0.2]} c={kind === 'brick' ? '#8a8a85' : '#5a3a20'} />
      <GableRoof y={stilt + h} w={w} d={d} h={roofH} c={roof} />
      <Door p={[-w / 4, stilt + 1.05, d / 2 + 0.02]} />
      <Window p={[w / 5, stilt + 1.6, d / 2 + 0.03]} lit={lit} />
      <Window p={[w / 2.6, stilt + 1.6, d / 2 + 0.03]} lit={lit} />
      <Window p={[w / 2 + 0.03, stilt + 1.6, 0]} lit={lit} ry={Math.PI / 2} />
      <Window p={[-w / 2 - 0.03, stilt + 1.6, 0]} lit={lit} ry={-Math.PI / 2} />
      {stilt > 0 && <Box p={[-w / 4, stilt / 2, d / 2 + 0.7]} s={[1.2, 0.1, 1.2 + stilt]} c="#7a5a30" r={[0.5, 0, 0]} />}
      {kind === 'brick' && <Box p={[w / 3, stilt + h + 1.6, -d / 4]} s={[0.5, 1.4, 0.5]} c="#8a4a38" />}
      {/* teras + bangku teras + lentera */}
      <Box p={[0, stilt + 0.02, d / 2 + 0.9]} s={[w * 0.65, 0.06, 1.6]} c="#9a9a92" />
      <Box p={[w * 0.16, stilt + 0.35, d / 2 + 0.7]} s={[1.3, 0.08, 0.45]} c="#7a5230" />
      <Cyl p={[-w * 0.28, stilt + 1.4, d / 2 + 1.6]} r={0.08} h={2.8} c="#5a3a20" seg={6} />
      <Cyl p={[w * 0.28, stilt + 1.4, d / 2 + 1.6]} r={0.08} h={2.8} c="#5a3a20" seg={6} />
      <Lantern p={[-w / 4 + 0.85, stilt + 2.15, d / 2 + 0.2]} lit={lit} />
    </group>
  );
});

export const Mosque: React.FC<{ lit?: boolean }> = memo(({ lit }) => (
  <group>
    <Box p={[0, 0.3, 0]} s={[16, 0.6, 16]} c="#d8d4c8" />
    <Box p={[0, 3.6, 0]} s={[14, 6, 14]} c="#f2efe6" />
    <Box p={[0, 6.7, 0]} s={[14.6, 0.4, 14.6]} c="#2f6a4a" />
    {/* serambi depan */}
    <Box p={[0, 3.4, 7.6]} s={[10, 0.25, 2.2]} c="#2f6a4a" />
    {[-4.2, -1.4, 1.4, 4.2].map((x) => (
      <Cyl key={x} p={[x, 1.9, 8.4]} r={0.18} h={3.2} c="#f2efe6" />
    ))}
    {/* bedug serambi */}
    <mesh position={[3.2, 1.2, 7.8]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.38, 0.38, 1.1, 12]} />
      <meshStandardMaterial color="#6a3a1e" roughness={0.85} />
    </mesh>
    {/* kubah */}
    <mesh position={[0, 7, 0]} castShadow>
      <sphereGeometry args={[4.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#2f8a5a" roughness={0.5} metalness={0.2} />
    </mesh>
    <Cyl p={[0, 12, 0]} r={0.08} h={2} c="#e8c040" seg={6} />
    <mesh position={[0, 13.1, 0]}>
      <sphereGeometry args={[0.3, 8, 8]} />
      <meshStandardMaterial color="#e8c040" metalness={0.6} roughness={0.3} />
    </mesh>
    {/* menara */}
    <Box p={[9.5, 6, 6]} s={[2, 12, 2]} c="#f2efe6" />
    <Box p={[9.5, 12.3, 6]} s={[2.6, 0.5, 2.6]} c="#2f6a4a" />
    <mesh position={[9.5, 14, 6]} castShadow>
      <coneGeometry args={[1.3, 3, 8]} />
      <meshStandardMaterial color="#2f8a5a" />
    </mesh>
    {[-4.5, 0, 4.5].map((x) => (
      <mesh key={x} position={[x, 3, 7.02]}>
        <boxGeometry args={[1.6, 3, 0.1]} />
        <meshStandardMaterial
          color={lit ? '#ffd27a' : '#3a6a7a'}
          emissive={lit ? '#ffb040' : '#000000'}
          emissiveIntensity={lit ? 1.4 : 0}
        />
      </mesh>
    ))}
  </group>
));

export const BalaiDesa: React.FC<{ lit?: boolean }> = memo(({ lit }) => (
  <group>
    <Box p={[0, 0.25, 0]} s={[14, 0.5, 9]} c="#a8a49a" />
    <Box p={[0, 2, 0]} s={[12, 3.5, 7]} c="#e6d9b8" />
    <GableRoof y={3.75} w={12} d={7} h={2.4} c="#8a3a2a" />
    {[-4, -1.3, 1.3, 4].map((x) => (
      <Cyl key={x} p={[x, 1.8, 4.4]} r={0.16} h={3.6} c="#f0ece0" />
    ))}
    <Box p={[0, 3.7, 4.4]} s={[10, 0.25, 1.8]} c="#7a3022" />
    <Box p={[0, 1.2, 3.52]} s={[1.6, 2.2, 0.1]} c="#5a3a20" />
    <Box p={[0, 3.1, 3.56]} s={[3.5, 0.6, 0.06]} c="#2a5a3a" />
    {[-4, 4].map((x) => (
      <Window key={x} p={[x, 2.1, 3.55]} lit={lit} />
    ))}
  </group>
));

export const Warung: React.FC<{ lit?: boolean }> = memo(({ lit }) => (
  <group>
    <Box p={[0, 1.3, 0]} s={[5, 2.6, 3.5]} c="#c79a5a" />
    <GableRoof y={2.6} w={5} d={3.5} h={1} c="#6a4a2a" />
    <Box p={[0, 1, 1.9]} s={[4, 0.12, 1]} c="#8a5a30" />
    <Box p={[0, 0.5, 2.1]} s={[4, 1, 0.5]} c="#7a4a28" />
    {['#d04a3a', '#f0c040', '#4a8ad0', '#6ab04a', '#d08a3a'].map((c, i) => (
      <Box key={i} p={[-1.6 + i * 0.8, 1.35, 2.0]} s={[0.35, 0.45, 0.25]} c={c} />
    ))}
    <Box p={[0, 2.7, 2.5]} s={[4.4, 0.08, 1.5]} c="#c0392b" r={[0.35, 0, 0]} />
    <Box p={[0, 2.35, 2.9]} s={[2.4, 0.5, 0.05]} c="#f2e8c8" />
    {/* bangku panjang pembeli */}
    <Box p={[0, 0.42, 2.75]} s={[3.2, 0.08, 0.45]} c="#6a4a2a" />
    <Box p={[-1.2, 0.2, 2.75]} s={[0.12, 0.4, 0.4]} c="#4a321a" />
    <Box p={[1.2, 0.2, 2.75]} s={[0.12, 0.4, 0.4]} c="#4a321a" />
    <Lantern p={[1.9, 2.25, 2.2]} lit={lit} />
  </group>
));

export const Market: React.FC<{ seed?: number; lit?: boolean }> = memo(({ seed = 3, lit = false }) => {
  const stalls = useMemo(() => {
    const r = seededRandom(seed);
    const tarp = ['#d04a3a', '#3a7ad0', '#e0b030', '#4a9a4a', '#a04ab0', '#e07a30'];
    const goods = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8ab17d', '#d62828'];
    return Array.from({ length: 10 }, (_, i) => ({
      x: -10 + (i % 5) * 5,
      z: i < 5 ? -3.2 : 3.2,
      ry: i < 5 ? 0 : Math.PI,
      tarpColor: tarp[Math.floor(r() * tarp.length)],
      itemColors: Array.from({ length: 6 }, () => goods[Math.floor(r() * goods.length)]),
      hasLantern: i % 2 === 0,
    }));
  }, [seed]);

  return (
    <group>
      <Box p={[0, 0.02, 0]} s={[24, 0.04, 14]} c="#9a8a6a" />
      {stalls.map((st, i) => (
        <group key={i} position={[st.x, 0, st.z]} rotation={[0, st.ry, 0]}>
          {[[-1.5, -1], [1.5, -1], [-1.5, 1], [1.5, 1]].map(([px, pz], k) => (
            <Cyl key={k} p={[px, 1.2, pz]} r={0.05} h={2.4} c="#6a4a28" seg={6} />
          ))}
          <Box p={[0, 2.5, 0]} s={[3.6, 0.08, 2.6]} c={st.tarpColor} r={[0.15, 0, 0]} />
          <Box p={[0, 0.8, 0.5]} s={[3, 0.8, 1]} c="#8a6a40" />
          {st.itemColors.map((gc, k) => (
            <Box key={k} p={[-1.2 + k * 0.48, 1.3, 0.5]} s={[0.4, 0.3, 0.6]} c={gc} />
          ))}
          {st.hasLantern && <Lantern p={[0, 2.1, 1.1]} lit={lit} />}
        </group>
      ))}
    </group>
  );
});

export const School: React.FC<{ lit?: boolean }> = memo(({ lit }) => (
  <group>
    <Box p={[0, 0.2, 0]} s={[22, 0.4, 9]} c="#b8b4a8" />
    <Box p={[0, 2, 0]} s={[20, 3.6, 7]} c="#f0e6c8" />
    <Box p={[0, 3.9, 0]} s={[20.4, 0.3, 7.4]} c="#c0392b" />
    <GableRoof y={4.05} w={20} d={7.4} h={2.2} c="#b04030" />
    {[-7.5, -4.5, -1.5, 4.5, 7.5].map((x) => (
      <Window key={x} p={[x, 2.2, 3.55]} lit={lit} />
    ))}
    <Door p={[1.5, 1.15, 3.55]} />
    <Box p={[0, 5.9, 3.3]} s={[5, 1.2, 0.1]} c="#2a5a8a" />
    <Lantern p={[1.5, 2.45, 3.7]} lit={lit} />
  </group>
));

export const Lumbung: React.FC = memo(() => (
  <group>
    {[[-1.2, -1], [1.2, -1], [-1.2, 1], [1.2, 1]].map(([x, z], i) => (
      <Cyl key={i} p={[x, 0.5, z]} r={0.18} h={1} c="#6a4a28" seg={8} />
    ))}
    <Box p={[0, 2, 0]} s={[3.2, 2.2, 2.8]} c="#a07a48" />
    <GableRoof y={3.1} w={3.2} d={2.8} h={1.4} c="#6a5a2a" />
    <Box p={[0, 1.8, 1.42]} s={[1, 1.4, 0.06]} c="#4a3220" />
  </group>
));

export const Well: React.FC = memo(() => (
  <group>
    <mesh position={[0, 0.45, 0]} castShadow>
      <cylinderGeometry args={[0.8, 0.9, 0.9, 16]} />
      <meshStandardMaterial color="#8a8a85" roughness={1} />
    </mesh>
    <mesh position={[0, 0.91, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.62, 16]} />
      <meshStandardMaterial color="#1a3448" roughness={0.2} />
    </mesh>
    <Cyl p={[-0.8, 1.6, 0]} r={0.06} h={1.8} c="#5a3a20" seg={6} />
    <Cyl p={[0.8, 1.6, 0]} r={0.06} h={1.8} c="#5a3a20" seg={6} />
    {/* palang katrol + tali + ember */}
    <mesh position={[0, 2.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 1.7, 8]} />
      <meshStandardMaterial color="#5a3a20" />
    </mesh>
    <Cyl p={[0.1, 1.65, 0]} r={0.02} h={0.95} c="#c4a468" seg={5} castShadow={false} />
    <Cyl p={[0.1, 1.15, 0]} r={0.16} h={0.28} c="#7a5a30" seg={10} />
    <GableRoof y={2.45} w={1.9} d={1.4} h={0.55} c="#6a5a2a" />
  </group>
));

export const Saung: React.FC = memo(() => (
  <group>
    {[[-1.4, -1], [1.4, -1], [-1.4, 1], [1.4, 1]].map(([x, z], i) => (
      <Cyl key={i} p={[x, 1.1, z]} r={0.08} h={2.2} c="#8a6a30" seg={6} />
    ))}
    <Box p={[0, 0.6, 0]} s={[3.2, 0.1, 2.4]} c="#b8955a" />
    <Box p={[0, 0.3, 0]} s={[3.0, 0.6, 2.2]} c="#7a5a30" />
    <GableRoof y={2.2} w={3.2} d={2.6} h={1.1} c="#7a6a30" />
  </group>
));

export const Kandang: React.FC<{ kind: 'sapi' | 'kambing' | 'ayam' | 'bebek' }> = memo(({ kind }) => {
  const dims = { sapi: [9, 4], kambing: [6, 3.5], ayam: [3, 2.2], bebek: [3.5, 2.5] }[kind];
  const [w, d] = dims;
  const h = kind === 'ayam' ? 1.6 : kind === 'bebek' ? 1.2 : 2.6;
  const raised = kind === 'ayam' || kind === 'kambing' ? 0.6 : 0;
  return (
    <group>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
        <Cyl key={i} p={[(sx * w) / 2, (h + raised) / 2, (sz * d) / 2]} r={0.08} h={h + raised} c="#6a4a28" seg={6} />
      ))}
      <Box p={[0, raised + 0.05, 0]} s={[w, 0.1, d]} c="#8a6a3a" />
      <GableRoof y={h + raised} w={w} d={d + 0.4} h={0.9} c={kind === 'bebek' ? '#7a6a30' : '#6a4a2a'} />
      <Box p={[0, raised + h / 2, -d / 2]} s={[w, h, 0.08]} c="#9a7a48" />
      {/* pagar slat depan */}
      {[0.4, 0.9].map((y) => <Box key={y} p={[0, raised + y, d / 2]} s={[w, 0.08, 0.06]} c="#7a5a30" />)}
      {/* jerami */}
      <Box p={[-w / 4, raised + 0.2, -d / 4]} s={[w / 3, 0.3, d / 3]} c="#d8b84a" />
      {/* palung pakan & minum */}
      {(kind === 'sapi' || kind === 'kambing') && (
        <group position={[w / 4, raised + 0.3, d / 2 + 0.55]}>
          <Box p={[0, 0, 0]} s={[w / 3, 0.35, 0.55]} c="#6a4a28" />
          <Box p={[0, 0.12, 0]} s={[w / 3 - 0.15, 0.16, 0.4]} c="#b89838" />
        </group>
      )}
      {kind === 'bebek' && (
        <mesh position={[w / 2 + 1.5, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 16]} />
          <meshStandardMaterial color="#4a7a8a" roughness={0.2} />
        </mesh>
      )}
    </group>
  );
});
