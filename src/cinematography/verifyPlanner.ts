// Jalankan: npx tsx src/cinematography/verifyPlanner.ts
import type { WorldLocation } from '../worlds/shared/types';
import { computePose } from './CameraDirector';
import { planScene, validatePlan, type DialogueLine } from './shotPlanner';
import { generateShotSequence, validateSequence } from './ShotSequencer';
import { MAX_SHOT_SEC, MIN_SHOT_SEC, type Shot } from './shotTypes';

function check(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

const demoLocation: WorldLocation = {
  id: 'masjid-desa',
  label: 'Halaman Masjid Desa',
  position: [0, 0, 0],
  facing: 0,
  ambience: 'rooster',
  spawnPoints: [
    { id: 's1', position: [-1.2, 0, 0], facing: Math.PI / 2 },
    { id: 's2', position: [1.2, 0, 0], facing: -Math.PI / 2 },
  ],
  cameraAnchors: {
    wide: { position: [0, 3.2, 12], target: [0, 1.3, 0], fov: 45 },
    medium: { position: [0, 1.8, 4.5], target: [0, 1.3, 0], fov: 35 },
    close: { position: [0, 1.6, 1.8], target: [0, 1.5, 0], fov: 28 },
    overShoulder: { position: [-1.5, 1.6, 1.2], target: [1.2, 1.5, 0], fov: 32 },
    lowAngle: { position: [0, 0.8, 3.8], target: [0, 1.6, 0], fov: 40 },
    aerial: { position: [0, 26, 36], target: [0, 0, 0], fov: 50 },
  },
};

const dialogue: DialogueLine[] = [
  { speaker: 'ali', startSec: 8, durSec: 3, text: 'Assalamualaikum, Pak.' },
  { speaker: 'budi', startSec: 12, durSec: 2.5, text: 'Waalaikumsalam, Nak.' },
  { speaker: 'ali', startSec: 15.5, durSec: 4, text: 'Saya harus pergi merantau.', emotion: 'sad' },
  { speaker: 'budi', startSec: 21.5, durSec: 3, text: 'Jaga shalat dan niatmu.', emotion: 'khusyuk' },
];

// 1. Dialog 2 orang + momen emosional
const plan1 = planScene(dialogue, {
  worldBounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 },
});
const plan2 = planScene(dialogue, {
  worldBounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 },
});

for (const s of plan1.shots) {
  console.log(
    `${s.id} | ${s.target.padEnd(8)} | ${s.size.padEnd(3)} | ${s.angle.padEnd(6)} | ${s.move.padEnd(8)} | ${s.startSec.toFixed(2)}s + ${s.durSec.toFixed(2)}s | ${s.motive}`
  );
}
console.log('issues:', plan1.issues);

check(plan1.issues.length === 0, 'Plan dialog 2 orang harus bebas issue');
check(JSON.stringify(plan1.shots) === JSON.stringify(plan2.shots), 'Output planScene harus deterministik');
check(plan1.shots[0].size === 'EWS', 'Scene harus dibuka dengan establishing EWS');
check(plan1.shots[1].size === 'WS', 'Establishing diikuti WS lokasi');
check(
  plan1.shots.some((s) => s.angle === 'ots'),
  'Dialog 2 orang harus memakai shot OTS'
);
check(
  plan1.shots.some((s) => s.size === 'CU' && /reaction/i.test(s.motive)),
  'Dialog harus menyertakan reaction shot'
);
check(
  plan1.shots.some((s) => s.size === 'CU' && s.move === 'pushIn'),
  'Momen emosional harus memakai pushIn ke CU'
);

// 2. Monolog & dialog panjang (> MAX_SHOT_SEC) tetap valid durasinya
const mono = planScene([{ speaker: 'ali', startSec: 6, durSec: 9, emotion: 'sad' }]);
check(mono.issues.length === 0, 'Plan monolog panjang harus bebas issue');
check(
  mono.shots.every((s) => s.durSec >= MIN_SHOT_SEC - 1e-6 && s.durSec <= MAX_SHOT_SEC + 1e-6),
  'Semua shot monolog harus dalam rentang 2..6s'
);

// 3. Validator harus menangkap pelanggaran aturan
const badIssues = validatePlan(
  [
    {
      id: 'b1',
      target: 'ali',
      size: 'MS',
      angle: 'eye',
      move: 'pushIn',
      lensMm: 50,
      startSec: 0,
      durSec: 1.0,
      azimuthDeg: 185,
      motive: '',
    },
    {
      id: 'b2',
      target: 'ali',
      size: 'MS',
      angle: 'eye',
      move: 'static',
      lensMm: 50,
      startSec: 1.0,
      durSec: 3.0,
      azimuthDeg: 175,
      motive: 'test',
    },
  ],
  {
    obstacles: [{ x: 10, z: 10, r: 3 }],
    worldBounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 },
    cameraXZ: () => ({ x: 10, z: 10 }),
  }
);
const badRules = new Set(badIssues.map((x) => x.rule));
check(badRules.has('motive'), 'Harus mendeteksi motive kosong');
check(badRules.has('duration'), 'Harus mendeteksi pelanggaran durasi');
check(badRules.has('axis'), 'Harus mendeteksi pelanggaran axis 180°');
check(badRules.has('30deg'), 'Harus mendeteksi jump-cut (<30deg)');
check(badRules.has('collision'), 'Harus mendeteksi tabrakan objek');
check(badRules.has('bounds'), 'Harus mendeteksi keluar batas dunia');

// 4. CameraDirector computePose deterministik & tidak menembus obstacle
const poseProps = {
  shots: plan1.shots,
  location: demoLocation,
  subjects: {
    ali: [-1.2, 0, 0] as [number, number, number],
    budi: [1.2, 0, 0] as [number, number, number],
  },
  axis: ['ali', 'budi'] as [string, string],
  obstacles: [{ x: 0, z: 4, r: 1 }],
  handheld: 0.25,
  seed: 42,
};
const pA = computePose(poseProps, 16.5);
const pB = computePose(poseProps, 16.5);
check(pA, 'computePose pA harus mengembalikan pose');
check(pB, 'computePose pB harus mengembalikan pose');
check(JSON.stringify(pA.pos.toArray()) === JSON.stringify(pB.pos.toArray()), 'computePose pos harus deterministik');
check(JSON.stringify(pA.aim.toArray()) === JSON.stringify(pB.aim.toArray()), 'computePose aim harus deterministik');
check(Math.hypot(pA.pos.x - 0, pA.pos.z - 4) >= 1.34, 'computePose harus menghindari obstacle');

function xzDot(a: [number, number, number], b: [number, number, number]): number {
  const al = Math.hypot(a[0], a[2]) || 1;
  const bl = Math.hypot(b[0], b[2]) || 1;
  return (a[0] / al) * (b[0] / bl) + (a[2] / al) * (b[2] / bl);
}

function facingToFwd(f: number): [number, number, number] {
  return [Math.sin(f), 0, Math.cos(f)];
}

// 5. Single-shot CU distance symmetry (ali & budi sama-sama ~1.95m ± 0.25m)
const facingEachOther = { ali: Math.PI / 2, budi: -Math.PI / 2 };
const cuAliShot: Shot = {
  id: 'cu-ali',
  target: 'ali',
  size: 'CU',
  angle: 'eye',
  move: 'static',
  lensMm: 70,
  startSec: 0,
  durSec: 3,
  azimuthDeg: 28,
  motive: 'CU ali',
};
const cuBudiShot: Shot = {
  id: 'cu-budi',
  target: 'budi',
  size: 'CU',
  angle: 'eye',
  move: 'static',
  lensMm: 70,
  startSec: 0,
  durSec: 3,
  azimuthDeg: 152,
  motive: 'CU budi',
};
const cuAliPose = computePose(
  {
    shots: [cuAliShot],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
const cuBudiPose = computePose(
  {
    shots: [cuBudiShot],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(cuAliPose && cuBudiPose, 'CU pose ali & budi harus tersedia');
const distAliCU = Math.hypot(cuAliPose.pos.x - -1.2, cuAliPose.pos.z - 0);
const distBudiCU = Math.hypot(cuBudiPose.pos.x - 1.2, cuBudiPose.pos.z - 0);
check(Math.abs(distAliCU - 1.95) <= 0.25, `CU ali jarak (${distAliCU.toFixed(2)}m) harus ~1.95m ±0.25m`);
check(Math.abs(distBudiCU - 1.95) <= 0.25, `CU budi jarak (${distBudiCU.toFixed(2)}m) harus ~1.95m ±0.25m`);

// 6. Front-facing guarantee: berhadapan maupun berjalan searah (subjectFacings: { ali: 0, budi: 0 })
const dotAliFace = xzDot(facingToFwd(facingEachOther.ali), [cuAliPose.pos.x - -1.2, 0, cuAliPose.pos.z]);
const dotBudiFace = xzDot(facingToFwd(facingEachOther.budi), [cuBudiPose.pos.x - 1.2, 0, cuBudiPose.pos.z]);
check(dotAliFace >= 0.45, `CU ali harus di depan wajah (dot=${dotAliFace.toFixed(2)})`);
check(dotBudiFace >= 0.45, `CU budi harus di depan wajah (dot=${dotBudiFace.toFixed(2)})`);

// Juga uji ketika azimuthDeg keliru (155° untuk ali) — wajib tetap di depan wajah
const cuAliBadAzPose = computePose(
  {
    shots: [{ ...cuAliShot, azimuthDeg: 155 }],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(cuAliBadAzPose, 'cuAliBadAzPose harus tersedia');
const dotAliBadAz = xzDot(facingToFwd(facingEachOther.ali), [
  cuAliBadAzPose.pos.x - -1.2,
  0,
  cuAliBadAzPose.pos.z,
]);
check(dotAliBadAz >= 0.45, `CU ali meski azimuthDeg=155 harus tetap di depan wajah (dot=${dotAliBadAz.toFixed(2)})`);

// Berjalan searah (+Z: facing = 0) untuk single-shot & two-shot
const walkSameDir = { ali: 0, budi: 0 };
const walkSingleAli = computePose(
  {
    shots: [{ ...cuAliShot, size: 'MCU', azimuthDeg: 35 }],
    location: demoLocation,
    subjects: { ali: [-1.0, 0, 0], budi: [1.0, 0, 0] },
    subjectFacings: walkSameDir,
    axis: ['ali', 'budi'],
  },
  1.0
);
const walkSingleBudi = computePose(
  {
    shots: [{ ...cuBudiShot, size: 'MCU', azimuthDeg: 145 }],
    location: demoLocation,
    subjects: { ali: [-1.0, 0, 0], budi: [1.0, 0, 0] },
    subjectFacings: walkSameDir,
    axis: ['ali', 'budi'],
  },
  1.0
);
const walkTwoShot = computePose(
  {
    shots: [
      {
        id: 'walk-two',
        target: 'both',
        twoShot: true,
        size: 'MS',
        angle: 'eye',
        move: 'static',
        lensMm: 40,
        startSec: 0,
        durSec: 4,
        motive: 'Two-shot jalan bersama',
      },
    ],
    location: demoLocation,
    subjects: { ali: [-1.0, 0, 0], budi: [1.0, 0, 0] },
    subjectFacings: walkSameDir,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(walkSingleAli && walkSingleBudi && walkTwoShot, 'Walk poses harus tersedia');
check(
  xzDot(facingToFwd(0), [walkSingleAli.pos.x - -1.0, 0, walkSingleAli.pos.z]) >= 0.45,
  'Walk single ali harus di depan wajah'
);
check(
  xzDot(facingToFwd(0), [walkSingleBudi.pos.x - 1.0, 0, walkSingleBudi.pos.z]) >= 0.45,
  'Walk single budi harus di depan wajah'
);
check(
  xzDot(facingToFwd(0), [walkTwoShot.pos.x - 0, 0, walkTwoShot.pos.z]) >= 0.45,
  'Walk two-shot harus di depan wajah kedua karakter'
);

// 7. OTS lateral shoulder clearance (>= 0.45m tegak lurus garis toSubj)
const otsPose = computePose(
  {
    shots: [
      {
        id: 'ots-budi',
        target: 'budi',
        over: 'ali',
        size: 'MCU',
        angle: 'ots',
        move: 'static',
        lensMm: 55,
        startSec: 0,
        durSec: 3,
        motive: 'OTS budi lewat bahu ali',
      },
    ],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(otsPose, 'otsPose harus tersedia');
const toSubjX = 1.2 - -1.2;
const toSubjZ = 0 - 0;
const toSubjLen = Math.hypot(toSubjX, toSubjZ);
const relOtsX = otsPose.pos.x - -1.2;
const relOtsZ = otsPose.pos.z - 0;
const otsLateralClearance = Math.abs(relOtsX * toSubjZ - relOtsZ * toSubjX) / toSubjLen;
check(
  otsLateralClearance >= 0.45,
  `OTS lateral shoulder clearance (${otsLateralClearance.toFixed(2)}m) harus >= 0.45m`
);

// 8. cameraOverride exact passthrough (mengabaikan obstacle & handheld saat static)
const overridePose = computePose(
  {
    shots: [
      {
        id: 'override-shot',
        target: 'ali',
        size: 'WS',
        angle: 'eye',
        move: 'static',
        lensMm: 35,
        startSec: 0,
        durSec: 4,
        motive: 'Manual override',
        cameraOverride: {
          position: [10, 5, -3],
          target: [1, 2, 3],
          fov: 37,
        },
      },
    ],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    obstacles: [{ x: 10, z: -3, r: 5 }],
    handheld: 0.5,
  },
  1.5
);
check(overridePose, 'overridePose harus tersedia');
check(
  overridePose.pos.x === 10 && overridePose.pos.y === 5 && overridePose.pos.z === -3,
  'cameraOverride position harus passthrough persis'
);
check(
  overridePose.aim.x === 1 && overridePose.aim.y === 2 && overridePose.aim.z === 3,
  'cameraOverride target harus passthrough persis'
);
check(overridePose.fov === 37, 'cameraOverride fov harus passthrough persis');

// 9. Narration-only generateShotSequence (>= 4 valid shots, durSec >= 1.5, zero gaps)
const narShots = generateShotSequence(
  {
    dialogue: [{ id: 'n1', speakerId: 'narator', startSec: 10, durSec: 22 }],
    cast: [{ castId: 'ali' }, { castId: 'budi' }],
    sceneDurationSec: 22,
    sceneStartSec: 10,
    axis: ['ali', 'budi'],
  },
  'sc-nar'
);
check(narShots.length >= 4, `Narration-only sequence harus >= 4 shot (dapat ${narShots.length})`);
check(Math.abs(narShots[0].startSec - 10) < 1e-6, 'Narration sequence harus mulai tepat di sceneStartSec');
const narLast = narShots[narShots.length - 1];
check(
  Math.abs(narLast.startSec + narLast.durSec - 32) < 1e-3,
  'Narration sequence harus berakhir tepat di sceneStartSec + sceneDurationSec'
);
check(narShots.every((s) => s.durSec >= 1.5), 'Semua shot narasi harus >= 1.5s');
for (let i = 0; i < narShots.length - 1; i++) {
  const gap = Math.abs(narShots[i].startSec + narShots[i].durSec - narShots[i + 1].startSec);
  check(gap < 1e-3, `Narration shots tidak boleh punya gap (gap=${gap})`);
}
check(validateSequence(narShots).length === 0, 'Narration sequence harus lolos validateSequence');

// 10. Dramatic-Shorts sequence & CameraDirector enhancements
const dsDialogue = [
  { id: 'd1', speakerId: 'narator', startSec: 0.8, durSec: 4.0 },
  { id: 'd2', speakerId: 'narator', startSec: 5.2, durSec: 3.4 },
  { id: 'd3', speakerId: 'budi', startSec: 9.0, durSec: 4.8, emotion: 'happy' },
  { id: 'd4', speakerId: 'ali', startSec: 14.2, durSec: 4.6, emotion: 'happy' },
  { id: 'd5', speakerId: 'budi', startSec: 19.2, durSec: 4.6, emotion: 'thinking' },
  { id: 'd6', speakerId: 'ali', startSec: 24.2, durSec: 5.0, emotion: 'solemn' },
  { id: 'd7', speakerId: 'budi', startSec: 29.5, durSec: 4.2, emotion: 'happy' },
  { id: 'd8', speakerId: 'ali', startSec: 34.0, durSec: 3.8, emotion: 'happy' },
];
const dsShots = generateShotSequence(
  {
    dialogue: dsDialogue,
    cast: [{ castId: 'ali' }, { castId: 'budi' }],
    sceneDurationSec: 38,
    sceneStartSec: 0,
    axis: ['budi', 'ali'],
    style: 'dramatic-shorts',
  },
  'ds-sc1'
);
check(dsShots.length >= 10, `dramatic-shorts harus menghasilkan ritme cepat >= 10 shot (dapat ${dsShots.length})`);
check(dsShots[0].size === 'CU' && dsShots[0].move === 'slowPull', 'dramatic-shorts wajib dibuka Hook CU slowPull');
check(dsShots.every((s) => s.move !== 'static'), 'dramatic-shorts tidak boleh punya shot static');
check(dsShots.every((s) => s.durSec <= 5.5), 'Semua shot dramatic-shorts harus <= 5.5s');
check(
  dsShots.some((s) => s.move === 'axialPunch' && s.impactFx === 'speedlines'),
  'dramatic-shorts wajib memiliki axialPunch + speedlines saat klimaks solemn'
);
check(validateSequence(dsShots).length === 0, 'dramatic-shorts harus lolos validateSequence tanpa gap atau CU ganda');

const punchShot: Shot = {
  id: 'punch-test',
  target: 'ali',
  size: 'CU',
  angle: 'dutch',
  dutchDeg: -8,
  move: 'axialPunch',
  lensMm: 68,
  startSec: 0,
  durSec: 2,
  deepFocus: true,
  motive: 'Axial punch test',
};
const punchStartPose = computePose(
  {
    shots: [punchShot],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  0.0
);
const punchMidPose = computePose(
  {
    shots: [punchShot],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(punchStartPose && punchMidPose, 'axialPunch poses harus tersedia');
const dStart = Math.hypot(punchStartPose.pos.x - -1.2, punchStartPose.pos.z);
const dMid = Math.hypot(punchMidPose.pos.x - -1.2, punchMidPose.pos.z);
check(dMid < dStart - 0.3 && dMid >= 1.0, `axialPunch harus mendekat aman (${dStart.toFixed(2)}m -> ${dMid.toFixed(2)}m)`);
check(Math.abs(punchMidPose.rollRad - (-8 * Math.PI) / 180) < 1e-4, 'dutchDeg=-8 harus menghasilkan rollRad tepat');
check(punchMidPose.dofEnabled === false, 'deepFocus=true wajib menonaktifkan DoF');

const normalHeadPose = computePose(
  {
    shots: [{ ...cuAliShot, headroom: 'normal' }],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
const propTopPose = computePose(
  {
    shots: [{ ...cuAliShot, headroom: 'propTop' }],
    location: demoLocation,
    subjects: { ali: [-1.2, 0, 0], budi: [1.2, 0, 0] },
    subjectFacings: facingEachOther,
    axis: ['ali', 'budi'],
  },
  1.0
);
check(normalHeadPose && propTopPose, 'headroom poses harus tersedia');
check(propTopPose.aim.y > normalHeadPose.aim.y + 0.05, 'headroom=propTop harus menaikkan aim.y');

// 11. Kontinuitas temporal 30 FPS saat bergerak melewati halangan (0 loncatan kamera antar-frame)
const walkObstacle = { x: 1.8, z: 2.2, r: 0.7, h: 4.0 };
const movingWalkShot: Shot = {
  id: 'smooth-walk',
  target: 'both',
  twoShot: true,
  size: 'MS',
  angle: 'eye',
  move: 'dollyTrack',
  lensMm: 38,
  startSec: 0,
  durSec: 4.0,
  motive: 'Walk smoothness near obstacle',
};
const walkSamples = [0.05, 2.0, 3.95].map((ts) => {
  const u = ts / 4.0;
  const z = u * 8.0;
  return {
    sec: ts,
    subjects: { ali: [-0.6, 0, z] as [number, number, number], budi: [0.6, 0, z] as [number, number, number] },
    subjectHeads: { ali: [-0.6, 1.4, z] as [number, number, number], budi: [0.6, 1.4, z] as [number, number, number] },
    subjectFacings: { ali: 0, budi: 0 },
  };
});
let prevWalkPos: [number, number, number] | null = null;
for (let f = 0; f < 120; f++) {
  const t = f / 30;
  const u = t / 4.0;
  const z = u * 8.0;
  const wp = computePose(
    {
      shots: [movingWalkShot],
      location: demoLocation,
      subjects: { ali: [-0.6, 0, z], budi: [0.6, 0, z] },
      subjectHeads: { ali: [-0.6, 1.4, z], budi: [0.6, 1.4, z] },
      subjectFacings: { ali: 0, budi: 0 },
      shotPathSamples: walkSamples,
      axis: ['ali', 'budi'],
      obstacles: [walkObstacle],
    },
    t
  );
  check(wp, 'movingWalkShot pose harus tersedia');
  if (prevWalkPos) {
    const dp = Math.hypot(
      wp.pos.x - prevWalkPos[0],
      wp.pos.y - prevWalkPos[1],
      wp.pos.z - prevWalkPos[2]
    );
    check(dp <= 0.25, `Gerak kamera 30 FPS dekat halangan harus mulus (dPos=${dp.toFixed(3)}m di f=${f})`);
  }
  prevWalkPos = [wp.pos.x, wp.pos.y, wp.pos.z];
}

console.log('ALL CINEMATOGRAPHY CHECKS PASSED');
