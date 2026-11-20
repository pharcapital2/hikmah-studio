import type { ProductionStory } from './types';
import { generateShotSequence } from '../cinematography/ShotSequencer';
import type { Shot } from '../cinematography/shotTypes';

/**
 * Konten Hikmah #1: "Seteguk Kebaikan di Tepi Jembatan"
 * Durasi: 60 Detik (Tanpa VO audio — Storytelling berbasis Sinematografi 3D, Mimik Wajah, & Teks Hikmah)
 *
 * Sesuai Arsitektur 3 Lapis:
 * - Lapis 1 (WORLD): VillageMap ('river-bridge' & 'mosque')
 * - Lapis 2 (CAST): 'kakek' (Kakek Salman) & 'anak' (Adik Fajar)
 * - Lapis 3 (PRODUCTION): Data shot di-generate otomatis oleh ShotSequencer
 *
 * ShotSequencer mengikuti 5 Hukum Sinematografi Dialog:
 * 1. Establishing Rule  — selalu mulai dengan WS/EWS (lihat dunia dulu)
 * 2. Entrance Rule      — karakter baru = WS sambil bergerak
 * 3. Two-Shot Rule      — awal dialog = two-shot sebelum OTS
 * 4. Reaction Rule      — pendengar juga ditampilkan (40% waktu)
 * 5. Climax Rule        — puncak emosi = CU + reaksi CU pendengar
 */

// ─── Dialogue Scene 1 (data murni, tanpa shot) ───────────────────────────────
const sc1Dialogue = [
  {
    id: 'd1',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 0.5,
    durSec: 4.2,
    text: 'Senja di jembatan desa. Air sungai mengalir jernih, menemani langkah pulang warga yang bersyukur.',
  },
  {
    id: 'd2',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 5.2,
    durSec: 3.0,
    text: 'Kakek Salman duduk melepas lelah di tepi jembatan setelah seharian merawat kebun.',
  },
  {
    id: 'd3',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 8.5,
    durSec: 4.8,
    text: '"Assalamualaikum Kek... Kakek tampak lelah sekali. Ini ada air kendi segar dari rumah, minumlah Kek."',
    emotion: 'happy' as const,
  },
  {
    id: 'd4',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 13.8,
    durSec: 5.0,
    text: '"Wa\'alaikumsalam Fajar, alhamdulillah... Terima kasih banyak, Nak. Sejuk sekali rasanya sampai ke hati."',
    emotion: 'happy' as const,
  },
  {
    id: 'd5',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 19.2,
    durSec: 4.5,
    text: '"Maaf hanya segelas air biasa Kek... Saya belum punya uang banyak untuk bersedekah seperti orang dewasa."',
    emotion: 'thinking' as const,
  },
  {
    id: 'd6',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 24.2,
    durSec: 4.6,
    text: '"Wahai cucuku, Rasulullah bersabda bahwa setiap kebaikan adalah sedekah. Jangan pernah meremehkannya!"',
    emotion: 'solemn' as const,
  },
  {
    id: 'd7',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 29.2,
    durSec: 4.1,
    text: '"Masya Allah... Jadi seteguk air dan senyuman tulus pun dicatat sebagai sedekah mulia ya Kek?"',
    emotion: 'happy' as const,
  },
  {
    id: 'd8',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 33.6,
    durSec: 4.2,
    text: '"Benar sekali, Nak. Mari kita melangkah ke masjid desa bersama, waktu Maghrib telah tiba."',
    emotion: 'happy' as const,
  },
];

// ─── Dialogue Scene 2 ─────────────────────────────────────────────────────────
const sc2Dialogue = [
  {
    id: 'd9',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 38.5,
    durSec: 5.0,
    text: 'Langkah kaki mereka tiba di pelataran masjid desa yang tenang, menyatu dengan hembusan angin senja.',
  },
  {
    id: 'd10',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 44.0,
    durSec: 5.8,
    text: 'Setiap langkah menuju kebaikan adalah ampunan dosa, dan setiap pertolongan kecil adalah penolak bala.',
  },
  {
    id: 'd11',
    speakerId: 'narator',
    speakerName: 'Hikmah & Dalil',
    startSec: 50.5,
    durSec: 9.0,
    text: 'Rasulullah ﷺ bersabda: "Kullu ma\'rūfin shadaqah" — Setiap perbuatan baik adalah sedekah. (HR. Bukhari & Muslim)',
  },
];

// ─── Auto-generate shots via ShotSequencer ───────────────────────────────────
// Scene 1: 0s–38s, karakter: kakek & anak, style cinematic
const sc1Shots = generateShotSequence(
  {
    dialogue: sc1Dialogue,
    cast: [
      { castId: 'kakek', defaultAction: 'sit' },
      { castId: 'anak', defaultAction: 'walk' },
    ],
    sceneDurationSec: 38,
    sceneStartSec: 0,
    axis: ['anak', 'kakek'],
    style: 'cinematic',
  },
  'sc1'
);

// Scene 2: 38s–60s, hanya narasi → shot manual (ShotSequencer tidak efektif untuk narasi murni)
// Shot disusun manual mengikuti kaidah sinematografi: masuk → berjalan → doa → crane closure

const sc2Shots: Shot[] = [
  // 0.0–5.0s: WS dua karakter berjalan memasuki masjid (establishing)
  {
    id: 'sc2-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    anchor: 'wide',
    startSec: 38,
    durSec: 5.0,
    twoShot: true,
    motive: 'Establishing — dua karakter berjalan menuju masjid, pan mengikuti',
  },
  // 5.0–10.0s: MS two-shot keduanya berjalan masuk pelataran
  {
    id: 'sc2-s2-twowalk',
    target: 'both',
    size: 'MS',
    angle: 'eye',
    move: 'static',
    lensMm: 40,
    anchor: 'medium',
    startSec: 43,
    durSec: 5.0,
    twoShot: true,
    motive: 'Two-shot berjalan — tampilkan keduanya memasuki area masjid',
  },
  // 10.0–16.5s: MCU kakek — wajah khusyuk, siap berdoa (kalimat narator hikmah)
  {
    id: 'sc2-s3-cu-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'pushIn',
    lensMm: 55,
    azimuthDeg: 155,
    startSec: 48,
    durSec: 6.5,
    motive: 'MCU kakek berdoa — wajah khusyuk, narator membacakan hikmah',
  },
  // 16.5–19.5s: CU anak — wajah solemn menyimak dan meresapi
  {
    id: 'sc2-s4-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    azimuthDeg: 25,
    startSec: 54.5,
    durSec: 3.0,
    motive: 'CU reaksi anak — solemn menyimak dalil yang dibacakan narator',
  },
  // 19.5–22s: Crane reveal — closure sinematik, kamera naik dari dua karakter ke langit senja
  {
    id: 'sc2-s5-crane',
    target: 'both',
    size: 'WS',
    angle: 'low',
    move: 'crane',
    lensMm: 35,
    anchor: 'aerial',
    startSec: 57.5,
    durSec: 2.5,
    twoShot: true,
    motive: 'Crane reveal closure — kamera naik, langit senja, credit dalil',
  },
];

// ─── Story Object ─────────────────────────────────────────────────────────────
export const KONTEN_HIKMAH_1: ProductionStory = {
  id: 'seteguk-kebaikan-jembatan',
  title: 'Seteguk Kebaikan di Tepi Jembatan',
  theme: 'Sedekah & Kebaikan Tanpa Syarat',
  summary:
    'Adik Fajar yang merasa belum mampu bersedekah banyak belajar dari Kakek Salman bahwa seteguk air tulus dan senyuman hangat adalah sedekah berharga di sisi Allah.',
  totalDurationSec: 60,
  scenes: [
    // ── SCENE 1: Tepi Jembatan Desa (0s–38s) ──────────────────────────────
    {
      id: 'sc1-jembatan',
      title: 'Pertemuan di Tepi Jembatan',
      worldId: 'village',
      locationId: 'river-bridge',
      stagingPresetId: 'bridge-talk',
      cameraSide: 1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'river',
      startSec: 0,
      durationSec: 38,
      axis: ['anak', 'kakek'],
      shots: sc1Shots,  // ← generated oleh ShotSequencer, bukan hardcoded
      dialogue: sc1Dialogue,
      cast: [
        {
          castId: 'kakek',
          name: 'Kakek Salman',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'sit',
          defaultEmotion: 'solemn',
          timeline: [
            // 0–8.5s: duduk, diam (sebelum Fajar datang)
            { startSec: 0,    durSec: 8.5,  action: 'sit',   emotion: 'solemn',   speaking: false, listening: false },
            // 8.5–13.5s: mendengarkan Fajar menyapa & menawarkan air
            { startSec: 8.5,  durSec: 5.0,  action: 'sit',   emotion: 'solemn',   speaking: false, listening: true  },
            { startSec: 13.5, durSec: 5.5,  action: 'drink', emotion: 'happy',    speaking: true,  listening: false },
            { startSec: 19.0, durSec: 5.0,  action: 'sit',   emotion: 'thinking', speaking: false, listening: true  },
            { startSec: 24.0, durSec: 5.0,  action: 'sit',   emotion: 'solemn',   speaking: true,  listening: false },
            { startSec: 29.0, durSec: 4.5,  action: 'sit',   emotion: 'happy',    speaking: false, listening: true  },
            { startSec: 33.5, durSec: 4.5,  action: 'wave',  emotion: 'happy',    speaking: true,  listening: false },
          ],
        },
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-b',
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'neutral',
          timeline: [
            { startSec: 0,    durSec: 8.5,  action: 'walk', emotion: 'neutral' },
            { startSec: 8.5,  durSec: 5.0,  action: 'idle', emotion: 'happy',    speaking: true,  listening: false },
            { startSec: 13.5, durSec: 5.5,  action: 'idle', emotion: 'happy',    speaking: false, listening: true  },
            { startSec: 19.0, durSec: 5.0,  action: 'idle', emotion: 'thinking', speaking: true,  listening: false },
            { startSec: 24.0, durSec: 5.0,  action: 'idle', emotion: 'solemn',   speaking: false, listening: true  },
            { startSec: 29.0, durSec: 4.5,  action: 'idle', emotion: 'happy',    speaking: true,  listening: false },
            { startSec: 33.5, durSec: 4.5,  action: 'idle', emotion: 'happy',    speaking: false, listening: true  },
          ],
        },
      ],
    },

    // ── SCENE 2: Pelataran Masjid Desa (38s–60s) ──────────────────────────
    {
      id: 'sc2-masjid',
      title: 'Cahaya Berkah di Masjid Desa',
      worldId: 'village',
      locationId: 'mosque',
      stagingPresetId: 'courtyard-walk',
      cameraSide: -1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'birds',
      startSec: 38,
      durationSec: 22,
      axis: ['anak', 'kakek'],
      shots: sc2Shots,  // ← generated oleh ShotSequencer
      dialogue: sc2Dialogue,
      dalilCard: {
        arabic: 'كُلُّ مَعْرُوفٍ صَدَقَةٌ',
        transliteration: 'Kullu ma\'rūfin shadaqah.',
        translation: 'Setiap perbuatan baik adalah sedekah.',
        source: 'HR. Bukhari no. 6021 & Muslim no. 1005',
      },
      hikmahCard: {
        title: '3 Mutiara Hikmah',
        points: [
          'Jangan pernah meremehkan seteguk air dan senyuman tulus kepada sesama.',
          'Sedekah bukan tentang seberapa banyak hartamu, tapi seberapa tulus hatimu.',
          'Langkah menuju kebaikan bersama akan melipatgandakan pahala dan keberkahan hidup.',
        ],
      },
      cast: [
        {
          castId: 'kakek',
          name: 'Kakek Salman',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'solemn',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=38s, sceneElapsed = currentTime - 38
            { startSec: 0.0,  durSec: 7.0,  action: 'walk', emotion: 'solemn' },
            { startSec: 7.0,  durSec: 15.0, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
          ],
        },
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-b',
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'happy',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=38s, sceneElapsed = currentTime - 38
            { startSec: 0.0,  durSec: 7.0,  action: 'walk', emotion: 'happy' },
            { startSec: 7.0,  durSec: 15.0, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
          ],
        },
      ],
    },
  ],
};
