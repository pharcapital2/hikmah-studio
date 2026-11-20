import { memo, useRef } from 'react';
import type * as THREE from 'three';
import { lightsOn, useWorldAnimation, type TimeOfDay, type Weather } from '../../shared';
import { busStops, lots, SIDEWALK_H, type Lot } from '../layout';
import { CITY_PALETTE } from '../palette';

interface Props {
  timeOfDay: TimeOfDay;
  weather: Weather;
  time?: number;
}

const FLAG_INIT_POS: [number, number, number] = [1.1, 9.8, 0];
const TRAIN_INIT_POS: [number, number, number] = [0, 2.2, 21];

export const Landmarks = memo(function Landmarks({ timeOfDay, weather, time }: Props) {
  const glow = lightsOn(timeOfDay, weather);
  const byKind = (k: Lot['kind']) => lots.find((l) => l.kind === k);

  const mall = byKind('mall');
  const hospital = byKind('hospital');
  const school = byKind('school');
  const mosque = byKind('mosque');
  const station = byKind('station');

  return (
    <group name="city-landmarks">
      {mall && <CityMall lot={mall} glow={glow} />}
      {hospital && <CityHospital lot={hospital} glow={glow} />}
      {school && <CitySchool lot={school} glow={glow} time={time} />}
      {mosque && <GrandMosque lot={mosque} glow={glow} />}
      {station && <TrainStation lot={station} glow={glow} time={time} />}
      {busStops.map((b) => (
        <BusHalte key={b.id} x={b.x} z={b.z} rotY={b.rotY} glow={glow} />
      ))}
    </group>
  );
});

const CityMall = memo(function CityMall({ lot, glow }: { lot: Lot; glow: boolean }) {
  const y0 = SIDEWALK_H;
  return (
    <group position={[lot.x, y0, lot.z]}>
      {/* Main podium */}
      <mesh position={[0, 10, 0]} castShadow receiveShadow>
        <boxGeometry args={[lot.w, 20, lot.d]} />
        <meshStandardMaterial color={CITY_PALETTE.mallWall} roughness={0.65} />
      </mesh>
      {/* Upper atrium box */}
      <mesh position={[0, 23, -2]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.68, 6, lot.d * 0.65]} />
        <meshStandardMaterial color="#cfd8e3" roughness={0.55} />
      </mesh>
      {/* Glass facade front (+z) */}
      <mesh position={[0, 10, lot.d / 2 + 0.12]}>
        <boxGeometry args={[lot.w * 0.6, 16, 0.2]} />
        <meshStandardMaterial
          color={glow ? '#9be0ff' : CITY_PALETTE.mallGlass}
          emissive={glow ? '#4eb8f0' : '#000000'}
          emissiveIntensity={glow ? 0.85 : 0}
          roughness={0.2}
          metalness={0.35}
        />
      </mesh>
      {/* Entrance canopy */}
      <mesh position={[0, 4.2, lot.d / 2 + 3.2]} castShadow>
        <boxGeometry args={[18, 0.5, 6.4]} />
        <meshStandardMaterial color="#2b4c7e" roughness={0.5} />
      </mesh>
      {/* Neon fascia strip & mall sign */}
      <mesh position={[0, 18.6, lot.d / 2 + 0.35]}>
        <boxGeometry args={[28, 1.8, 0.3]} />
        <meshStandardMaterial
          color="#ff4d8d"
          emissive={glow ? '#ff4d8d' : '#551830'}
          emissiveIntensity={glow ? 2.2 : 0.2}
        />
      </mesh>
      <mesh position={[0, 15.2, lot.d / 2 + 0.35]}>
        <boxGeometry args={[lot.w * 0.92, 0.35, 0.25]} />
        <meshStandardMaterial
          color="#38e8ff"
          emissive={glow ? '#38e8ff' : '#10404a'}
          emissiveIntensity={glow ? 1.8 : 0.1}
        />
      </mesh>
    </group>
  );
});

const CityHospital = memo(function CityHospital({ lot, glow }: { lot: Lot; glow: boolean }) {
  const y0 = SIDEWALK_H;
  return (
    <group position={[lot.x, y0, lot.z]}>
      {/* Main medical tower */}
      <mesh position={[0, 16, -4]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.78, 32, lot.d * 0.55]} />
        <meshStandardMaterial color={CITY_PALETTE.hospitalWall} roughness={0.7} />
      </mesh>
      {/* Lower ER wing */}
      <mesh position={[0, 5, 11]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.9, 10, 18]} />
        <meshStandardMaterial color="#e8eef5" roughness={0.72} />
      </mesh>
      {/* ER ambulance canopy */}
      <mesh position={[-10, 4.2, 22.5]} castShadow>
        <boxGeometry args={[14, 0.5, 6]} />
        <meshStandardMaterial color="#c93636" roughness={0.55} />
      </mesh>
      {/* Window bands */}
      {[13, 18, 23, 28].map((wy) => (
        <mesh key={wy} position={[0, wy, -4 + lot.d * 0.275 + 0.08]}>
          <boxGeometry args={[lot.w * 0.68, 2.0, 0.12]} />
          <meshStandardMaterial
            color={glow ? '#d9f4ff' : CITY_PALETTE.glassDay}
            emissive={glow ? '#82d8ff' : '#000000'}
            emissiveIntensity={glow ? 1.1 : 0}
          />
        </mesh>
      ))}
      {/* Red Cross emblem on facade */}
      <group position={[12, 25, -4 + lot.d * 0.275 + 0.25]}>
        <mesh>
          <boxGeometry args={[1.6, 5.2, 0.25]} />
          <meshStandardMaterial
            color={CITY_PALETTE.hospitalAccent}
            emissive={glow ? '#ff3b3b' : '#000000'}
            emissiveIntensity={glow ? 1.8 : 0}
          />
        </mesh>
        <mesh>
          <boxGeometry args={[5.2, 1.6, 0.25]} />
          <meshStandardMaterial
            color={CITY_PALETTE.hospitalAccent}
            emissive={glow ? '#ff3b3b' : '#000000'}
            emissiveIntensity={glow ? 1.8 : 0}
          />
        </mesh>
      </group>
      {/* Rooftop Helipad */}
      <group position={[0, 32.08, -4]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[5.5, 6.2, 24]} />
          <meshStandardMaterial color="#f5c542" />
        </mesh>
        <mesh position={[-1.6, 0.02, 0]}>
          <boxGeometry args={[0.7, 0.04, 4.5]} />
          <meshStandardMaterial color="#f5c542" />
        </mesh>
        <mesh position={[1.6, 0.02, 0]}>
          <boxGeometry args={[0.7, 0.04, 4.5]} />
          <meshStandardMaterial color="#f5c542" />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[3.2, 0.04, 0.7]} />
          <meshStandardMaterial color="#f5c542" />
        </mesh>
      </group>
    </group>
  );
});

const CitySchool = memo(function CitySchool({ lot, glow, time }: { lot: Lot; glow: boolean; time?: number }) {
  const y0 = SIDEWALK_H;
  const flagRef = useRef<THREE.Group>(null);
  useWorldAnimation(time, (t) => {
    if (flagRef.current) {
      flagRef.current.rotation.y = Math.sin(t * 3.5) * 0.08;
    }
  });
  return (
    <group position={[lot.x, y0, lot.z]}>
      {/* Main building + 2 side wings (U-shape opening toward +z courtyard) */}
      <mesh position={[0, 4.5, -14]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.88, 9, 12]} />
        <meshStandardMaterial color={CITY_PALETTE.schoolWall} roughness={0.85} />
      </mesh>
      <mesh position={[0, 10.2, -14]} castShadow>
        <boxGeometry args={[lot.w * 0.92, 2.4, 13.5]} />
        <meshStandardMaterial color={CITY_PALETTE.schoolRoof} roughness={0.85} />
      </mesh>
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[s * (lot.w * 0.34), 0, 4]}>
          <mesh position={[0, 4, 0]} castShadow receiveShadow>
            <boxGeometry args={[12, 8, 26]} />
            <meshStandardMaterial color={CITY_PALETTE.schoolWall} roughness={0.85} />
          </mesh>
          <mesh position={[0, 9.1, 0]} castShadow>
            <boxGeometry args={[13.2, 2.2, 27]} />
            <meshStandardMaterial color={CITY_PALETTE.schoolRoof} roughness={0.85} />
          </mesh>
        </group>
      ))}
      {/* Windows */}
      {[-16, -8, 0, 8, 16].map((wx) => (
        <mesh key={wx} position={[wx, 5.5, -7.9]}>
          <boxGeometry args={[3.6, 2.2, 0.12]} />
          <meshStandardMaterial
            color={glow ? '#ffe299' : '#658ca8'}
            emissive={glow ? '#ffc455' : '#000000'}
            emissiveIntensity={glow ? 1.0 : 0}
          />
        </mesh>
      ))}
      {/* Courtyard basketball court */}
      <mesh position={[0, 0.04, 6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[26, 16]} />
        <meshStandardMaterial color="#48755a" roughness={0.9} />
      </mesh>
      {/* Flagpole + Red-White flag */}
      <group position={[0, 0, 18]}>
        <mesh position={[0, 5.5, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.11, 11, 8]} />
          <meshStandardMaterial color="#d8dde6" metalness={0.5} roughness={0.4} />
        </mesh>
        <group ref={flagRef} position={FLAG_INIT_POS}>
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[2.1, 0.7, 0.04]} />
            <meshStandardMaterial color="#d92b2b" />
          </mesh>
          <mesh position={[0, -0.35, 0]}>
            <boxGeometry args={[2.1, 0.7, 0.04]} />
            <meshStandardMaterial color="#f5f5f5" />
          </mesh>
        </group>
      </group>
    </group>
  );
});

const GrandMosque = memo(function GrandMosque({ lot, glow }: { lot: Lot; glow: boolean }) {
  const y0 = SIDEWALK_H;
  const mx = lot.w * 0.38;
  const mz = lot.d * 0.36;
  return (
    <group position={[lot.x, y0, lot.z]}>
      {/* Marble stepped plaza */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[lot.w * 0.94, 0.8, lot.d * 0.94]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.75} />
      </mesh>
      {/* Main prayer hall */}
      <mesh position={[0, 7.4, -2]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.62, 13, lot.d * 0.56]} />
        <meshStandardMaterial color={CITY_PALETTE.mosqueWall} roughness={0.7} />
      </mesh>
      {/* Grand central dome + drum + golden finial */}
      <mesh position={[0, 15.2, -2]} castShadow>
        <cylinderGeometry args={[10.5, 11, 2.6, 24]} />
        <meshStandardMaterial color="#e5dec9" roughness={0.7} />
      </mesh>
      <mesh position={[0, 16.5, -2]} castShadow>
        <sphereGeometry args={[10.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial
          color={CITY_PALETTE.mosqueDome}
          emissive={glow ? '#14584a' : '#000000'}
          emissiveIntensity={glow ? 0.65 : 0}
          roughness={0.4}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 27.6, -2]}>
        <cylinderGeometry args={[0.15, 0.35, 3.2, 8]} />
        <meshStandardMaterial color={CITY_PALETTE.mosqueGold} metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Arched glowing windows on prayer hall */}
      {[-12, -4, 4, 12].map((wx) => (
        <mesh key={wx} position={[wx, 7.2, -2 + lot.d * 0.28 + 0.1]}>
          <boxGeometry args={[3.2, 6.5, 0.15]} />
          <meshStandardMaterial
            color={glow ? '#ffe094' : '#4a6b78'}
            emissive={glow ? '#ffbe4d' : '#000000'}
            emissiveIntensity={glow ? 1.4 : 0}
          />
        </mesh>
      ))}
      {/* 4 corner minarets */}
      {[
        [-mx, -mz],
        [mx, -mz],
        [-mx, mz],
        [mx, mz],
      ].map(([x, z], idx) => (
        <group key={idx} position={[x, 0.8, z]}>
          <mesh position={[0, 13, 0]} castShadow>
            <cylinderGeometry args={[1.4, 1.9, 26, 12]} />
            <meshStandardMaterial color={CITY_PALETTE.mosqueWall} roughness={0.75} />
          </mesh>
          <mesh position={[0, 22, 0]}>
            <cylinderGeometry args={[2.1, 2.1, 0.6, 12]} />
            <meshStandardMaterial color={CITY_PALETTE.mosqueGold} metalness={0.5} roughness={0.35} />
          </mesh>
          <mesh position={[0, 26.8, 0]}>
            <sphereGeometry args={[1.7, 14, 12]} />
            <meshStandardMaterial color={CITY_PALETTE.mosqueDome} roughness={0.4} />
          </mesh>
          <mesh position={[0, 29.2, 0]}>
            <cylinderGeometry args={[0.08, 0.2, 2.2, 8]} />
            <meshStandardMaterial color={CITY_PALETTE.mosqueGold} metalness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

const TrainStation = memo(function TrainStation({ lot, glow, time }: { lot: Lot; glow: boolean; time?: number }) {
  const y0 = SIDEWALK_H;
  const trainRef = useRef<THREE.Group>(null);
  // Commuter train oscillates smoothly back and forth along the station tracks
  useWorldAnimation(time, (t) => {
    if (trainRef.current) {
      trainRef.current.position.x = Math.sin(t * 0.22) * 14;
    }
  });
  return (
    <group position={[lot.x, y0, lot.z]}>
      {/* Main station concourse facing -z (toward road z = 100) */}
      <mesh position={[0, 5.5, -6]} castShadow receiveShadow>
        <boxGeometry args={[lot.w * 0.85, 11, 20]} />
        <meshStandardMaterial color={CITY_PALETTE.stationWall} roughness={0.78} />
      </mesh>
      {/* Vaulted curved roof */}
      <mesh position={[0, 11.2, -6]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[7.5, 7.5, lot.w * 0.88, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={CITY_PALETTE.stationRoof} roughness={0.6} />
      </mesh>
      {/* Clock tower */}
      <mesh position={[-18, 11, -14]} castShadow>
        <boxGeometry args={[5, 22, 5]} />
        <meshStandardMaterial color="#cbbba8" roughness={0.75} />
      </mesh>
      <mesh position={[-18, 18.5, -11.4]}>
        <cylinderGeometry args={[1.4, 1.4, 0.2, 16]} />
        <meshStandardMaterial
          color="#fff9e8"
          emissive={glow ? '#ffe5a3' : '#000000'}
          emissiveIntensity={glow ? 1.1 : 0}
        />
      </mesh>
      {/* Platform canopy */}
      <mesh position={[0, 5.2, 12]} castShadow>
        <boxGeometry args={[lot.w * 0.92, 0.4, 8]} />
        <meshStandardMaterial color="#586c82" roughness={0.55} />
      </mesh>
      {/* Railway track bed + twin steel rails */}
      <mesh position={[0, 0.15, 21]} receiveShadow>
        <boxGeometry args={[lot.w * 0.96, 0.3, 6]} />
        <meshStandardMaterial color="#59544f" roughness={0.95} />
      </mesh>
      {[-0.9, 0.9].map((rz) => (
        <mesh key={rz} position={[0, 0.38, 21 + rz]}>
          <boxGeometry args={[lot.w * 0.95, 0.16, 0.14]} />
          <meshStandardMaterial color="#8c96a4" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* Stylized Commuter Train (KRL) */}
      <group ref={trainRef} position={TRAIN_INIT_POS}>
        {[-11, 0, 11].map((cx) => (
          <group key={cx} position={[cx, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[10.2, 3.2, 2.8]} />
              <meshStandardMaterial color="#e8eef5" roughness={0.45} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[10.25, 0.55, 2.84]} />
              <meshStandardMaterial color="#d93b3b" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <boxGeometry args={[8.8, 0.9, 2.86]} />
              <meshStandardMaterial
                color={glow ? '#ffe6a3' : '#2a3d4f'}
                emissive={glow ? '#ffd275' : '#000000'}
                emissiveIntensity={glow ? 1.2 : 0}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});

const BusHalte = memo(function BusHalte({ x, z, rotY, glow }: { x: number; z: number; rotY: number; glow: boolean }) {
  return (
    <group position={[x, SIDEWALK_H, z]} rotation={[0, rotY, 0]}>
      {/* Base platform */}
      <mesh position={[0, 0.12, 0]} receiveShadow>
        <boxGeometry args={[8, 0.24, 2.4]} />
        <meshStandardMaterial color="#7d8590" roughness={0.85} />
      </mesh>
      {/* Back glass panel */}
      <mesh position={[0, 1.4, -0.9]}>
        <boxGeometry args={[7.4, 2.4, 0.1]} />
        <meshStandardMaterial color="#7bb4d4" transparent opacity={0.55} roughness={0.2} />
      </mesh>
      {/* Roof canopy */}
      <mesh position={[0, 2.75, 0.1]} castShadow>
        <boxGeometry args={[8.2, 0.18, 2.6]} />
        <meshStandardMaterial color="#2c4a6e" roughness={0.5} />
      </mesh>
      {/* Bench */}
      <mesh position={[-0.8, 0.6, -0.35]} castShadow>
        <boxGeometry args={[4.4, 0.18, 0.65]} />
        <meshStandardMaterial color="#c47d3b" roughness={0.75} />
      </mesh>
      {/* Illuminated route board */}
      <mesh position={[2.8, 1.5, -0.7]}>
        <boxGeometry args={[1.1, 1.6, 0.18]} />
        <meshStandardMaterial
          color="#eef6ff"
          emissive={glow ? '#78d5ff' : '#000000'}
          emissiveIntensity={glow ? 1.6 : 0}
        />
      </mesh>
    </group>
  );
});
