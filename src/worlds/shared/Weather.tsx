import { memo, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { seededRandom } from './seededRandom';
import type { Weather } from './types';

const N = 1500;
const AREA = 120;
const TOP = 50;
const DEFAULT_CENTER: [number, number, number] = [0, 0, 0];

const wrap = (v: number, c: number) =>
  ((((v - c + AREA / 2) % AREA) + AREA) % AREA) - AREA / 2 + c;

/**
 * Rain streaks fall as a pure function of `time` (deterministic, Remotion safe).
 * When `time` is omitted, uses R3F clock directly for 60 FPS with 0 React re-renders.
 * Fog is handled in SkyAndLight. Set `followCamera` in free-cam previews so rain stays around the viewer.
 */
export const WeatherFx = memo(function WeatherFx({
  weather,
  time,
  center = DEFAULT_CENTER,
  followCamera = false,
}: {
  weather: Weather;
  time?: number;
  center?: [number, number, number];
  followCamera?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  const seeds = useMemo(() => {
    const r = seededRandom(777);
    return Array.from({ length: N }, () => [
      r() * AREA - AREA / 2,
      r() * TOP,
      r() * AREA - AREA / 2,
      0.7 + r() * 0.5,
    ] as const);
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(time);
  timeRef.current = time;

  const updateInstances = useCallback(
    (t: number, cx: number, cy: number, cz: number) => {
      const m = ref.current;
      if (!m) return;
      for (let i = 0; i < seeds.length; i++) {
        const [x, y0, z, sp] = seeds[i];
        const y = TOP - (((TOP - y0) + t * 35 * sp) % TOP);
        dummy.position.set(wrap(x, cx), cy + y, wrap(z, cz));
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    },
    [seeds, dummy]
  );

  useLayoutEffect(() => {
    if (weather !== 'rain') return;
    if (!followCamera || time !== undefined) {
      const cx = followCamera ? camera.position.x : center[0];
      const cz = followCamera ? camera.position.z : center[2];
      updateInstances(time ?? 0, cx, center[1], cz);
    }
  }, [weather, time, center, followCamera, camera, updateInstances]);

  useFrame(({ clock }) => {
    if (weather !== 'rain') return;
    if (followCamera || timeRef.current === undefined) {
      const cx = followCamera ? camera.position.x : center[0];
      const cz = followCamera ? camera.position.z : center[2];
      updateInstances(timeRef.current ?? clock.elapsedTime, cx, center[1], cz);
    }
  });

  if (weather !== 'rain') return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} frustumCulled={false}>
      <boxGeometry args={[0.03, 1.1, 0.03]} />
      <meshBasicMaterial color="#b8d4e8" transparent opacity={0.45} />
    </instancedMesh>
  );
});
