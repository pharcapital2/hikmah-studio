import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  Instances,
  lightsOn,
  useWorldAnimation,
  type InstanceData,
  type TimeOfDay,
  type Weather,
} from '../../shared';
import {
  BLOCK_CENTERS,
  BLOCK_SIZE,
  crosswalks,
  FLYOVER,
  intersections,
  LANE_WIDTH,
  ROAD_LINES,
  ROAD_WIDTH,
  SIDEWALK_H,
  signalState,
  WORLD_SIZE,
} from '../layout';
import { CITY_PALETTE } from '../palette';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
  time?: number;
}

const SIG_GREEN = new THREE.Color('#2ee66b');
const SIG_YELLOW = new THREE.Color('#ffd026');
const SIG_RED = new THREE.Color('#ff3b3b');
const SIG_OFF = new THREE.Color('#181d24');

export const RoadNetwork = memo(function RoadNetwork({ timeOfDay, weather, time }: Props) {
  const glow = lightsOn(timeOfDay, weather);

  const boxGeo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const cylGeo = useMemo(() => new THREE.CylinderGeometry(1, 1, 1, 8), []);

  const matAsphalt = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.asphalt, roughness: 0.92 }), []);
  const matSidewalk = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.sidewalk, roughness: 0.9 }), []);
  const matCurb = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.curb, roughness: 0.88 }), []);
  const matWhite = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.markingWhite, roughness: 0.7 }), []);
  const matYellow = useMemo(() => new THREE.MeshStandardMaterial({ color: CITY_PALETTE.markingYellow, roughness: 0.7 }), []);
  const matPole = useMemo(() => new THREE.MeshStandardMaterial({ color: '#333a44', roughness: 0.6, metalness: 0.4 }), []);
  const matLampBulb = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: glow ? '#fff0c4' : '#9aa5b4',
        emissive: glow ? '#ffd580' : '#000000',
        emissiveIntensity: glow ? 1.8 : 0,
      }),
    [glow],
  );

  // Sidewalk blocks (36 blocks)
  const blockInstances = useMemo<InstanceData[]>(() => {
    const out: InstanceData[] = [];
    for (const cx of BLOCK_CENTERS) {
      for (const cz of BLOCK_CENTERS) {
        out.push({
          position: [cx, SIDEWALK_H / 2, cz],
          scale: [BLOCK_SIZE, SIDEWALK_H, BLOCK_SIZE],
        });
      }
    }
    return out;
  }, []);

  // Subtle curb rim around each block (slightly taller/darker base)
  const curbInstances = useMemo<InstanceData[]>(() => {
    const out: InstanceData[] = [];
    for (const cx of BLOCK_CENTERS) {
      for (const cz of BLOCK_CENTERS) {
        out.push({
          position: [cx, SIDEWALK_H * 0.45, cz],
          scale: [BLOCK_SIZE + 0.35, SIDEWALK_H * 0.9, BLOCK_SIZE + 0.35],
        });
      }
    }
    return out;
  }, []);

  // Lane markings + stop lines + zebra crosswalks + flyover center dashes
  const { whiteMarks, yellowMarks } = useMemo(() => {
    const white: InstanceData[] = [];
    const yellow: InstanceData[] = [];

    // Road dashes & double yellow centerlines along X and Z roads
    for (const r of ROAD_LINES) {
      // Segments between intersections (each block span = 86m, skip intersection +-13m)
      for (const base of [-250, -150, -50, 50, 150, 250]) {
        // Double yellow centerlines
        yellow.push({ position: [base, 0.02, r - 0.18], scale: [74, 0.02, 0.14] });
        yellow.push({ position: [base, 0.02, r + 0.18], scale: [74, 0.02, 0.14] });
        yellow.push({ position: [r - 0.18, 0.02, base], scale: [0.14, 0.02, 74] });
        yellow.push({ position: [r + 0.18, 0.02, base], scale: [0.14, 0.02, 74] });

        // Dashed white lane dividers
        for (let d = -33; d <= 33; d += 7.5) {
          white.push({ position: [base + d, 0.02, r - LANE_WIDTH], scale: [3.2, 0.02, 0.15] });
          white.push({ position: [base + d, 0.02, r + LANE_WIDTH], scale: [3.2, 0.02, 0.15] });
          white.push({ position: [r - LANE_WIDTH, 0.02, base + d], scale: [0.15, 0.02, 3.2] });
          white.push({ position: [r + LANE_WIDTH, 0.02, base + d], scale: [0.15, 0.02, 3.2] });
        }
      }
    }

    // Center dashed line on flyover deck
    for (let i = 0; i < 24; i++) {
      yellow.push({
        position: [-184 + i * 16, FLYOVER.deckY + 0.06, FLYOVER.z],
        scale: [6, 0.02, 0.2],
      });
    }

    // Zebra crosswalk stripes (6 stripes per crosswalk)
    for (const cw of crosswalks) {
      for (let i = -2; i <= 2; i++) {
        const offset = i * 2.2;
        if (Math.abs(cw.rotY) < 0.1) {
          // Crosswalk across X road (stripes along X, spaced along Z)
          white.push({ position: [cw.x, 0.025, cw.z + offset], scale: [2.6, 0.02, 0.9] });
        } else {
          // Crosswalk across Z road (stripes along Z, spaced along X)
          white.push({ position: [cw.x + offset, 0.025, cw.z], scale: [0.9, 0.02, 2.6] });
        }
      }
    }

    // Stop lines at intersections
    const stopDist = ROAD_WIDTH / 2 + 5.2;
    for (const ix of intersections) {
      white.push({ position: [ix.x + stopDist, 0.025, ix.z + LANE_WIDTH], scale: [0.45, 0.02, ROAD_WIDTH / 2 - 0.6] });
      white.push({ position: [ix.x - stopDist, 0.025, ix.z - LANE_WIDTH], scale: [0.45, 0.02, ROAD_WIDTH / 2 - 0.6] });
      white.push({ position: [ix.x - LANE_WIDTH, 0.025, ix.z + stopDist], scale: [ROAD_WIDTH / 2 - 0.6, 0.02, 0.45] });
      white.push({ position: [ix.x + LANE_WIDTH, 0.025, ix.z - stopDist], scale: [ROAD_WIDTH / 2 - 0.6, 0.02, 0.45] });
    }

    return { whiteMarks: white, yellowMarks: yellow };
  }, []);

  // Traffic light poles & housings at all 25 intersections
  const { signalPoles, signalArms, signalHeads, xBulbs, zBulbs } = useMemo(() => {
    const poles: InstanceData[] = [];
    const arms: InstanceData[] = [];
    const heads: InstanceData[] = [];
    const xb: InstanceData[] = [];
    const zb: InstanceData[] = [];
    const off = ROAD_WIDTH / 2 + 0.9;

    for (const ix of intersections) {
      // 2 diagonal corners per intersection keep draw calls clean while facing all 4 directions
      const corners = [
        { cx: ix.x - off, cz: ix.z - off, armX: 3.2, armZ: 0, axis: 'z' as const },
        { cx: ix.x + off, cz: ix.z + off, armX: -3.2, armZ: 0, axis: 'z' as const },
        { cx: ix.x + off, cz: ix.z - off, armX: 0, armZ: 3.2, axis: 'x' as const },
        { cx: ix.x - off, cz: ix.z + off, armX: 0, armZ: -3.2, axis: 'x' as const },
      ];
      for (const c of corners) {
        poles.push({ position: [c.cx, 2.9, c.cz], scale: [0.12, 5.8, 0.12] });
        const hx = c.cx + c.armX;
        const hz = c.cz + c.armZ;
        arms.push({
          position: [c.cx + c.armX * 0.5, 5.65, c.cz + c.armZ * 0.5],
          scale: [c.armX !== 0 ? Math.abs(c.armX) : 0.14, 0.14, c.armZ !== 0 ? Math.abs(c.armZ) : 0.14],
        });
        heads.push({ position: [hx, 5.45, hz], scale: [0.42, 1.15, 0.42] });
        const target = c.axis === 'x' ? xb : zb;
        target.push({ position: [hx, 5.45, hz] });
      }
    }
    return { signalPoles: poles, signalArms: arms, signalHeads: heads, xBulbs: xb, zBulbs: zb };
  }, []);

  // Flyover geometry calculations
  const flyDeckLen = 400; // -200..200
  const rampAngle = Math.atan2(FLYOVER.deckY, FLYOVER.rampLength);
  const rampHyp = Math.hypot(FLYOVER.deckY, FLYOVER.rampLength);
  const flyLampPosts = useMemo<InstanceData[]>(() => {
    const arr: InstanceData[] = [];
    for (let x = -180; x <= 180; x += 30) {
      arr.push({ position: [x, FLYOVER.deckY + 2.5, FLYOVER.z - FLYOVER.width / 2 + 0.3], scale: [0.09, 5, 0.09] });
      arr.push({ position: [x, FLYOVER.deckY + 2.5, FLYOVER.z + FLYOVER.width / 2 - 0.3], scale: [0.09, 5, 0.09] });
    }
    return arr;
  }, []);
  const flyLampBulbs = useMemo<InstanceData[]>(() => {
    const arr: InstanceData[] = [];
    for (let x = -180; x <= 180; x += 30) {
      arr.push({ position: [x, FLYOVER.deckY + 5.05, FLYOVER.z - FLYOVER.width / 2 + 0.7], scale: [0.45, 0.16, 0.28] });
      arr.push({ position: [x, FLYOVER.deckY + 5.05, FLYOVER.z + FLYOVER.width / 2 - 0.7], scale: [0.45, 0.16, 0.28] });
    }
    return arr;
  }, []);

  return (
    <group name="city-road-network">
      {/* Ground skirt */}
      <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[WORLD_SIZE + 80, WORLD_SIZE + 80]} />
        <meshStandardMaterial color={CITY_PALETTE.ground} roughness={0.95} />
      </mesh>

      {/* Asphalt road ribbons along X and Z */}
      {ROAD_LINES.map((pos) => (
        <group key={`road-${pos}`}>
          <mesh position={[0, 0.005, pos]} rotation={[-Math.PI / 2, 0, 0]} material={matAsphalt} receiveShadow>
            <planeGeometry args={[WORLD_SIZE, ROAD_WIDTH]} />
          </mesh>
          <mesh position={[pos, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matAsphalt} receiveShadow>
            <planeGeometry args={[ROAD_WIDTH, WORLD_SIZE]} />
          </mesh>
        </group>
      ))}

      {/* Raised curbs & sidewalks for all 36 blocks */}
      <Instances geometry={boxGeo} material={matCurb} instances={curbInstances} receiveShadow />
      <Instances geometry={boxGeo} material={matSidewalk} instances={blockInstances} receiveShadow />

      {/* Road markings, stop lines, zebra crosswalks */}
      <Instances geometry={boxGeo} material={matWhite} instances={whiteMarks} />
      <Instances geometry={boxGeo} material={matYellow} instances={yellowMarks} />

      {/* Traffic signals (poles, cantilever arms, housings, live signal heads) */}
      <Instances geometry={cylGeo} material={matPole} instances={signalPoles} castShadow />
      <Instances geometry={boxGeo} material={matPole} instances={signalArms} />
      <Instances geometry={boxGeo} material={matPole} instances={signalHeads} />
      <SignalHeads xBulbs={xBulbs} zBulbs={zBulbs} boxGeo={boxGeo} time={time} />

      {/* Flyover along z = -100 */}
      <group name="city-flyover">
        {/* Flat main deck */}
        <mesh position={[0, FLYOVER.deckY - 0.4, FLYOVER.z]} castShadow receiveShadow>
          <boxGeometry args={[flyDeckLen, 0.8, FLYOVER.width]} />
          <meshStandardMaterial color={CITY_PALETTE.concreteDark} roughness={0.85} />
        </mesh>
        {/* Asphalt surface on deck */}
        <mesh position={[0, FLYOVER.deckY + 0.02, FLYOVER.z]} receiveShadow>
          <boxGeometry args={[flyDeckLen, 0.05, FLYOVER.width - 1.2]} />
          <meshStandardMaterial color={CITY_PALETTE.asphaltDark} roughness={0.9} />
        </mesh>
        {/* Parapet barriers */}
        <mesh position={[0, FLYOVER.deckY + 0.55, FLYOVER.z - FLYOVER.width / 2 + 0.25]} castShadow>
          <boxGeometry args={[flyDeckLen, 1.0, 0.5]} />
          <meshStandardMaterial color={CITY_PALETTE.concrete} roughness={0.85} />
        </mesh>
        <mesh position={[0, FLYOVER.deckY + 0.55, FLYOVER.z + FLYOVER.width / 2 - 0.25]} castShadow>
          <boxGeometry args={[flyDeckLen, 1.0, 0.5]} />
          <meshStandardMaterial color={CITY_PALETTE.concrete} roughness={0.85} />
        </mesh>

        {/* West & East sloped ramps */}
        {([-1, 1] as const).map((side) => {
          const cx = side * (200 + FLYOVER.rampLength / 2);
          return (
            <group
              key={`ramp-${side}`}
              position={[cx, FLYOVER.deckY / 2 - 0.35, FLYOVER.z]}
              rotation={[0, 0, -side * rampAngle]}
            >
              <mesh castShadow receiveShadow>
                <boxGeometry args={[rampHyp, 0.75, FLYOVER.width]} />
                <meshStandardMaterial color={CITY_PALETTE.concreteDark} roughness={0.88} />
              </mesh>
              <mesh position={[0, 0.39, 0]} receiveShadow>
                <boxGeometry args={[rampHyp, 0.04, FLYOVER.width - 1.2]} />
                <meshStandardMaterial color={CITY_PALETTE.asphaltDark} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.8, -FLYOVER.width / 2 + 0.25]}>
                <boxGeometry args={[rampHyp, 0.9, 0.45]} />
                <meshStandardMaterial color={CITY_PALETTE.concrete} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.8, FLYOVER.width / 2 - 0.25]}>
                <boxGeometry args={[rampHyp, 0.9, 0.45]} />
                <meshStandardMaterial color={CITY_PALETTE.concrete} roughness={0.85} />
              </mesh>
            </group>
          );
        })}

        {/* Concrete support pillars + pier caps */}
        {FLYOVER.pillarsX.map((px) => (
          <group key={`pillar-${px}`} position={[px, 0, FLYOVER.z]}>
            <mesh position={[0, (FLYOVER.deckY - 0.8) / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.05, 1.25, FLYOVER.deckY - 0.8, 12]} />
              <meshStandardMaterial color={CITY_PALETTE.concrete} roughness={0.85} />
            </mesh>
            <mesh position={[0, FLYOVER.deckY - 1.1, 0]} castShadow>
              <boxGeometry args={[2.6, 0.9, FLYOVER.width - 1.4]} />
              <meshStandardMaterial color={CITY_PALETTE.concreteDark} roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Flyover street lamps */}
        <Instances geometry={cylGeo} material={matPole} instances={flyLampPosts} />
        <Instances geometry={boxGeo} material={matLampBulb} instances={flyLampBulbs} />
      </group>
    </group>
  );
});

const SignalHeads = memo(function SignalHeads({
  xBulbs,
  zBulbs,
  boxGeo,
  time,
}: {
  xBulbs: InstanceData[];
  zBulbs: InstanceData[];
  boxGeo: THREE.BufferGeometry;
  time?: number;
}) {
  const totalBulbs = (xBulbs.length + zBulbs.length) * 3;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const prevPhaseRef = useRef<{ x: string; z: string }>({ x: '', z: '' });
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const yOffsets = [0.3, 0, -0.3];

    let idx = 0;
    for (let i = 0; i < xBulbs.length; i++) {
      const p = xBulbs[i].position;
      for (let s = 0; s < 3; s++) {
        dummy.position.set(p[0], p[1] + yOffsets[s], p[2]);
        dummy.scale.set(0.46, 0.24, 0.24);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    for (let i = 0; i < zBulbs.length; i++) {
      const p = zBulbs[i].position;
      for (let s = 0; s < 3; s++) {
        dummy.position.set(p[0], p[1] + yOffsets[s], p[2]);
        dummy.scale.set(0.24, 0.24, 0.46);
        dummy.updateMatrix();
        mesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    prevPhaseRef.current.x = '';
    prevPhaseRef.current.z = '';
  }, [xBulbs, zBulbs]);

  useWorldAnimation(
    time,
    (t) => {
      const mesh = meshRef.current;
      if (!mesh) return;
      const sig = signalState(t);
      const prev = prevPhaseRef.current;
      const xChanged = sig.x !== prev.x;
      const zChanged = sig.z !== prev.z;
      if (!xChanged && !zChanged) return;

      if (xChanged) {
        prev.x = sig.x;
        for (let i = 0; i < xBulbs.length; i++) {
          const base = i * 3;
          mesh.setColorAt(base, sig.x === 'red' ? SIG_RED : SIG_OFF);
          mesh.setColorAt(base + 1, sig.x === 'yellow' ? SIG_YELLOW : SIG_OFF);
          mesh.setColorAt(base + 2, sig.x === 'green' ? SIG_GREEN : SIG_OFF);
        }
      }
      if (zChanged) {
        prev.z = sig.z;
        const offset = xBulbs.length * 3;
        for (let i = 0; i < zBulbs.length; i++) {
          const base = offset + i * 3;
          mesh.setColorAt(base, sig.z === 'red' ? SIG_RED : SIG_OFF);
          mesh.setColorAt(base + 1, sig.z === 'yellow' ? SIG_YELLOW : SIG_OFF);
          mesh.setColorAt(base + 2, sig.z === 'green' ? SIG_GREEN : SIG_OFF);
        }
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    [xBulbs, zBulbs],
  );

  return <instancedMesh key={totalBulbs} ref={meshRef} args={[boxGeo, mat, totalBulbs]} frustumCulled={false} />;
});
