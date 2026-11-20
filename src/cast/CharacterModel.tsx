import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getToonGradientTexture } from '../utils/toonGradient';
import { sampleActionPose, type CharacterAction } from './animations';
import { getCast, type CastCostume, type Emotion, type OutfitStyle } from './characters';
import { blendExpression } from './expressions';
import { blinkAt, listenerNodAt, saccadeAt } from './idle';
import { sampleMouth, type VisemeKey } from './lipsync';
import { CharacterOutfit, SleeveCapMesh } from './outfits';
import { CarryPoleProp, ClayCupProp, HoeProp, MountHorseProp, WalletProp } from './props3d';

export interface CharacterModelProps {
  castId: string;
  time: number;
  emotion?: Emotion;
  prevEmotion?: Emotion;
  emotionStart?: number;
  visemes?: VisemeKey[];
  speaking?: boolean;
  listening?: boolean;
  isQuestion?: boolean;
  emphasisTimes?: number[];
  lookAt?: [number, number, number];
  position?: [number, number, number];
  rotationY?: number;
  action?: CharacterAction;
  actionSpeed?: number;
  outfit?: OutfitStyle;
}

const D = Math.PI / 180;

const OUTLINE_MAT = new THREE.MeshBasicMaterial({
  color: '#111827',
  side: THREE.BackSide,
});

// Geometri bersama tingkat modul (mencegah alokasi ulang tiap frame)
const HEAD_SPHERE_GEO = new THREE.SphereGeometry(0.27, 28, 22);
const LIMB_ARM_GEO = new THREE.CylinderGeometry(0.025, 0.023, 0.21, 10);
const LIMB_FOREARM_GEO = new THREE.CylinderGeometry(0.023, 0.02, 0.21, 10);
const LIMB_THIGH_GEO = new THREE.CylinderGeometry(0.03, 0.027, 0.26, 10);
const LIMB_SHIN_GEO = new THREE.CylinderGeometry(0.027, 0.024, 0.255, 10);
const JOINT_SPHERE_GEO = new THREE.SphereGeometry(1, 10, 8);
const HAND_SPHERE_GEO = new THREE.SphereGeometry(0.05, 12, 10);
const SHOE_SPHERE_GEO = new THREE.SphereGeometry(1, 12, 10);

const wrapAngle = (a: number): number => {
  const twoPi = Math.PI * 2;
  return (((a + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
};

interface HeadwearProps {
  costume: CastCostume;
  grad: THREE.DataTexture;
}

const HeadwearMesh: React.FC<HeadwearProps> = ({ costume, grad }) => {
  const hw = costume.headwear ?? 'none';

  if (hw === 'peci' || hw === 'peci-white') {
    const isWhite = hw === 'peci-white';
    const capCol = isWhite ? '#f8fafc' : '#1e293b';
    const trimCol = isWhite ? '#cbd5e1' : '#334155';
    return (
      <group>
        {/* Potongan rambut belakang/samping tipis khas channel */}
        <mesh position={[0, 0.02, -0.07]} scale={[0.98, 0.9, 0.92]}>
          <sphereGeometry args={[0.268, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
          <meshToonMaterial color={costume.hair} gradientMap={grad} />
        </mesh>

        {/* Peci hitam / putih */}
        <group position={[0, 0.235, -0.01]} rotation={[-0.08, 0, 0]}>
          <mesh scale={[1.16, 1, 1.24]}>
            <cylinderGeometry args={[0.165, 0.185, 0.13, 20]} />
            <meshToonMaterial color={capCol} gradientMap={grad} />
          </mesh>
          <mesh scale={[1.23, 1.08, 1.31]} material={OUTLINE_MAT}>
            <cylinderGeometry args={[0.165, 0.185, 0.13, 20]} />
          </mesh>
          {/* Atap peci sedikit membulat */}
          <mesh position={[0, 0.062, 0]} scale={[1.16, 0.22, 1.24]}>
            <sphereGeometry args={[0.165, 16, 10]} />
            <meshToonMaterial color={capCol} gradientMap={grad} />
          </mesh>
          {/* Pita tipis di tepi bawah */}
          <mesh position={[0, -0.052, 0]} scale={[1.17, 1, 1.25]}>
            <cylinderGeometry args={[0.185, 0.187, 0.022, 20]} />
            <meshToonMaterial color={trimCol} gradientMap={grad} />
          </mesh>
        </group>
      </group>
    );
  }

  if (hw === 'sorban') {
    const accent = costume.accent ?? '#fef08a';
    return (
      <group position={[0, 0.18, -0.015]} rotation={[-0.1, 0, 0]}>
        {/* Kubah atas sorban */}
        <mesh position={[0, 0.06, 0]} scale={[0.92, 0.68, 0.96]}>
          <sphereGeometry args={[0.21, 18, 14]} />
          <meshToonMaterial color="#e2e8f0" gradientMap={grad} />
        </mesh>
        <mesh position={[0, 0.06, 0]} scale={[0.98, 0.74, 1.02]} material={OUTLINE_MAT}>
          <sphereGeometry args={[0.21, 16, 12]} />
        </mesh>

        {/* Lilitan kain utama */}
        <mesh position={[0, -0.005, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.02, 1.08, 0.85]}>
          <torusGeometry args={[0.195, 0.068, 12, 24]} />
          <meshToonMaterial color="#f8fafc" gradientMap={grad} />
        </mesh>
        <mesh
          position={[0, -0.005, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.06, 1.12, 0.92]}
          material={OUTLINE_MAT}
        >
          <torusGeometry args={[0.195, 0.072, 12, 24]} />
        </mesh>

        {/* Pita emas sorban */}
        <mesh position={[0, 0.035, 0]} rotation={[Math.PI / 2 - 0.14, 0.12, 0]} scale={[1.02, 1.06, 0.55]}>
          <torusGeometry args={[0.2, 0.022, 8, 22]} />
          <meshToonMaterial color={accent} gradientMap={grad} />
        </mesh>

        {/* Ekor kain sorban menjuntai di sisi kiri-belakang */}
        <mesh position={[-0.19, -0.11, -0.08]} rotation={[0.15, 0, -0.22]} scale={[0.45, 1.4, 0.7]}>
          <sphereGeometry args={[0.065, 10, 8]} />
          <meshToonMaterial color="#f8fafc" gradientMap={grad} />
        </mesh>
      </group>
    );
  }

  if (hw === 'caping') {
    return (
      <group position={[0, 0.25, -0.015]} rotation={[-0.12, 0, 0]}>
        {/* Kerucut anyaman bambu lebar */}
        <mesh>
          <coneGeometry args={[0.44, 0.19, 24]} />
          <meshToonMaterial color="#d97706" gradientMap={grad} />
        </mesh>
        <mesh position={[0, -0.002, 0]} scale={[1.03, 1.05, 1.03]} material={OUTLINE_MAT}>
          <coneGeometry args={[0.44, 0.19, 24]} />
        </mesh>
        {/* Lis anyaman tepi */}
        <mesh position={[0, -0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.435, 0.015, 8, 24]} />
          <meshToonMaterial color="#92400e" gradientMap={grad} />
        </mesh>
        {/* Puncak caping */}
        <mesh position={[0, 0.095, 0]}>
          <sphereGeometry args={[0.028, 10, 8]} />
          <meshToonMaterial color="#92400e" gradientMap={grad} />
        </mesh>
      </group>
    );
  }

  if (hw === 'hijab') {
    const innerBand = costume.accent ?? '#fbcfe8';
    return (
      <group>
        {/* Ciput / pita dalam — diselipkan DI BAWAH kerudung utama dan dibuat
            lebih kecil, supaya hanya seiris tipis yang tampak di garis dahi.
            Sebelumnya ciput menonjol di depan kerudung seperti pita terpisah
            di atas kepala — itu yang terlihat berserakan. */}
        <mesh position={[0, 0.052, -0.052]} rotation={[-0.36, 0, 0]} scale={[1.03, 0.99, 0.96]}>
          <sphereGeometry args={[0.27, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.38]} />
          <meshToonMaterial color={innerBand} gradientMap={grad} />
        </mesh>

        {/* Kerudung utama membungkus puncak, samping, dan belakang kepala tanpa menembus wajah */}
        <mesh position={[0, 0.015, -0.074]} scale={[1.11, 1.09, 0.95]}>
          <sphereGeometry args={[0.27, 24, 18]} />
          <meshToonMaterial color={costume.top} gradientMap={grad} />
        </mesh>
        <mesh position={[0, 0.015, -0.074]} scale={[1.155, 1.135, 0.995]} material={OUTLINE_MAT}>
          <sphereGeometry args={[0.27, 22, 16]} />
        </mesh>

        {/* Puncak kain hijab membingkai dahi atas */}
        <mesh position={[0, 0.065, -0.042]} rotation={[-0.42, 0, 0]} scale={[1.09, 1.06, 0.98]}>
          <sphereGeometry args={[0.27, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.43]} />
          <meshToonMaterial color={costume.top} gradientMap={grad} />
        </mesh>
        <mesh position={[0, 0.065, -0.042]} rotation={[-0.42, 0, 0]} scale={[1.135, 1.105, 1.025]} material={OUTLINE_MAT}>
          <sphereGeometry args={[0.27, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.43]} />
        </mesh>

        {/* Lipatan samping pipi DIHAPUS — dua gumpalan terpisah di pipi membuat
            siluet kerudung terlihat berserakan; sisi wajah kini ditutup mulus
            oleh kerudung utama yang sudah membungkus sampai ke leher. */}

        {/* Drape leher/dada hijab — diturunkan dan dipinggangkan di atas agar
            tepi atasnya jatuh di bawah dagu, bukan memotong garis rahang. */}
        <mesh position={[0, -0.27, -0.03]} scale={[1.08, 1, 0.9]}>
          <cylinderGeometry args={[0.15, 0.245, 0.19, 20]} />
          <meshToonMaterial color={costume.top} gradientMap={grad} />
        </mesh>
        <mesh
          position={[0, -0.27, -0.03]}
          scale={[1.13, 1.05, 0.95]}
          material={OUTLINE_MAT}
        >
          <cylinderGeometry args={[0.15, 0.245, 0.19, 20]} />
        </mesh>
      </group>
    );
  }

  // 'none': kubah rambut rapi + jambul poni depan
  return (
    <group>
      <mesh position={[0, 0.032, -0.03]} scale={[1.05, 1.03, 1.04]}>
        <sphereGeometry args={[0.27, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshToonMaterial color={costume.hair} gradientMap={grad} />
      </mesh>
      <mesh
        position={[0, 0.032, -0.03]}
        scale={[1.095, 1.075, 1.085]}
        material={OUTLINE_MAT}
      >
        <sphereGeometry args={[0.27, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
      </mesh>
      {/* Jambul poni depan */}
      <mesh position={[0.02, 0.205, 0.175]} rotation={[0.35, 0.1, -0.2]} scale={[0.125, 0.055, 0.085]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshToonMaterial color={costume.hair} gradientMap={grad} />
      </mesh>
      <mesh
        position={[0.02, 0.205, 0.175]}
        rotation={[0.35, 0.1, -0.2]}
        scale={[0.136, 0.065, 0.095]}
        material={OUTLINE_MAT}
      >
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
    </group>
  );
};

/**
 * Rig karakter 3D bergaya Signature Hikmah Studio (1 unit = 1 meter).
 * Fungsi deterministik murni dari `time` (detik) untuk render Remotion & preview interaktif.
 */
export const CharacterModel: React.FC<CharacterModelProps> = ({
  castId,
  time,
  emotion = 'neutral',
  prevEmotion,
  emotionStart = 0,
  visemes = [],
  speaking = false,
  listening = false,
  isQuestion = false,
  emphasisTimes = [],
  lookAt,
  position = [0, 0, 0],
  rotationY = 0,
  action = 'idle',
  actionSpeed = 1,
  outfit,
}) => {
  const c = getCast(castId);
  const co = c.costume;
  const s = co.height / 1.7;
  const headColor = co.headColor ?? '#f8fafc';
  const activeOutfit: OutfitStyle = outfit ?? co.outfit ?? 'koko_sarong';

  const grad = useMemo(() => getToonGradientTexture(), []);

  const pose = sampleActionPose(action, time, c.seed, actionSpeed);
  const ex = blendExpression(prevEmotion ?? emotion, emotion, time - emotionStart);
  const m = speaking ? sampleMouth(visemes, time) : sampleMouth([], 0);
  const blink = blinkAt(c.seed, time);

  // Napas dua lapis: napas dasar 15x/menit + napas dalam lambat (7.5x/menit,
  // fase berbeda per karakter via seed) agar dada tidak bergerak seperti
  // metronom. Bahu ikut naik sedikit saat menarik napas.
  const breath = Math.sin(time * Math.PI * 2 * 0.25);
  const breathDeep = Math.sin(time * Math.PI * 2 * 0.125 + c.seed * 1.7);
  const breathAmp = breath * 0.75 + breathDeep * 0.25;
  const sway = Math.sin(time * 0.7 + c.seed) * 1.5 * D;

  const emphasisPulse = emphasisTimes.reduce((acc, et) => {
    const d = time - et;
    return d >= 0 && d < 0.3 ? Math.max(acc, Math.sin((d / 0.3) * Math.PI)) : acc;
  }, 0);
  const nod =
    emphasisPulse * 6 * D + (listening && !speaking ? listenerNodAt(c.seed, time) : 0);

  const browLift =
    ex.brow + (speaking ? emphasisPulse * 0.35 + (isQuestion ? 0.25 : 0) : 0);

  // Gestur tangan mengikuti penekanan kata (emphasis), bukan sinus kontinu:
  // tangan naik saat kata ditekankan lalu kembali istirahat. Baseline kecil
  // (0.15) menjaga tangan tetap hidup di sela kata tanpa melambai terus.
  const allowSpeechGesture =
    speaking && (action === 'idle' || action === 'walk' || action === 'sit');
  const phrase = allowSpeechGesture
    ? (0.15 + emphasisPulse) * (0.55 + 0.45 * Math.sin(time * 3.1 + c.seed))
    : 0;

  // Arah pandang mata & sakade deterministik
  const [sx, sy] = saccadeAt(c.seed, time);
  let ex2 = sx * 0.45;
  let ey = sy * 0.45;
  const eyeWorldY = position[1] + 1.43 * s;
  if (lookAt) {
    ex2 += Math.max(-1, Math.min(1, (lookAt[0] - position[0]) * 0.08)) * 0.012;
    ey += Math.max(-1, Math.min(1, (lookAt[1] - eyeWorldY) * 0.1)) * 0.01;
  }
  if (emotion === 'thinking') {
    ey += 0.008;
    ex2 += 0.008;
  }

  const headYaw = lookAt
    ? wrapAngle(Math.atan2(lookAt[0] - position[0], lookAt[2] - position[2]) - rotationY)
    : 0;
  const clampYaw = Math.max(-0.7, Math.min(0.7, headYaw)) * 0.6;

  // Posisi vertikal penunggang kuda agar selalu tepat di sadel (y=0.86) untuk tinggi berapa pun
  const isRiding = action === 'ride_horse';
  const riderOffsetY = isRiding
    ? 0.86 / s - 0.56 + (pose.rootOffset[1] - 0.3) / s
    : pose.rootOffset[1];

  // Ekspresi mulut viseme 3D
  const openAmount = Math.max(m.open, ex.mouthOpenBias);
  const mouthOpen = openAmount > 0.08 && !(m.closed && ex.mouthOpenBias < 0.05);
  const mouthW = 0.042 * (0.65 + m.wide * 0.65 - m.round * 0.38 + Math.max(0, ex.smile) * 0.12);
  const mouthH = 0.042 * Math.max(0.16, openAmount * 1.05);
  const cheekScale = 1 + m.cheek * 0.18 + Math.max(0, ex.smile) * 0.14;
  // Senyum menyipitkan mata sedikit (di luar eyeOpen bawaan ekspresi happy)
  const eyeSquashY = Math.max(0.06, blink * ex.eyeOpen * (1 - Math.max(0, ex.smile) * 0.12));
  const isSurprised = emotion === 'surprised';

  const legs = [
    { side: 1 as const, pose: pose.legL },
    { side: -1 as const, pose: pose.legR },
  ];

  const arms = [
    { side: 1 as const, pose: pose.armL },
    { side: -1 as const, pose: pose.armR },
  ];

  // Bayangan kontak (blob shadow): menambatkan karakter ke tanah agar tidak
  // terlihat mengambang — penting karena mesh karakter tidak melempar
  // bayangan nyata. Mengecil & memudar sedikit saat tubuh terangkat
  // (pantulan langkah), penuh saat diam/duduk.
  const lift = Math.max(0, pose.rootOffset[1]);
  const shadowFactor = 1 - Math.min(1, lift / 0.08) * 0.4;
  const shadowScale = 1 - Math.min(1, lift / 0.08) * 0.15;

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Bayangan kontak di tanah (dua lingkaran bertumpuk = tepi lembut) */}
      <group position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={shadowScale}>
        <mesh>
          <circleGeometry args={[0.36 * s, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.14 * shadowFactor} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0, 0.001]}>
          <circleGeometry args={[0.23 * s, 24]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.24 * shadowFactor} depthWrite={false} />
        </mesh>
      </group>

      {/* Kuda tunggangan pada skala dunia 1m saat aksi 'ride_horse' */}
      {isRiding && <MountHorseProp time={time} speed={actionSpeed} />}

      {/* Badan karakter berskala tinggi karakter (co.height / 1.7) */}
      <group
        scale={s}
        position={[pose.rootOffset[0], riderOffsetY, pose.rootOffset[2]]}
        rotation={pose.rootRot}
      >
        {/* 1. Kaki Stickman 2-Segmen (#111827) + Sepatu Oval Datar */}
        {legs.map(({ side, pose: legPose }) => (
          <group
            key={`leg-${side}`}
            position={[side * 0.085, 0.56, 0]}
            rotation={legPose.hip}
          >
            {/* Paha */}
            <mesh geometry={LIMB_THIGH_GEO} position={[0, -0.13, 0]}>
              <meshToonMaterial color="#111827" gradientMap={grad} />
            </mesh>
            {/* Sendi lutut */}
            <mesh geometry={JOINT_SPHERE_GEO} position={[0, -0.26, 0]} scale={0.029}>
              <meshToonMaterial color="#111827" gradientMap={grad} />
            </mesh>

            {/* Betis + Pergelangan + Sepatu */}
            <group position={[0, -0.26, 0]} rotation={[legPose.knee, 0, 0]}>
              <mesh geometry={LIMB_SHIN_GEO} position={[0, -0.1275, 0]}>
                <meshToonMaterial color="#111827" gradientMap={grad} />
              </mesh>
              <group position={[0, -0.255, 0]} rotation={[legPose.ankle, 0, 0]}>
                <mesh
                  geometry={SHOE_SPHERE_GEO}
                  position={[0, -0.018, 0.032]}
                  scale={[0.046, 0.025, 0.078]}
                >
                  <meshToonMaterial color="#1e293b" gradientMap={grad} />
                </mesh>
                <mesh
                  geometry={SHOE_SPHERE_GEO}
                  position={[0, -0.018, 0.032]}
                  scale={[0.051, 0.029, 0.084]}
                  material={OUTLINE_MAT}
                />
              </group>
            </group>
          </group>
        ))}

        {/* 2. Badan Atas (Torso Bell + Pikulan + Lengan + Kepala) */}
        <group position={[0, 0.56, 0]} rotation={pose.torsoRot}>
          {/* Torso Bell + Napas & Squash */}
          <group
            scale={[
              1.06 * pose.torsoSquash[0] * (1 + breathAmp * 0.014),
              pose.torsoSquash[1] * (1 + breathAmp * 0.02),
              0.88 * pose.torsoSquash[2],
            ]}
          >
            <CharacterOutfit costume={co} outfit={activeOutfit} grad={grad} />

            {/* Leher solid penghubung torso & kepala (menghilangkan celah dari sudut atas) */}
            <mesh position={[0, 0.565, 0]}>
              <cylinderGeometry args={[0.058, 0.072, 0.1, 14]} />
              <meshToonMaterial color={headColor} gradientMap={grad} />
            </mesh>
            <mesh position={[0, 0.565, 0]} scale={[1.14, 1.04, 1.14]} material={OUTLINE_MAT}>
              <cylinderGeometry args={[0.058, 0.072, 0.1, 14]} />
            </mesh>
          </group>

          {/* Pikulan bambu panen saat aksi 'carry' */}
          {action === 'carry' && <CarryPoleProp time={time} />}

          {/* 3. Lengan Stickman 2-Segmen + Tangan Bulat + Mount Prop */}
          {arms.map(({ side, pose: armPose }) => {
            const gestureShoulder = allowSpeechGesture
              ? side === 1
                ? phrase * 0.55
                : phrase * 0.22
              : 0;
            const gestureElbow = allowSpeechGesture
              ? side === 1
                ? phrase * 0.35
                : phrase * 0.15
              : 0;
            const shRot: [number, number, number] = [
              armPose.shoulder[0] - gestureShoulder - breathAmp * 0.03,
              armPose.shoulder[1],
              armPose.shoulder[2] - side * gestureShoulder * 0.12,
            ];

            return (
              <group
                key={`arm-${side}`}
                position={[side * 0.175, 0.49, 0]}
                rotation={shRot}
              >
                {/* Lengan baju pendek/panjang menempel di bahu */}
                <SleeveCapMesh costume={co} outfit={activeOutfit} grad={grad} />
                {/* Lengan atas */}
                <mesh geometry={LIMB_ARM_GEO} position={[0, -0.105, 0]}>
                  <meshToonMaterial color="#111827" gradientMap={grad} />
                </mesh>
                {/* Sendi siku */}
                <mesh geometry={JOINT_SPHERE_GEO} position={[0, -0.21, 0]} scale={0.025}>
                  <meshToonMaterial color="#111827" gradientMap={grad} />
                </mesh>

                {/* Lengan bawah + Tangan */}
                <group
                  position={[0, -0.21, 0]}
                  rotation={[-(armPose.elbow + gestureElbow), 0, 0]}
                >
                  <mesh geometry={LIMB_FOREARM_GEO} position={[0, -0.105, 0]}>
                    <meshToonMaterial color="#111827" gradientMap={grad} />
                  </mesh>

                  <group position={[0, -0.21, 0]}>
                    <mesh geometry={HAND_SPHERE_GEO}>
                      <meshToonMaterial color="#1e293b" gradientMap={grad} />
                    </mesh>
                    <mesh geometry={HAND_SPHERE_GEO} scale={1.14} material={OUTLINE_MAT} />

                    {/* Prop tangan kanan */}
                    {side === -1 && action === 'hoe' && (
                      <HoeProp impact={pose.hoeImpact} />
                    )}
                    {side === -1 && action === 'drink' && <ClayCupProp />}
                    {side === -1 &&
                      (action === 'pickup' ||
                        action === 'holdWallet' ||
                        action === 'giveWallet') && <WalletProp />}
                  </group>
                </group>
              </group>
            );
          })}

          {/* 4. Kepala Besar Pillowed Ivory-White + Ekspresi + Viseme Mulut + Headwear */}
          <group
            position={[0, 0.85, 0]}
            rotation={[
              nod + pose.headAddRot[0] - pose.torsoRot[0] * 0.35 + Math.sin(time * 0.5) * D,
              clampYaw + sway + pose.headAddRot[1],
              pose.headAddRot[2] + Math.sin(time * 0.4 + 1) * D,
            ]}
          >
            {/* Bola kepala porselen-gading beroutline tinta */}
            <mesh geometry={HEAD_SPHERE_GEO} scale={[1.04, 0.98, 0.96]}>
              <meshToonMaterial color={headColor} gradientMap={grad} />
            </mesh>
            <mesh
              geometry={HEAD_SPHERE_GEO}
              scale={[1.086, 1.026, 1.006]}
              material={OUTLINE_MAT}
            />

            {/* Pipi merona lembut */}
            {[-1, 1].map((side) => (
              <mesh
                key={`cheek-${side}`}
                position={[
                  side * 0.145,
                  -0.035 + Math.max(0, ex.smile) * 0.012,
                  0.22,
                ]}
                rotation={[0, side * 0.38, 0]}
                scale={[0.036 * cheekScale, 0.022 * cheekScale, 0.012]}
              >
                <sphereGeometry args={[1, 10, 8]} />
                <meshBasicMaterial color="#fda4af" transparent opacity={0.62} />
              </mesh>
            ))}

            {/* Mata & Alis Ekspresif */}
            {[-1, 1].map((side) => (
              <group
                key={`eye-${side}`}
                position={[side * 0.088, 0.025, 0.25]}
                rotation={[0, side * 0.22, 0]}
              >
                {isSurprised ? (
                  <>
                    {/* Mata terbelalak dengan sklera putih & cincin tinta */}
                    <mesh scale={[1, Math.max(0.15, blink * 1.15), 0.45]}>
                      <sphereGeometry args={[0.036, 14, 12]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                    <mesh
                      scale={[1.14, Math.max(0.18, blink * 1.28), 0.48]}
                      material={OUTLINE_MAT}
                    >
                      <sphereGeometry args={[0.036, 14, 12]} />
                    </mesh>
                    <mesh
                      position={[ex2, ey, 0.014]}
                      scale={[1, Math.max(0.12, blink), 0.5]}
                    >
                      <sphereGeometry args={[0.016, 10, 8]} />
                      <meshBasicMaterial color="#0f172a" />
                    </mesh>
                    <mesh position={[ex2 + 0.005, ey + 0.006, 0.021]}>
                      <sphereGeometry args={[0.0055, 6, 6]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                  </>
                ) : (
                  <>
                    {/* Mata pil hitam kontras tinggi + kilau putih */}
                    <mesh
                      position={[ex2, ey, 0]}
                      scale={[0.85, 1.28 * eyeSquashY, 0.45]}
                    >
                      <sphereGeometry args={[0.024, 12, 10]} />
                      <meshBasicMaterial color="#0f172a" />
                    </mesh>
                    {eyeSquashY > 0.25 && (
                      <mesh position={[ex2 + 0.006, ey + 0.011, 0.01]}>
                        <sphereGeometry args={[0.0075, 8, 8]} />
                        <meshBasicMaterial color="#ffffff" />
                      </mesh>
                    )}
                  </>
                )}

                {/* Alis tinta tebal ekspresif */}
                <mesh
                  position={[0, 0.068 + browLift * 0.024, 0.006]}
                  rotation={[0, 0, side * ex.browTilt * 0.42]}
                >
                  <boxGeometry args={[0.065, 0.015, 0.014]} />
                  <meshBasicMaterial color="#0f172a" />
                </mesh>
              </group>
            ))}

            {/* Mulut Viseme 3D Terartikulasi (tangensial mengikuti kelengkungan dagu, anti-Pinokio dari sudut 360°) */}
            <group
              position={[0, -0.068 - openAmount * 0.005, 0.2495]}
              rotation={[0.28, 0, 0]}
            >
              {mouthOpen ? (
                <>
                  {/* Garis bibir luar hitam */}
                  <mesh scale={[mouthW * 1.2, mouthH * 1.2, 0.003]}>
                    <sphereGeometry args={[1, 16, 10]} />
                    <meshBasicMaterial color="#0f172a" />
                  </mesh>
                  {/* Rongga mulut merah gelap */}
                  <mesh position={[0, 0, 0.001]} scale={[mouthW, mouthH, 0.003]}>
                    <sphereGeometry args={[1, 16, 10]} />
                    <meshBasicMaterial color="#7f1d1d" />
                  </mesh>
                  {/* Deretan gigi atas membulat agar tidak menembus tepi bibir */}
                  {openAmount > 0.22 && (
                    <mesh
                      position={[0, mouthH * 0.4, 0.0022]}
                      scale={[mouthW * 0.65, mouthH * 0.24, 0.002]}
                    >
                      <sphereGeometry args={[1, 12, 8]} />
                      <meshBasicMaterial color="#ffffff" />
                    </mesh>
                  )}
                  {/* Lidah merah muda */}
                  {openAmount > 0.3 && (
                    <mesh
                      position={[0, -mouthH * 0.4, 0.0022]}
                      scale={[mouthW * 0.55, mouthH * 0.28, 0.002]}
                    >
                      <sphereGeometry args={[1, 10, 8]} />
                      <meshBasicMaterial color="#fb7185" />
                    </mesh>
                  )}
                </>
              ) : (
                /* Bibir tertutup: garis senyum / netral / cemberut / M-B-P */
                <mesh
                  position={[0, ex.smile > 0.22 && !m.closed ? 0.01 : -0.002, 0.002]}
                  rotation={[0, 0, ex.smile >= 0 ? Math.PI : 0]}
                  scale={[0.035 + Math.abs(ex.smile) * 0.008, 0.011 + Math.max(0, ex.smile) * 0.015, 0.003]}
                >
                  {Math.abs(ex.smile) > 0.22 && !m.closed ? (
                    <torusGeometry args={[1, 0.24, 6, 14, Math.PI]} />
                  ) : (
                    <sphereGeometry args={[0.9, 10, 6]} />
                  )}
                  <meshBasicMaterial color="#0f172a" />
                </mesh>
              )}
            </group>

            {/* Penutup Kepala / Rambut */}
            <HeadwearMesh costume={co} grad={grad} />
          </group>
        </group>
      </group>
    </group>
  );
};
