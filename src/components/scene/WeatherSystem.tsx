import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { WeatherConfig } from '../../types/story';

interface WeatherSystemProps {
  weather: WeatherConfig;
  isPlaying: boolean;
}

const RAIN_COUNT = 540;
const MUD_COUNT = 220;

const PRESET_SKY_COLORS: Record<WeatherConfig['preset'], string> = {
  clear: '#2563eb',
  overcast: '#64748b',
  rain: '#1e293b',
  storm: '#0f172a',
  golden: '#ea580c',
};

const PRESET_LIGHT_COLORS: Record<WeatherConfig['preset'], string> = {
  clear: '#fffbeb',
  overcast: '#cbd5e1',
  rain: '#94a3b8',
  storm: '#64748b',
  golden: '#fdba74',
};

export const WeatherSystem: React.FC<WeatherSystemProps> = ({
  weather,
  isPlaying,
}) => {
  const { scene } = useThree();
  const fogRef = useRef<THREE.FogExp2 | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambLightRef = useRef<THREE.AmbientLight | null>(null);
  const rainRef = useRef<THREE.InstancedMesh | null>(null);
  const mudRef = useRef<THREE.InstancedMesh | null>(null);
  const foamRef = useRef<THREE.InstancedMesh | null>(null);
  const mistGroupRef = useRef<THREE.Group | null>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const targetBgColor = useMemo(() => new THREE.Color('#2563eb'), []);
  const targetLightColor = useMemo(() => new THREE.Color('#fffbeb'), []);

  // Pre-seed deterministic rain drops
  const rainData = useMemo(() => {
    const items: Array<{ x: number; y: number; z: number; speed: number }> = [];
    for (let i = 0; i < RAIN_COUNT; i++) {
      items.push({
        x: ((i * 73) % 20) - 10,
        y: ((i * 37) % 14) + 1,
        z: ((i * 53) % 24) - 14,
        speed: 15 + (i % 7) * 1.8,
      });
    }
    return items;
  }, []);

  // Pre-seed mudflow particles streaming down road from z = -18 toward boulder at (-0.95, -2.2)
  const mudData = useMemo(() => {
    const items: Array<{
      z: number;
      laneBias: number;
      speedFactor: number;
      size: number;
      phase: number;
    }> = [];
    for (let i = 0; i < MUD_COUNT; i++) {
      const sign = i % 2 === 0 ? -1 : 1;
      const spread = ((i * 19) % 100) / 100;
      items.push({
        z: -18 + ((i * 25) / MUD_COUNT),
        laneBias: sign * (0.1 + spread * 1.35),
        speedFactor: 0.85 + (i % 5) * 0.08,
        size: 0.3 + (i % 4) * 0.11,
        phase: (i * 0.7) % (Math.PI * 2),
      });
    }
    return items;
  }, []);

  const rainGeo = useMemo(() => new THREE.BoxGeometry(0.02, 0.65, 0.02), []);
  const rainMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#cbd5e1',
        transparent: true,
        opacity: 0.55,
      }),
    []
  );

  const mudGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 0), []);
  const mudMat = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: '#78350f',
      }),
    []
  );

  const foamGeo = useMemo(() => new THREE.IcosahedronGeometry(0.32, 0), []);
  const foamMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e2e8f0',
        transparent: true,
        opacity: 0.78,
      }),
    []
  );

  useEffect(() => {
    return () => {
      rainGeo.dispose();
      rainMat.dispose();
      mudGeo.dispose();
      mudMat.dispose();
      foamGeo.dispose();
      foamMat.dispose();
    };
  }, [rainGeo, rainMat, mudGeo, mudMat, foamGeo, foamMat]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const activeDt = isPlaying ? dt : dt * 0.15;

    // 1. Sky Background & Fog
    targetBgColor.set(PRESET_SKY_COLORS[weather.preset]);
    if (scene.background instanceof THREE.Color) {
      scene.background.lerp(targetBgColor, Math.min(1, dt * 4.0));
    } else {
      scene.background = targetBgColor.clone();
    }

    if (fogRef.current) {
      fogRef.current.color.lerp(targetBgColor, Math.min(1, dt * 4.0));
      fogRef.current.density = THREE.MathUtils.damp(
        fogRef.current.density,
        weather.fogDensity,
        4.0,
        dt
      );
    }

    // 2. Lighting + Lightning Flash
    targetLightColor.set(PRESET_LIGHT_COLORS[weather.preset]);
    if (dirLightRef.current) {
      dirLightRef.current.color.lerp(targetLightColor, Math.min(1, dt * 4.0));
      let targetIntensity =
        weather.preset === 'storm' || weather.preset === 'rain'
          ? 0.75
          : weather.preset === 'golden'
            ? 2.2
            : 1.75;

      if (weather.lightningFlash && isPlaying) {
        const pulse = Math.sin(state.clock.elapsedTime * 11.3);
        if (pulse > 0.97) {
          targetIntensity = 4.0;
        }
      }
      dirLightRef.current.intensity = THREE.MathUtils.damp(
        dirLightRef.current.intensity,
        targetIntensity,
        8.0,
        dt
      );
    }

    if (ambLightRef.current) {
      const targetAmb =
        weather.preset === 'storm' || weather.preset === 'rain' ? 0.45 : 0.85;
      ambLightRef.current.intensity = THREE.MathUtils.damp(
        ambLightRef.current.intensity,
        targetAmb,
        4.0,
        dt
      );
    }

    // 3. Rain Particle Update
    if (rainRef.current) {
      const visibleDrops = Math.floor(weather.rainIntensity * RAIN_COUNT);
      rainRef.current.count = visibleDrops;
      const windX = weather.windStrength * 0.25;

      for (let i = 0; i < visibleDrops; i++) {
        const drop = rainData[i];
        drop.y -= drop.speed * activeDt;
        drop.x += windX * 4 * activeDt;
        if (drop.y < 0.2) {
          drop.y = 14;
          drop.x = ((i * 73) % 20) - 10;
        }
        dummy.position.set(drop.x, drop.y, drop.z);
        dummy.rotation.set(0, 0, -weather.windStrength * 0.16);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rainRef.current.setMatrixAt(i, dummy.matrix);
      }
      rainRef.current.instanceMatrix.needsUpdate = true;
    }

    // 4. Drifting Mist
    if (mistGroupRef.current) {
      mistGroupRef.current.children.forEach((child, idx) => {
        child.position.x =
          Math.sin(state.clock.elapsedTime * 0.25 + idx * 1.9) * 3.0;
      });
    }

    // 5. Mudslide & Boulder Bifurcation around (-0.95, -2.2)
    if (mudRef.current && foamRef.current) {
      const active = weather.mudflowActive;
      mudRef.current.visible = active;
      foamRef.current.visible = active;

      if (active) {
        const flowSpeed = Math.max(4.5, weather.mudflowSpeed * 8.0);
        let foamIdx = 0;

        for (let i = 0; i < MUD_COUNT; i++) {
          const p = mudData[i];
          p.z += flowSpeed * p.speedFactor * activeDt;
          if (p.z > 6.5) {
            p.z = -18.0;
          }

          // Split around the giant boulder centered near x = -0.95, z = -2.2
          let xPos = p.laneBias;
          if (p.z > -4.0) {
            const splitProgress = Math.min(1, Math.max(0, (p.z + 4.0) / 2.2));
            const easedSplit =
              splitProgress * splitProgress * (3 - 2 * splitProgress);
            const goesLeft = p.laneBias < -0.5;
            const channelTarget = goesLeft
              ? -2.1 - Math.abs(p.laneBias) * 0.3
              : 1.15 + Math.abs(p.laneBias) * 0.65;
            xPos = THREE.MathUtils.lerp(p.laneBias, channelTarget, easedSplit);
          }

          const yWave =
            0.22 +
            Math.abs(Math.sin(state.clock.elapsedTime * 7 + p.phase)) * 0.22;

          dummy.position.set(xPos, yWave, p.z);
          dummy.rotation.set(
            state.clock.elapsedTime * 2 + p.phase,
            p.phase,
            0
          );
          dummy.scale.set(p.size * 1.35, p.size * 0.72, p.size * 1.6);
          dummy.updateMatrix();
          mudRef.current.setMatrixAt(i, dummy.matrix);

          // Impact splash foam right at the rock bow (-4.0 <= z <= -1.2)
          if (foamIdx < 48 && p.z >= -4.0 && p.z <= -1.2) {
            dummy.position.set(
              xPos,
              0.55 + Math.sin(state.clock.elapsedTime * 12 + i) * 0.35,
              p.z
            );
            dummy.scale.setScalar(0.9 + (i % 3) * 0.35);
            dummy.updateMatrix();
            foamRef.current.setMatrixAt(foamIdx, dummy.matrix);
            foamIdx++;
          }
        }
        foamRef.current.count = foamIdx;
        mudRef.current.instanceMatrix.needsUpdate = true;
        foamRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group name="weather-system">
      <fogExp2 ref={fogRef} attach="fog" args={['#2563eb', 0.012]} />
      <ambientLight ref={ambLightRef} intensity={0.85} />
      <hemisphereLight args={['#e0f2fe', '#3f6212', 0.45]} />
      <directionalLight
        ref={dirLightRef}
        position={[10, 16, 10]}
        intensity={1.75}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={55}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0005}
      />

      {/* Rain Streaks */}
      <instancedMesh
        ref={rainRef}
        args={[rainGeo, rainMat, RAIN_COUNT]}
        frustumCulled={false}
      />

      {/* Thin Mist Planes */}
      <group ref={mistGroupRef} visible={weather.fogDensity > 0.018}>
        {[-12, -5, 1].map((z, idx) => (
          <mesh
            key={`mist-${idx}`}
            position={[0, 0.9 + idx * 0.35, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[18, 5]} />
            <meshBasicMaterial
              color="#cbd5e1"
              transparent
              opacity={Math.min(0.22, weather.fogDensity * 4.5)}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* Splitting Mudslide Wave */}
      <instancedMesh
        ref={mudRef}
        args={[mudGeo, mudMat, MUD_COUNT]}
        castShadow
        receiveShadow
        frustumCulled={false}
      />

      {/* Splash Foam at Rock Impact */}
      <instancedMesh
        ref={foamRef}
        args={[foamGeo, foamMat, 48]}
        frustumCulled={false}
      />
    </group>
  );
};
