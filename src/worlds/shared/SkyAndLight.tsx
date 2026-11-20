import { memo, useMemo } from 'react';
import type { TimeOfDay, Weather } from './types';
import { SKY_PRESETS, WEATHER_FOG } from './palette';
import { seededRandom } from './seededRandom';

const SHADOW_MAP_SIZE: [number, number] = [1024, 1024];

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
}

export const SkyAndLight = memo(function SkyAndLight({ timeOfDay, weather }: Props) {
  const p = SKY_PRESETS[timeOfDay];
  const dim = weather === 'clear' ? 1 : weather === 'rain' ? 0.55 : 0.7;
  return (
    <>
      <color attach="background" args={[p.fog]} />
      <fogExp2 attach="fog" args={[p.fog, WEATHER_FOG[weather]]} />
      <hemisphereLight args={[p.sky, '#4a3f2f', p.ambient * dim]} />
      <directionalLight
        position={p.sunPos}
        color={p.sunColor}
        intensity={p.sunIntensity * dim}
        castShadow
        shadow-mapSize={SHADOW_MAP_SIZE}
        shadow-bias={-0.0005}
        shadow-camera-left={-200}
        shadow-camera-right={200}
        shadow-camera-top={200}
        shadow-camera-bottom={-200}
        shadow-camera-far={500}
      />
      {p.night && <Stars />}
    </>
  );
});

const Stars = memo(function Stars() {
  const pts = useMemo(() => {
    const arr = new Float32Array(600 * 3);
    const r = seededRandom(12345);
    for (let i = 0; i < 600; i++) {
      const a = r() * Math.PI * 2;
      const e = r() * 1.2 + 0.1;
      const d = 400;
      arr[i * 3] = Math.cos(a) * Math.cos(e) * d;
      arr[i * 3 + 1] = Math.sin(e) * d;
      arr[i * 3 + 2] = Math.sin(a) * Math.cos(e) * d;
    }
    return arr;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pts} count={600} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={1.5} sizeAttenuation={false} />
    </points>
  );
});
