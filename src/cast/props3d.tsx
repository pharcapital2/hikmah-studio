import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getToonGradientTexture } from '../utils/toonGradient';

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: '#111827',
  side: THREE.BackSide,
});

// Geometries yang dapat dipakai ulang antar-frame tanpa alokasi baru
const UNIT_SPHERE_GEO = new THREE.SphereGeometry(1, 14, 12);
const UNIT_BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

function createHorseBarrelGeometry(): THREE.LatheGeometry {
  // Profil kapsul terpahat memanjang sepanjang Y (akan diputar ke sumbu Z)
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, -0.54),
    new THREE.Vector2(0.08, -0.52),
    new THREE.Vector2(0.15, -0.44),
    new THREE.Vector2(0.185, -0.28),
    new THREE.Vector2(0.175, -0.05),
    new THREE.Vector2(0.18, 0.2),
    new THREE.Vector2(0.19, 0.38),
    new THREE.Vector2(0.145, 0.49),
    new THREE.Vector2(0.07, 0.54),
    new THREE.Vector2(0.0, 0.55),
  ];
  return new THREE.LatheGeometry(pts, 18);
}

function createClayCupGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.032, 0.002),
    new THREE.Vector2(0.044, 0.035),
    new THREE.Vector2(0.047, 0.08),
    new THREE.Vector2(0.051, 0.095),
    new THREE.Vector2(0.044, 0.095),
  ];
  return new THREE.LatheGeometry(pts, 16);
}

function createBasketGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.095, 0.004),
    new THREE.Vector2(0.145, 0.14),
    new THREE.Vector2(0.165, 0.22),
    new THREE.Vector2(0.152, 0.225),
    new THREE.Vector2(0.132, 0.14),
    new THREE.Vector2(0.085, 0.02),
    new THREE.Vector2(0.0, 0.018),
  ];
  return new THREE.LatheGeometry(pts, 16);
}

const HORSE_BARREL_GEO = createHorseBarrelGeometry();
const CLAY_CUP_GEO = createClayCupGeometry();
const BASKET_GEO = createBasketGeometry();

interface ClodSpec {
  angle: number;
  speed: number;
  vy: number;
  size: number;
  color: string;
}

const SOIL_CLODS: ClodSpec[] = [
  { angle: 0.2, speed: 0.26, vy: 0.52, size: 0.026, color: '#78350f' },
  { angle: 1.05, speed: 0.32, vy: 0.62, size: 0.022, color: '#92400e' },
  { angle: 1.85, speed: 0.28, vy: 0.48, size: 0.028, color: '#5c3a21' },
  { angle: 2.65, speed: 0.34, vy: 0.58, size: 0.02, color: '#78350f' },
  { angle: 3.45, speed: 0.25, vy: 0.45, size: 0.024, color: '#92400e' },
  { angle: 4.3, speed: 0.3, vy: 0.55, size: 0.021, color: '#5c3a21' },
  { angle: 5.15, speed: 0.29, vy: 0.5, size: 0.025, color: '#78350f' },
  { angle: 5.85, speed: 0.22, vy: 0.42, size: 0.019, color: '#92400e' },
];

/**
 * Cangkul petani 3D bergaya toon dengan outline tinta & partikel tanah deterministik.
 * Dipasang pada grup tangan kanan karakter saat aksi `'hoe'`.
 */
export const HoeProp: React.FC<{ impact: number }> = ({ impact }) => {
  const grad = useMemo(() => getToonGradientTexture(), []);
  const clodProgress = impact > 0.15 ? 1 - impact : 0;
  const clodScale = impact > 0.15 ? Math.sin(Math.min(1, (impact - 0.15) / 0.85) * Math.PI) : 0;

  return (
    <group rotation={[0.52, 0, -0.18]}>
      {/* Gagang kayu */}
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[0.02, 0.022, 0.92, 10]} />
        <meshToonMaterial color="#78350f" gradientMap={grad} />
      </mesh>
      <mesh position={[0, -0.26, 0]} scale={[1.28, 1.015, 1.28]} material={OUTLINE_MAT}>
        <cylinderGeometry args={[0.02, 0.022, 0.92, 10]} />
      </mesh>

      {/* Cincin pengunci besi */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.032, 0.032, 0.06, 10]} />
        <meshToonMaterial color="#64748b" gradientMap={grad} />
      </mesh>
      <mesh position={[0, -0.7, 0]} scale={[1.18, 1.15, 1.18]} material={OUTLINE_MAT}>
        <cylinderGeometry args={[0.032, 0.032, 0.06, 10]} />
      </mesh>

      {/* Mata cangkul baja melengkung */}
      <group position={[0, -0.72, -0.02]} rotation={[0.35, 0, 0]}>
        <mesh position={[0, -0.02, -0.1]}>
          <boxGeometry args={[0.16, 0.022, 0.22]} />
          <meshToonMaterial color="#94a3b8" gradientMap={grad} />
        </mesh>
        <mesh position={[0, -0.02, -0.1]} scale={[1.08, 1.45, 1.07]} material={OUTLINE_MAT}>
          <boxGeometry args={[0.16, 0.022, 0.22]} />
        </mesh>
        {/* Sisi tajam mengkilap */}
        <mesh position={[0, -0.024, -0.205]}>
          <boxGeometry args={[0.164, 0.016, 0.035]} />
          <meshToonMaterial color="#e2e8f0" gradientMap={grad} />
        </mesh>
      </group>

      {/* Percikan gumpalan tanah deterministik saat impact > 0.15 */}
      {impact > 0.15 && (
        <group position={[0, -0.76, -0.1]}>
          {SOIL_CLODS.map((clod, idx) => {
            const px = Math.cos(clod.angle) * clod.speed * clodProgress;
            const pz = Math.sin(clod.angle) * clod.speed * clodProgress;
            const py = clod.vy * clodProgress - 1.35 * clodProgress * clodProgress + 0.02;
            const sc = clod.size * (0.4 + 0.8 * clodScale);
            return (
              <mesh
                key={idx}
                geometry={UNIT_BOX_GEO}
                position={[px, Math.max(-0.04, py), pz]}
                rotation={[clodProgress * 5 + idx, clodProgress * 3, idx]}
                scale={[sc * 1.2, sc * 0.9, sc]}
              >
                <meshToonMaterial color={clod.color} gradientMap={grad} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

interface HorseLegProps {
  position: [number, number, number];
  phase: number;
  st: number;
  isHind?: boolean;
  grad: THREE.DataTexture;
}

const HorseLeg: React.FC<HorseLegProps> = ({ position, phase, st, isHind = false, grad }) => {
  const swing = Math.sin(st + phase) * 0.5;
  const bendRaw = Math.max(0, Math.sin(st + phase - 0.65)) * 0.62;
  const kneeRot = isHind ? -bendRaw * 0.75 : bendRaw;

  return (
    <group position={position} rotation={[swing, 0, 0]}>
      {/* Paha / lengan atas kuda */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.056, 0.042, 0.3, 10]} />
        <meshToonMaterial color="#854d0e" gradientMap={grad} />
      </mesh>
      <mesh position={[0, -0.15, 0]} scale={[1.14, 1.03, 1.14]} material={OUTLINE_MAT}>
        <cylinderGeometry args={[0.056, 0.042, 0.3, 10]} />
      </mesh>

      {/* Sendi lutut/hock */}
      <mesh geometry={UNIT_SPHERE_GEO} position={[0, -0.3, 0]} scale={0.043}>
        <meshToonMaterial color="#78350f" gradientMap={grad} />
      </mesh>

      {/* Betis bawah + kuku */}
      <group position={[0, -0.3, 0]} rotation={[kneeRot, 0, 0]}>
        <mesh position={[0, -0.135, 0]}>
          <cylinderGeometry args={[0.038, 0.032, 0.27, 10]} />
          <meshToonMaterial color="#713f12" gradientMap={grad} />
        </mesh>
        <mesh position={[0, -0.135, 0]} scale={[1.16, 1.03, 1.16]} material={OUTLINE_MAT}>
          <cylinderGeometry args={[0.038, 0.032, 0.27, 10]} />
        </mesh>

        {/* Kuku hitam kuda */}
        <mesh position={[0, -0.295, 0.008]}>
          <cylinderGeometry args={[0.036, 0.045, 0.05, 10]} />
          <meshToonMaterial color="#1c1917" gradientMap={grad} />
        </mesh>
        <mesh position={[0, -0.295, 0.008]} scale={[1.14, 1.1, 1.14]} material={OUTLINE_MAT}>
          <cylinderGeometry args={[0.036, 0.045, 0.05, 10]} />
        </mesh>
      </group>
    </group>
  );
};

/**
 * Kuda tunggangan bergaya Hikmah Toon dengan garis tinta, pelana hijau-emas,
 * surai & ekor berkibar, sanggurdi, tali kekang, dan 4 kaki 2-segmen beranimasi trot.
 * Permukaan atas sadel berada tepat pada y = 0.86m agar penunggang duduk pas tanpa klip.
 */
export const MountHorseProp: React.FC<{ time: number; speed?: number }> = ({
  time,
  speed = 1,
}) => {
  const grad = useMemo(() => getToonGradientTexture(), []);
  const st = Math.max(0, time) * Math.max(0.1, speed) * 6.5;
  const trot = Math.abs(Math.sin(st)) * 0.045;
  const legBob = trot * 0.25;

  return (
    <group>
      {/* Badan, leher, kepala, pelana, dan tali kekang memantul seirama penunggang */}
      <group position={[0, trot, 0]}>
        {/* Badan kuda terpahat (center y=0.68, top=0.84, lebar samping ±0.18) */}
        <group position={[0, 0.68, 0.02]} rotation={[Math.PI / 2, 0, 0]} scale={[0.95, 1, 0.88]}>
          <mesh geometry={HORSE_BARREL_GEO}>
            <meshToonMaterial color="#854d0e" gradientMap={grad} />
          </mesh>
          <mesh geometry={HORSE_BARREL_GEO} scale={[1.05, 1.03, 1.05]} material={OUTLINE_MAT} />
        </group>

        {/* Kain pelana hijau berlis emas memeluk punggung kuda */}
        <mesh position={[0, 0.68, -0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.196, 0.24, 0.17]}>
          <cylinderGeometry args={[1, 1, 1.8, 16, 1, false, -Math.PI * 0.55, Math.PI * 1.1]} />
          <meshToonMaterial color="#15803d" gradientMap={grad} />
        </mesh>
        <mesh position={[0, 0.68, -0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.199, 0.205, 0.173]}>
          <cylinderGeometry args={[1, 1, 1.8, 16, 1, false, -Math.PI * 0.5, Math.PI]} />
          <meshToonMaterial color="#facc15" gradientMap={grad} />
        </mesh>

        {/* Sadel kulit (permukaan duduk tepat pada y = 0.86) */}
        <group position={[0, 0.835, -0.02]}>
          <mesh scale={[0.165, 0.055, 0.18]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshToonMaterial color="#451a03" gradientMap={grad} />
          </mesh>
          <mesh scale={[1.08, 1.15, 1.08]} material={OUTLINE_MAT}>
            <sphereGeometry args={[0.165, 12, 8]} />
          </mesh>
          {/* Pommel depan & cantle belakang */}
          <mesh position={[0, 0.045, 0.13]} rotation={[-0.25, 0, 0]} scale={[0.13, 0.055, 0.045]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color="#451a03" gradientMap={grad} />
          </mesh>
          <mesh position={[0, 0.055, -0.14]} rotation={[0.3, 0, 0]} scale={[0.145, 0.065, 0.048]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color="#451a03" gradientMap={grad} />
          </mesh>
        </group>

        {/* Tali & sanggurdi kiri-kanan di (±0.235, 0.42, -0.02) */}
        {[-1, 1].map((side) => (
          <group key={`stirrup-${side}`}>
            <mesh position={[side * 0.21, 0.62, -0.02]} rotation={[0, 0, side * -0.13]}>
              <boxGeometry args={[0.018, 0.4, 0.028]} />
              <meshToonMaterial color="#451a03" gradientMap={grad} />
            </mesh>
            {/* Ring sanggurdi besi */}
            <mesh position={[side * 0.235, 0.42, -0.02]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.04, 0.008, 8, 14]} />
              <meshToonMaterial color="#94a3b8" gradientMap={grad} />
            </mesh>
            <mesh position={[side * 0.235, 0.382, -0.02]}>
              <boxGeometry args={[0.065, 0.012, 0.045]} />
              <meshToonMaterial color="#64748b" gradientMap={grad} />
            </mesh>
          </group>
        ))}

        {/* Leher melengkung + Surai + Kepala ekspresif */}
        <group position={[0, 0.78, 0.4]} rotation={[Math.sin(st * 2) * 0.06, 0, 0]}>
          {/* Leher */}
          <group position={[0, 0.2, 0.1]} rotation={[0.52, 0, 0]}>
            <mesh>
              <cylinderGeometry args={[0.095, 0.145, 0.48, 14]} />
              <meshToonMaterial color="#854d0e" gradientMap={grad} />
            </mesh>
            <mesh scale={[1.07, 1.03, 1.07]} material={OUTLINE_MAT}>
              <cylinderGeometry args={[0.095, 0.145, 0.48, 14]} />
            </mesh>

            {/* Surai gelap berkibar */}
            {[0, 1, 2, 3, 4].map((idx) => (
              <mesh
                key={`mane-${idx}`}
                position={[
                  Math.sin(st - idx * 0.55) * 0.014,
                  0.16 - idx * 0.085,
                  -0.115,
                ]}
                rotation={[-0.35, 0, Math.sin(st - idx * 0.55) * 0.18]}
                scale={[0.032, 0.075, 0.055]}
              >
                <sphereGeometry args={[1, 8, 8]} />
                <meshToonMaterial color="#1c1917" gradientMap={grad} />
              </mesh>
            ))}
          </group>

          {/* Kepala kuda */}
          <group position={[0, 0.41, 0.23]} rotation={[0.32, 0, 0]}>
            {/* Tengkorak belakang */}
            <mesh scale={[0.11, 0.115, 0.135]}>
              <sphereGeometry args={[1, 14, 12]} />
              <meshToonMaterial color="#854d0e" gradientMap={grad} />
            </mesh>
            <mesh scale={[0.116, 0.122, 0.142]} material={OUTLINE_MAT}>
              <sphereGeometry args={[1, 14, 12]} />
            </mesh>

            {/* Moncong */}
            <mesh position={[0, -0.035, 0.145]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
              <cylinderGeometry args={[0.058, 0.095, 0.22, 12]} />
              <meshToonMaterial color="#a16207" gradientMap={grad} />
            </mesh>
            <mesh
              position={[0, -0.035, 0.145]}
              rotation={[Math.PI / 2 + 0.12, 0, 0]}
              scale={[1.09, 1.04, 1.09]}
              material={OUTLINE_MAT}
            >
              <cylinderGeometry args={[0.058, 0.095, 0.22, 12]} />
            </mesh>

            {/* Garis putih dahi ke hidung (white blaze) */}
            <mesh position={[0, 0.038, 0.145]} rotation={[0.45, 0, 0]} scale={[0.026, 0.015, 0.115]}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshToonMaterial color="#f8fafc" gradientMap={grad} />
            </mesh>

            {/* Telinga runcing */}
            {[-1, 1].map((side) => (
              <group key={`ear-${side}`} position={[side * 0.065, 0.115, -0.03]} rotation={[-0.15, 0, side * -0.22]}>
                <mesh>
                  <coneGeometry args={[0.028, 0.095, 8]} />
                  <meshToonMaterial color="#854d0e" gradientMap={grad} />
                </mesh>
                <mesh scale={[1.18, 1.08, 1.18]} material={OUTLINE_MAT}>
                  <coneGeometry args={[0.028, 0.095, 8]} />
                </mesh>
                <mesh position={[0, -0.005, 0.012]}>
                  <coneGeometry args={[0.015, 0.065, 6]} />
                  <meshToonMaterial color="#fda4af" gradientMap={grad} />
                </mesh>
              </group>
            ))}

            {/* Mata tinta + kilau putih */}
            {[-1, 1].map((side) => (
              <group key={`heye-${side}`} position={[side * 0.098, 0.025, 0.065]}>
                <mesh scale={[0.6, 1.15, 1]}>
                  <sphereGeometry args={[0.02, 10, 8]} />
                  <meshBasicMaterial color="#0f172a" />
                </mesh>
                <mesh position={[side * 0.007, 0.008, 0.008]}>
                  <sphereGeometry args={[0.0065, 6, 6]} />
                  <meshBasicMaterial color="#ffffff" />
                </mesh>
              </group>
            ))}

            {/* Tali kekang mulut & besi kendali */}
            <mesh position={[0, -0.048, 0.18]} rotation={[0.12, 0, 0]}>
              <torusGeometry args={[0.072, 0.01, 6, 16]} />
              <meshToonMaterial color="#451a03" gradientMap={grad} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh key={`bit-${side}`} position={[side * 0.076, -0.055, 0.175]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.016, 0.005, 6, 12]} />
                <meshToonMaterial color="#cbd5e1" gradientMap={grad} />
              </mesh>
            ))}
          </group>

          {/* Tali kendali (reins) menyambung dari besi kendali ke area tangan penunggang */}
          {[-1, 1].map((side) => (
            <mesh
              key={`rein-${side}`}
              position={[side * 0.095, 0.34, 0.195]}
              rotation={[Math.PI / 2 + 0.18, 0, side * 0.08]}
            >
              <cylinderGeometry args={[0.008, 0.008, 0.44, 6]} />
              <meshToonMaterial color="#451a03" gradientMap={grad} />
            </mesh>
          ))}
        </group>

        {/* Ekor melambai */}
        <group
          position={[0, 0.74, -0.5]}
          rotation={[0.58 + Math.cos(st * 1.3) * 0.12, 0, Math.sin(st * 0.8) * 0.22]}
        >
          <mesh position={[0, -0.18, -0.04]}>
            <coneGeometry args={[0.068, 0.42, 10]} />
            <meshToonMaterial color="#1c1917" gradientMap={grad} />
          </mesh>
          <mesh position={[0, -0.18, -0.04]} scale={[1.14, 1.04, 1.14]} material={OUTLINE_MAT}>
            <coneGeometry args={[0.068, 0.42, 10]} />
          </mesh>
        </group>
      </group>

      {/* 4 Kaki 2-segmen dengan fase trot diagonal */}
      <HorseLeg position={[0.13, 0.61 + legBob, 0.36]} phase={0} st={st} grad={grad} />
      <HorseLeg position={[-0.13, 0.61 + legBob, -0.36]} phase={0.18} st={st} isHind grad={grad} />
      <HorseLeg position={[-0.13, 0.61 + legBob, 0.36]} phase={Math.PI} st={st} grad={grad} />
      <HorseLeg position={[0.13, 0.61 + legBob, -0.36]} phase={Math.PI + 0.18} st={st} isHind grad={grad} />
    </group>
  );
};

/**
 * Cangkir tanah liat tradisional dengan permukaan air jernih & garis tinta.
 * Dipasang pada tangan kanan karakter saat aksi `'drink'`.
 */
export const ClayCupProp: React.FC = () => {
  const grad = useMemo(() => getToonGradientTexture(), []);

  return (
    <group position={[0, -0.02, 0.035]} rotation={[1.52, 0, 0]}>
      <mesh geometry={CLAY_CUP_GEO}>
        <meshToonMaterial color="#b45309" gradientMap={grad} />
      </mesh>
      <mesh geometry={CLAY_CUP_GEO} scale={[1.1, 1.05, 1.1]} material={OUTLINE_MAT} />
      {/* Permukaan air minum */}
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.042, 14]} />
        <meshToonMaterial color="#38bdf8" gradientMap={grad} />
      </mesh>
    </group>
  );
};

/**
 * Dompet kulit cokelat terlipat dengan kancing kuningan — digenggam tangan
 * kanan karakter saat aksi 'pickup', 'holdWallet', dan 'giveWallet'.
 */
export const WalletProp: React.FC = () => {
  const grad = useMemo(() => getToonGradientTexture(), []);

  return (
    <group position={[0, -0.02, 0.035]} rotation={[0.5, 0, 0.15]}>
      {/* Badan dompet */}
      <mesh>
        <boxGeometry args={[0.16, 0.03, 0.11]} />
        <meshToonMaterial color="#78350f" gradientMap={grad} />
      </mesh>
      <mesh scale={[1.08, 1.25, 1.08]} material={OUTLINE_MAT}>
        <boxGeometry args={[0.16, 0.03, 0.11]} />
      </mesh>
      {/* Lipatan penutup */}
      <mesh position={[0, 0.02, 0.01]}>
        <boxGeometry args={[0.16, 0.012, 0.07]} />
        <meshToonMaterial color="#92400e" gradientMap={grad} />
      </mesh>
      {/* Kancing kuningan */}
      <mesh position={[0, 0.028, 0.045]}>
        <sphereGeometry args={[0.012, 10, 8]} />
        <meshToonMaterial color="#f59e0b" gradientMap={grad} />
      </mesh>
    </group>
  );
};

/**
 * Pikulan bambu dengan dua keranjang anyaman berisi ikatan padi emas yang berayun
 * seirama langkah saat aksi `'carry'`. Dipasang di bahu karakter.
 */
export const CarryPoleProp: React.FC<{ time: number }> = ({ time }) => {
  const grad = useMemo(() => getToonGradientTexture(), []);
  const sway = Math.sin(Math.max(0, time) * 4.4) * 0.085;

  return (
    <group position={[0, 0.575, -0.095]}>
      {/* Batang pikulan bambu */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.024, 0.024, 1.56, 12]} />
        <meshToonMaterial color="#d97706" gradientMap={grad} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[1.22, 1.01, 1.22]} material={OUTLINE_MAT}>
        <cylinderGeometry args={[0.024, 0.024, 1.56, 12]} />
      </mesh>

      {/* Ruas bambu */}
      {[-0.55, -0.22, 0.22, 0.55].map((rx) => (
        <mesh key={rx} position={[rx, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.029, 0.029, 0.02, 10]} />
          <meshToonMaterial color="#92400e" gradientMap={grad} />
        </mesh>
      ))}

      {/* Dua keranjang panen padi menggantung di kiri & kanan */}
      {[-1, 1].map((side) => (
        <group key={`basket-${side}`} position={[side * 0.72, 0, 0]} rotation={[0, 0, sway]}>
          {/* Tali gantung */}
          {[-0.1, 0.1].map((rz) => (
            <mesh
              key={rz}
              position={[0, -0.17, rz * 0.5]}
              rotation={[rz * 2.1, 0, 0]}
            >
              <cylinderGeometry args={[0.006, 0.006, 0.36, 6]} />
              <meshToonMaterial color="#78350f" gradientMap={grad} />
            </mesh>
          ))}

          {/* Keranjang anyaman */}
          <group position={[0, -0.54, 0]}>
            <mesh geometry={BASKET_GEO}>
              <meshToonMaterial color="#92400e" gradientMap={grad} />
            </mesh>
            <mesh geometry={BASKET_GEO} scale={[1.07, 1.05, 1.07]} material={OUTLINE_MAT} />
            {/* Bibir anyaman */}
            <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.16, 0.014, 8, 16]} />
              <meshToonMaterial color="#b45309" gradientMap={grad} />
            </mesh>

            {/* Tumpukan padi emas melimpah */}
            <mesh position={[0, 0.21, 0]} scale={[0.145, 0.095, 0.145]}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshToonMaterial color="#facc15" gradientMap={grad} />
            </mesh>
            <mesh position={[0, 0.21, 0]} scale={[0.154, 0.103, 0.154]} material={OUTLINE_MAT}>
              <sphereGeometry args={[1, 10, 8]} />
            </mesh>
            {[-0.06, 0.05].map((ox, idx) => (
              <mesh
                key={idx}
                position={[ox, 0.26, idx === 0 ? 0.04 : -0.04]}
                rotation={[idx === 0 ? 0.2 : -0.25, 0, ox * -1.8]}
              >
                <coneGeometry args={[0.055, 0.14, 8]} />
                <meshToonMaterial color="#eab308" gradientMap={grad} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
};
