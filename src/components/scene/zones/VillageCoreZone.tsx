import React, { useMemo } from 'react';
import { Outlines } from '@react-three/drei';
import { getToonGradientTexture } from '../../../utils/toonGradient';

export interface VillageCoreZoneProps {
  focalProp?: 'boulder' | 'house' | 'road' | 'stream';
  isGolden?: boolean;
  isNight?: boolean;
  showDebris?: boolean;
}

const GEODESIC_TREES: Array<{
  pos: [number, number, number];
  scale: number;
}> = [
  { pos: [-5.6, 0.9, -4.2], scale: 1.35 },
  { pos: [5.4, 0.9, -2.5], scale: 1.25 },
  { pos: [-6.2, 0.9, -11.5], scale: 1.45 },
  { pos: [5.8, 0.9, -10.5], scale: 1.4 },
  { pos: [-5.5, 0.9, -18.5], scale: 1.5 },
  { pos: [6.0, 0.9, -17.5], scale: 1.35 },
  { pos: [-4.8, 0.9, 3.8], scale: 1.2 },
  { pos: [5.6, 0.9, 4.5], scale: 1.3 },
];

const SOUTH_TREES: Array<{
  pos: [number, number, number];
  scale: number;
}> = [
  { pos: [-4.6, 0, 12.6], scale: 1.3 },
  { pos: [4.8, 0, 12.8], scale: 1.25 },
  { pos: [-7.5, 0, 15.2], scale: 1.45 },
  { pos: [6.8, 0, 16.0], scale: 1.35 },
  { pos: [-4.4, 0, 17.8], scale: 1.2 },
  { pos: [4.5, 0, 18.0], scale: 1.4 },
];

const SOUTH_BUSHES: Array<{
  pos: [number, number, number];
  scale: [number, number, number];
}> = [
  { pos: [-3.5, 0.34, 13.4], scale: [1.15, 0.75, 1.05] },
  { pos: [3.6, 0.36, 14.2], scale: [1.25, 0.8, 1.1] },
  { pos: [-6.0, 0.38, 16.6], scale: [1.35, 0.85, 1.2] },
  { pos: [5.9, 0.35, 17.2], scale: [1.2, 0.78, 1.1] },
  { pos: [-9.2, 0.4, 13.5], scale: [1.4, 0.9, 1.25] },
];

const UTILITY_POLES_Z = [1.5, -5.0, -11.5, -18.0];
const NORTH_CURBS_Z = [-16, -13, -10, -7, -4, -1, 2, 4.5];
const STEPPING_STONES_X = [-8.0, -7.1, -6.2, -5.3, -4.4, -3.5];

const STILT_HOUSES: Array<{
  pos: [number, number, number];
  rotY: number;
}> = [
  { pos: [4.7, 0.98, -4.5], rotY: -Math.PI / 2 },
  { pos: [4.8, 0.98, -11.0], rotY: -Math.PI / 2 },
  { pos: [-4.7, 0.98, -6.5], rotY: Math.PI / 2 },
  { pos: [-4.8, 0.98, -13.2], rotY: Math.PI / 2 },
];

const DEBRIS_BOULDERS: Array<{
  pos: [number, number, number];
  r: number;
}> = [
  { pos: [-1.55, 0.36, -3.5], r: 0.52 },
  { pos: [1.75, 0.38, -3.9], r: 0.5 },
  { pos: [-0.25, 0.28, -4.6], r: 0.42 },
  { pos: [-1.45, 0.34, -0.3], r: 0.44 },
  { pos: [1.85, 0.32, -0.5], r: 0.4 },
];

interface GeodesicTreeProps {
  pos: [number, number, number];
  scale: number;
  foliageColor: string;
  gradientMap: ReturnType<typeof getToonGradientTexture>;
}

const GeodesicTree: React.FC<GeodesicTreeProps> = ({
  pos,
  scale,
  foliageColor,
  gradientMap,
}) => (
  <group position={pos} scale={scale}>
    <mesh position={[0, 1.0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[0.18, 0.25, 2.0, 6]} />
      <meshToonMaterial color="#713f12" gradientMap={gradientMap} />
      <Outlines thickness={0.025} color="#111827" />
    </mesh>
    <mesh position={[0, 2.45, 0]} castShadow receiveShadow>
      <icosahedronGeometry args={[1.25, 0]} />
      <meshToonMaterial color={foliageColor} gradientMap={gradientMap} />
      <Outlines thickness={0.03} color="#111827" />
    </mesh>
  </group>
);

export const VillageCoreZone: React.FC<VillageCoreZoneProps> = ({
  focalProp,
  isGolden = false,
  isNight = false,
  showDebris = false,
}) => {
  const gradientMap = useMemo(() => getToonGradientTexture(), []);

  const grassColor = isNight ? '#1e3a2f' : isGolden ? '#65a30d' : '#4d7c0f';
  const earthWallColor = isNight ? '#7c2d12' : '#c2410c';
  const roadColor = isNight ? '#57534e' : isGolden ? '#b45309' : '#a16207';
  const windowGlow = isNight ? '#fef08a' : isGolden ? '#fde047' : '#d97706';
  const foliageColor = isNight ? '#166534' : '#3f8f29';
  const bushColor = isNight ? '#14532d' : isGolden ? '#4d7c0f' : '#365314';
  const wellWaterColor = isNight ? '#0369a1' : '#0ea5e9';
  const tajugDarkGreen = isNight ? '#14532d' : '#15803d';
  const tajugMidGreen = isNight ? '#166534' : '#16a34a';

  return (
    <group name="village-core-zone">
      {/* North Village Base Ground (z = -50 .. +5.4, stopping before river channel) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, -22.3]}
        receiveShadow
      >
        <planeGeometry args={[80, 55.4]} />
        <meshToonMaterial color={grassColor} gradientMap={gradientMap} />
      </mesh>

      {/* South Village Base Ground (z = +10.6 .. +34, across the river channel) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 22.3]}
        receiveShadow
      >
        <planeGeometry args={[80, 23.4]} />
        <meshToonMaterial color={grassColor} gradientMap={gradientMap} />
      </mesh>

      {/* North Sandy Dirt Road Corridor (z = -32 .. +5.4) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, -13.3]}
        receiveShadow
      >
        <planeGeometry args={[4.4, 37.4]} />
        <meshToonMaterial color={roadColor} gradientMap={gradientMap} />
      </mesh>

      {/* South Sandy Dirt Road Corridor (z = +10.6 .. +24) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.018, 17.3]}
        receiveShadow
      >
        <planeGeometry args={[4.4, 13.4]} />
        <meshToonMaterial color={roadColor} gradientMap={gradientMap} />
      </mesh>

      {/* Raised Orange-Earth Grass Embankments along North Village Road (z = -30 .. +4.8) */}
      {([-1, 1] as const).map((side) => {
        const isRight = side === 1;
        const wallWidth = isRight ? 3.4 : 4.0;
        const grassWidth = isRight ? 3.5 : 4.1;
        const grassX = isRight ? 4.5 : -4.55;

        return (
          <group key={`embankment-${side}`}>
            <mesh
              position={[side * 4.5, 0.48, -12.6]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[wallWidth, 0.96, 34.8]} />
              <meshToonMaterial
                color={earthWallColor}
                gradientMap={gradientMap}
              />
              <Outlines thickness={0.025} color="#111827" />
            </mesh>
            <mesh position={[grassX, 0.98, -12.6]} receiveShadow>
              <boxGeometry args={[grassWidth, 0.14, 34.8]} />
              <meshToonMaterial color={grassColor} gradientMap={gradientMap} />
            </mesh>
            {NORTH_CURBS_Z.map((z, idx) => (
              <mesh
                key={`curb-${side}-${idx}`}
                position={[side * 2.35, 0.14, z]}
                rotation={[idx * 0.4, idx * 0.7, 0]}
                castShadow
                receiveShadow
              >
                <dodecahedronGeometry args={[0.28, 0]} />
                <meshToonMaterial color="#78716c" gradientMap={gradientMap} />
                <Outlines thickness={0.02} color="#111827" />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* Raised West Village Courtyard Terrace (Pelataran Surau & Sumur, x = -15.5 .. -6.5, z = -5.2 .. +4.8) */}
      <group name="west-village-terrace">
        <mesh position={[-11.0, 0.48, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[9.0, 0.96, 10.0]} />
          <meshToonMaterial color={earthWallColor} gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>
        <mesh position={[-11.1, 0.98, -0.2]} receiveShadow>
          <boxGeometry args={[9.0, 0.14, 10.0]} />
          <meshToonMaterial color={grassColor} gradientMap={gradientMap} />
        </mesh>
        {/* Stepping stone walkway linking Surau porch toward road embankment */}
        {STEPPING_STONES_X.map((sx, idx) => (
          <mesh
            key={`surau-step-stone-${idx}`}
            position={[sx, 1.055, -1.2 + (idx % 2 === 0 ? 0.08 : -0.08)]}
            rotation={[0, idx * 0.45, 0]}
            receiveShadow
          >
            <boxGeometry args={[0.56, 0.025, 0.44]} />
            <meshToonMaterial color="#a8a29e" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}
      </group>

      {/* GIANT MONOLITHIC BOULDER (Batu Besar Penahan Jalan) */}
      <group
        position={[-0.95, 0, -2.2]}
        scale={focalProp === 'boulder' ? 1.03 : 1.0}
      >
        <mesh
          position={[0, 1.48, 0]}
          rotation={[0.08, 0.35, -0.05]}
          scale={[0.92, 1.45, 0.88]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1.18, 0]} />
          <meshToonMaterial color="#786b59" gradientMap={gradientMap} />
          <Outlines thickness={0.045} color="#0f172a" />
        </mesh>
        <mesh
          position={[-0.55, 0.48, -0.42]}
          rotation={[0.3, 0.5, 0.2]}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.56, 0]} />
          <meshToonMaterial color="#57534e" gradientMap={gradientMap} />
          <Outlines thickness={0.03} color="#0f172a" />
        </mesh>
        <mesh
          position={[-0.08, 2.75, 0.05]}
          scale={[0.95, 0.28, 0.85]}
          castShadow
        >
          <dodecahedronGeometry args={[0.72, 0]} />
          <meshToonMaterial color="#4d7c0f" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#0f172a" />
        </mesh>
      </group>

      {/* Post-Landslide Scattered Debris Boulders */}
      {showDebris && (
        <group name="landslide-debris">
          {DEBRIS_BOULDERS.map((b, i) => (
            <mesh
              key={`debris-${i}`}
              position={b.pos}
              rotation={[i * 0.6, i * 1.1, 0.2]}
              castShadow
              receiveShadow
            >
              <dodecahedronGeometry args={[b.r, 0]} />
              <meshToonMaterial color="#8c7a66" gradientMap={gradientMap} />
              <Outlines thickness={0.03} color="#111827" />
            </mesh>
          ))}
        </group>
      )}

      {/* Wooden Bench behind/beside the rock */}
      <group position={[1.45, 0, -4.1]} rotation={[0, -0.25, 0]}>
        <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.05, 0.1, 0.45]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>
        {[-0.4, 0.4].map((lx, i) => (
          <mesh key={`leg-${i}`} position={[lx, 0.19, 0]} castShadow>
            <boxGeometry args={[0.1, 0.38, 0.36]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}
      </group>

      {/* FOREGROUND PORCH SHELTER (Used for 02:00 AM Rain Night Scene) */}
      <group position={[2.8, 0.96, 1.4]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
          <boxGeometry args={[3.2, 0.16, 2.2]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>
        <mesh position={[0, 1.25, -0.95]} castShadow receiveShadow>
          <boxGeometry args={[3.1, 2.2, 0.14]} />
          <meshToonMaterial color="#9a3412" gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>
        <mesh position={[-0.75, 1.35, -0.86]}>
          <boxGeometry args={[0.68, 0.68, 0.05]} />
          <meshBasicMaterial color={windowGlow} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>
        <mesh position={[0, 2.48, 0.1]} rotation={[0.16, 0, 0]} castShadow>
          <boxGeometry args={[3.5, 0.14, 2.6]} />
          <meshToonMaterial color="#7c2d12" gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>
        {[-1.35, 1.35].map((px, i) => (
          <mesh key={`pp-${i}`} position={[px, 1.25, 0.95]} castShadow>
            <boxGeometry args={[0.14, 2.35, 0.14]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
        ))}
        <pointLight
          position={[0, 2.1, 0.4]}
          color="#fbbf24"
          intensity={isNight ? 3.4 : 1.2}
          distance={7}
        />
      </group>

      {/* RAISED WOODEN STILT HOUSES (Rumah Panggung) along Village Corridor */}
      {STILT_HOUSES.map((house, idx) => (
        <group
          key={`stilt-house-${idx}`}
          position={house.pos}
          rotation={[0, house.rotY, 0]}
        >
          {[-1.1, 1.1].map((sx) =>
            [-0.9, 0.9].map((sz) => (
              <mesh
                key={`stilt-${sx}-${sz}`}
                position={[sx, 0.55, sz]}
                castShadow
              >
                <boxGeometry args={[0.16, 1.1, 0.16]} />
                <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
                <Outlines thickness={0.015} color="#111827" />
              </mesh>
            ))
          )}
          <mesh position={[0, 1.85, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.9, 1.75, 2.4]} />
            <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
            <Outlines thickness={0.03} color="#111827" />
          </mesh>
          {[-0.68, 0.68].map((wx, wi) => (
            <mesh key={`win-${wi}`} position={[wx, 1.88, 1.22]}>
              <boxGeometry args={[0.52, 0.52, 0.06]} />
              <meshBasicMaterial color={windowGlow} />
              <Outlines thickness={0.018} color="#111827" />
            </mesh>
          ))}
          <mesh
            position={[0, 3.35, 0]}
            rotation={[0, Math.PI / 4, 0]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[2.5, 1.35, 4]} />
            <meshToonMaterial color="#7c2d12" gradientMap={gradientMap} />
            <Outlines thickness={0.03} color="#111827" />
          </mesh>
        </group>
      ))}

      {/* SURAU / MUSHOLA PANGGUNG DESA (West Courtyard, facing East +X toward road) */}
      <group
        name="surau-panggung-desa"
        position={[-11.2, 0.98, -1.2]}
        rotation={[0, Math.PI / 2, 0]}
      >
        {/* Stone Umpak Footings & Wooden Stilt Legs */}
        {[-1.55, 0, 1.55].map((sx) =>
          [-1.35, 0.35, 1.85].map((sz) => (
            <group key={`surau-stilt-${sx}-${sz}`} position={[sx, 0, sz]}>
              <mesh position={[0, 0.09, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.26, 0.14, 0.26]} />
                <meshToonMaterial color="#78716c" gradientMap={gradientMap} />
                <Outlines thickness={0.015} color="#111827" />
              </mesh>
              <mesh position={[0, 0.47, 0]} castShadow>
                <boxGeometry args={[0.16, 0.68, 0.16]} />
                <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
                <Outlines thickness={0.015} color="#111827" />
              </mesh>
            </group>
          ))
        )}

        {/* Main Raised Wooden Deck + Front Serambi Porch */}
        <mesh position={[0, 0.84, 0.25]} castShadow receiveShadow>
          <boxGeometry args={[3.75, 0.16, 3.9]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>

        {/* Serambi Front Balustrade & Porch Posts */}
        {[-1.72, -0.78, 0.78, 1.72].map((px, i) => (
          <mesh key={`serambi-post-${i}`} position={[px, 1.9, 2.08]} castShadow>
            <boxGeometry args={[0.13, 2.0, 0.13]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
        ))}
        {/* Serambi Railings (left & right front plus side rails) */}
        {[-1.25, 1.25].map((rx, i) => (
          <group key={`serambi-front-rail-${i}`}>
            <mesh position={[rx, 1.32, 2.08]} castShadow>
              <boxGeometry args={[0.88, 0.08, 0.08]} />
              <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
              <Outlines thickness={0.012} color="#111827" />
            </mesh>
            <mesh position={[rx, 1.08, 2.08]} castShadow>
              <boxGeometry args={[0.88, 0.22, 0.06]} />
              <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
              <Outlines thickness={0.012} color="#111827" />
            </mesh>
          </group>
        ))}
        {[-1.72, 1.72].map((sx, i) => (
          <mesh key={`serambi-side-rail-${i}`} position={[sx, 1.32, 1.54]} castShadow>
            <boxGeometry args={[0.08, 0.08, 1.1]} />
            <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
            <Outlines thickness={0.012} color="#111827" />
          </mesh>
        ))}

        {/* Front Porch Stairs descending East (+Z local) */}
        {[
          { y: 0.65, z: 2.34 },
          { y: 0.42, z: 2.58 },
          { y: 0.19, z: 2.82 },
        ].map((step, i) => (
          <mesh
            key={`surau-stair-${i}`}
            position={[0, step.y, step.z]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[1.15, 0.12, 0.28]} />
            <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        ))}
        {[-0.6, 0.6].map((sx, i) => (
          <mesh
            key={`stair-rail-${i}`}
            position={[sx, 0.56, 2.56]}
            rotation={[0.78, 0, 0]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.12, 1.05]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.012} color="#111827" />
          </mesh>
        ))}

        {/* Main Prayer Hall Wooden Cabin */}
        <mesh position={[0, 1.88, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[3.4, 1.92, 2.55]} />
          <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
          <Outlines thickness={0.03} color="#111827" />
        </mesh>

        {/* Mihrab Alcove Projection on Back (-Z) Wall */}
        <mesh position={[0, 1.75, -1.75]} castShadow receiveShadow>
          <boxGeometry args={[1.25, 1.65, 0.45]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>

        {/* Front Entrance Doorway with Glowing Arched Transom */}
        <group position={[0, 1.66, 0.99]}>
          <mesh castShadow>
            <boxGeometry args={[0.92, 1.48, 0.08]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
          <mesh position={[0, -0.2, 0.02]}>
            <boxGeometry args={[0.72, 1.08, 0.06]} />
            <meshToonMaterial color="#713f12" gradientMap={gradientMap} />
            <Outlines thickness={0.012} color="#111827" />
          </mesh>
          <mesh position={[0, 0.34, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry
              args={[0.36, 0.36, 0.07, 10, 1, false, Math.PI / 2, Math.PI]}
            />
            <meshBasicMaterial color={windowGlow} />
          </mesh>
        </group>

        {/* Front Flanking Arched Glowing Windows */}
        {[-1.08, 1.08].map((wx, wi) => (
          <group key={`surau-front-win-${wi}`} position={[wx, 1.9, 0.99]}>
            <mesh>
              <boxGeometry args={[0.56, 0.66, 0.06]} />
              <meshBasicMaterial color={windowGlow} />
              <Outlines thickness={0.018} color="#111827" />
            </mesh>
            <mesh position={[0, 0.33, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry
                args={[0.28, 0.28, 0.06, 10, 1, false, Math.PI / 2, Math.PI]}
              />
              <meshBasicMaterial color={windowGlow} />
            </mesh>
            <mesh position={[0, -0.36, 0.02]}>
              <boxGeometry args={[0.66, 0.08, 0.09]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            </mesh>
          </group>
        ))}

        {/* Side Glowing Arched Windows (North & South walls) */}
        {([-1, 1] as const).map((side) =>
          [-0.85, 0.22].map((wz, wi) => (
            <group
              key={`surau-side-win-${side}-${wi}`}
              position={[side * 1.72, 1.92, wz]}
              rotation={[0, side * (Math.PI / 2), 0]}
            >
              <mesh>
                <boxGeometry args={[0.54, 0.64, 0.06]} />
                <meshBasicMaterial color={windowGlow} />
                <Outlines thickness={0.018} color="#111827" />
              </mesh>
              <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry
                  args={[0.27, 0.27, 0.06, 10, 1, false, Math.PI / 2, Math.PI]}
                />
                <meshBasicMaterial color={windowGlow} />
              </mesh>
            </group>
          ))
        )}

        {/* 3-Tier Green Tajug Pitched Roof */}
        <mesh
          position={[0, 3.26, 0.18]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[3.25, 0.96, 4]} />
          <meshToonMaterial color={tajugDarkGreen} gradientMap={gradientMap} />
          <Outlines thickness={0.03} color="#0f172a" />
        </mesh>
        <mesh
          position={[0, 3.98, -0.15]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[2.18, 0.9, 4]} />
          <meshToonMaterial color={tajugMidGreen} gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#0f172a" />
        </mesh>
        <mesh
          position={[0, 4.68, -0.15]}
          rotation={[0, Math.PI / 4, 0]}
          castShadow
          receiveShadow
        >
          <coneGeometry args={[1.24, 0.95, 4]} />
          <meshToonMaterial color={tajugDarkGreen} gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#0f172a" />
        </mesh>

        {/* Golden Mustaka Finial (Pedestal + Sphere + Spire + Crescent) */}
        <group position={[0, 5.15, -0.15]}>
          <mesh position={[0, 0.06, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.2, 0.16, 8]} />
            <meshToonMaterial color="#ca8a04" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <mesh position={[0, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.17, 10, 8]} />
            <meshToonMaterial color="#fbbf24" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
          <mesh position={[0, 0.56, 0]} castShadow>
            <coneGeometry args={[0.08, 0.42, 8]} />
            <meshToonMaterial color="#facc15" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <mesh position={[0, 0.84, 0]} rotation={[0, 0, Math.PI * 0.58]}>
            <torusGeometry args={[0.13, 0.028, 6, 12, Math.PI * 1.35]} />
            <meshToonMaterial color="#fde047" gradientMap={gradientMap} />
            <Outlines thickness={0.012} color="#111827" />
          </mesh>
        </group>

        {/* Bedug (Traditional Mosque Drum on Stand) on Front Serambi */}
        <group position={[-1.22, 0.92, 1.54]} rotation={[0, 0.2, 0]}>
          {/* X-frame timber legs */}
          {[-0.24, 0.24].map((dz, li) => (
            <group key={`bedug-leg-${li}`} position={[0, 0.24, dz]}>
              <mesh rotation={[0, 0, 0.55]} castShadow>
                <boxGeometry args={[0.06, 0.54, 0.06]} />
                <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              </mesh>
              <mesh rotation={[0, 0, -0.55]} castShadow>
                <boxGeometry args={[0.06, 0.54, 0.06]} />
                <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              </mesh>
            </group>
          ))}
          {/* Horizontal Wooden Barrel Drum */}
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.21, 0.19, 0.64, 10]} />
            <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
          {/* Drumhead Skins */}
          {[-0.325, 0.325].map((dz, di) => (
            <mesh
              key={`bedug-head-${di}`}
              position={[0, 0.42, dz]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.18, 0.18, 0.02, 10]} />
              <meshToonMaterial color="#fde68a" gradientMap={gradientMap} />
            </mesh>
          ))}
        </group>

        {/* Warm Serambi Lantern Light */}
        <pointLight
          position={[0, 2.35, 1.6]}
          color="#fbbf24"
          intensity={isNight ? 3.8 : 1.0}
          distance={9}
        />
      </group>

      {/* SUMUR TIMBA BATU (Traditional Stone Well on West Courtyard) */}
      <group name="sumur-timba-batu" position={[-7.8, 0.98, 1.5]}>
        {/* Cobblestone Apron Base */}
        <mesh position={[0, 0.09, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[0.84, 0.92, 0.08, 12]} />
          <meshToonMaterial color="#57534e" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>

        {/* Stone Cylindrical Well Wall */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.6, 0.64, 0.62, 12]} />
          <meshToonMaterial color="#78716c" gradientMap={gradientMap} />
          <Outlines thickness={0.025} color="#111827" />
        </mesh>

        {/* Dark Inner Well Shaft Rim & Water Surface */}
        <mesh position={[0, 0.72, 0]} receiveShadow>
          <cylinderGeometry args={[0.46, 0.46, 0.04, 12]} />
          <meshToonMaterial color={wellWaterColor} gradientMap={gradientMap} />
        </mesh>

        {/* Raised Stone Parapet Coping Ring */}
        <mesh
          position={[0, 0.77, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
          receiveShadow
        >
          <torusGeometry args={[0.53, 0.11, 6, 12]} />
          <meshToonMaterial color="#a8a29e" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>

        {/* Twin Wooden A-Frame Posts */}
        {[-0.68, 0.68].map((px, i) => (
          <group key={`well-post-${i}`} position={[px, 0, 0]}>
            <mesh position={[0, 1.08, -0.14]} rotation={[0.12, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 2.02, 0.1]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              <Outlines thickness={0.015} color="#111827" />
            </mesh>
            <mesh position={[0, 1.08, 0.14]} rotation={[-0.12, 0, 0]} castShadow>
              <boxGeometry args={[0.1, 2.02, 0.1]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              <Outlines thickness={0.015} color="#111827" />
            </mesh>
          </group>
        ))}

        {/* Horizontal Windlass Crossbeam */}
        <mesh position={[0, 1.92, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.56, 8]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>

        {/* Small Pitched Well Roof Cap */}
        <group position={[0, 2.12, 0]}>
          <mesh position={[0, 0.12, -0.34]} rotation={[-0.45, 0, 0]} castShadow>
            <boxGeometry args={[1.68, 0.08, 0.85]} />
            <meshToonMaterial color="#7c2d12" gradientMap={gradientMap} />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
          <mesh position={[0, 0.12, 0.34]} rotation={[0.45, 0, 0]} castShadow>
            <boxGeometry args={[1.68, 0.08, 0.85]} />
            <meshToonMaterial color="#7c2d12" gradientMap={gradientMap} />
            <Outlines thickness={0.02} color="#111827" />
          </mesh>
        </group>

        {/* Hanging Rope & Wooden Bucket */}
        <mesh position={[0, 1.54, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.72, 6]} />
          <meshToonMaterial color="#d6d3d1" gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 1.12, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.11, 0.24, 8]} />
          <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>
      </group>

      {/* GEROBAK KAYU DESA (Traditional Wooden Pushcart beside Lane) */}
      <group
        name="gerobak-kayu-desa"
        position={[-7.5, 0.98, -3.2]}
        rotation={[0, 0.35, 0]}
      >
        {/* Spoked Wooden Wheels */}
        {[-0.56, 0.56].map((wx, wi) => (
          <group key={`cart-wheel-${wi}`} position={[wx, 0.41, 0]}>
            <mesh rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.31, 0.04, 6, 12]} />
              <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
              <Outlines thickness={0.018} color="#111827" />
            </mesh>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.1, 8]} />
              <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
              <Outlines thickness={0.012} color="#111827" />
            </mesh>
            {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map(
              (ang, si) => (
                <mesh
                  key={`spoke-${si}`}
                  rotation={[ang, 0, 0]}
                  castShadow
                >
                  <boxGeometry args={[0.035, 0.58, 0.035]} />
                  <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
                </mesh>
              )
            )}
          </group>
        ))}

        {/* Wheel Axle */}
        <mesh position={[0, 0.41, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.18, 6]} />
          <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
        </mesh>

        {/* Cart Wooden Deck */}
        <mesh position={[0, 0.49, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.96, 0.09, 1.42]} />
          <meshToonMaterial color="#78350f" gradientMap={gradientMap} />
          <Outlines thickness={0.02} color="#111827" />
        </mesh>

        {/* Side & End Wooden Boards */}
        {[-0.44, 0.44].map((bx, i) => (
          <mesh key={`cart-side-${i}`} position={[bx, 0.71, 0]} castShadow>
            <boxGeometry args={[0.08, 0.36, 1.4]} />
            <meshToonMaterial color="#92400e" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
        ))}
        {[-0.67, 0.67].map((bz, i) => (
          <mesh key={`cart-end-${i}`} position={[0, 0.71, bz]} castShadow>
            <boxGeometry args={[0.88, 0.36, 0.08]} />
            <meshToonMaterial color="#b45309" gradientMap={gradientMap} />
            <Outlines thickness={0.018} color="#111827" />
          </mesh>
        ))}

        {/* Front Push Handles & Resting Leg */}
        {[-0.38, 0.38].map((hx, i) => (
          <mesh key={`cart-handle-${i}`} position={[hx, 0.54, 0.98]} castShadow>
            <boxGeometry args={[0.07, 0.07, 0.65]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.012} color="#111827" />
          </mesh>
        ))}
        <mesh position={[0, 0.28, 0.72]} castShadow>
          <boxGeometry args={[0.09, 0.42, 0.09]} />
          <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
          <Outlines thickness={0.012} color="#111827" />
        </mesh>

        {/* Harvest Produce Sacks inside Cart */}
        <mesh
          position={[-0.14, 0.66, -0.18]}
          rotation={[0.1, 0.3, 0.15]}
          scale={[1.1, 0.85, 1.25]}
          castShadow
        >
          <dodecahedronGeometry args={[0.26, 0]} />
          <meshToonMaterial color="#d6b88c" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>
        <mesh
          position={[0.16, 0.65, 0.18]}
          rotation={[-0.1, -0.4, 0.1]}
          scale={[1.0, 0.82, 1.15]}
          castShadow
        >
          <dodecahedronGeometry args={[0.24, 0]} />
          <meshToonMaterial color="#a16207" gradientMap={gradientMap} />
          <Outlines thickness={0.015} color="#111827" />
        </mesh>
      </group>

      {/* Wooden Utility Poles along Left Side of Road */}
      {UTILITY_POLES_Z.map((z, idx) => (
        <group key={`pole-${idx}`} position={[-2.55, 0.98, z]}>
          <mesh position={[0, 2.3, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 4.6, 6]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
          <mesh position={[0, 4.15, 0]} castShadow>
            <boxGeometry args={[1.05, 0.1, 0.1]} />
            <meshToonMaterial color="#451a03" gradientMap={gradientMap} />
            <Outlines thickness={0.015} color="#111827" />
          </mesh>
        </group>
      ))}

      {/* Geodesic Flat-Shaded Low-Poly Trees (North Corridor) */}
      {GEODESIC_TREES.map((tree, idx) => (
        <GeodesicTree
          key={`geo-tree-${idx}`}
          pos={tree.pos}
          scale={tree.scale}
          foliageColor={foliageColor}
          gradientMap={gradientMap}
        />
      ))}

      {/* South Side Trees & Bushes across the Bridge (z = +12 .. +18) */}
      <group name="south-side-foliage">
        {SOUTH_TREES.map((tree, idx) => (
          <GeodesicTree
            key={`south-tree-${idx}`}
            pos={tree.pos}
            scale={tree.scale}
            foliageColor={foliageColor}
            gradientMap={gradientMap}
          />
        ))}

        {SOUTH_BUSHES.map((bush, idx) => (
          <group
            key={`south-bush-${idx}`}
            position={bush.pos}
            scale={bush.scale}
          >
            <mesh castShadow receiveShadow>
              <icosahedronGeometry args={[0.52, 0]} />
              <meshToonMaterial color={bushColor} gradientMap={gradientMap} />
              <Outlines thickness={0.022} color="#111827" />
            </mesh>
            <mesh position={[0.36, -0.08, 0.16]} scale={0.72} castShadow>
              <icosahedronGeometry args={[0.44, 0]} />
              <meshToonMaterial
                color={foliageColor}
                gradientMap={gradientMap}
              />
              <Outlines thickness={0.018} color="#111827" />
            </mesh>
          </group>
        ))}
      </group>

      {/* DISTANT CONICAL MOUNTAIN PEAK CLOSING THE HORIZON */}
      <group position={[0, 0, -35]}>
        <mesh position={[0, 8.2, 0]} receiveShadow>
          <coneGeometry args={[20, 17, 16]} />
          <meshToonMaterial
            color={isNight ? '#1e293b' : isGolden ? '#6b21a8' : '#3b5998'}
            gradientMap={gradientMap}
          />
          <Outlines thickness={0.03} color="#0f172a" />
        </mesh>
        <mesh position={[-11, 2.8, 7]}>
          <coneGeometry args={[12, 6, 8]} />
          <meshToonMaterial
            color={isNight ? '#14532d' : '#15803d'}
            gradientMap={gradientMap}
          />
        </mesh>
        <mesh position={[11, 2.8, 7]}>
          <coneGeometry args={[12, 6, 8]} />
          <meshToonMaterial
            color={isNight ? '#14532d' : '#166534'}
            gradientMap={gradientMap}
          />
        </mesh>
      </group>

      {/* Subtle Sunrise God-Rays during Dawn/Golden Preset */}
      {isGolden && (
        <group position={[0, 7, -14]}>
          {[-2.8, 0, 2.8].map((rx, idx) => (
            <mesh
              key={`ray-${idx}`}
              position={[rx, 0, 0]}
              rotation={[0, 0, -0.22 + idx * 0.08]}
            >
              <planeGeometry args={[1.6, 22]} />
              <meshBasicMaterial
                color="#fed7aa"
                transparent
                opacity={0.14}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
