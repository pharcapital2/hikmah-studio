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

// ─── Variasi two-shot Scene 1 (poles sutradara) ────────────────────────────
// Probe computePose baseline: ketiga MS two-shot statis ShotSequencer
// (sc1-auto-2/6/10) memakai pose kamera IDENTIK — camPos (8.4, 1.0, 60.1),
// aim (7.0, 0.8, 54.0) — sehingga tiga panel contact sheet tampak kembar
// (gagal Pertanyaan 5 Ruang Editing). Variasikan two-shot ke-2 dan ke-3:
// ke-2 diganti menjadi OTS MCU pendengar (kakek menyimak), ke-3 digeser
// azimuth-nya ke 65° + micro push-in. Sisi kamera 180° tetap sama, hanya
// sudut & ukuran yang berubah. (MCU two-shot 50mm sempat dicoba untuk
// ke-2, tapi probe menunjukkan kepala kakek keluar frame — NDC x 1.04 —
// sehingga OTS pendengar dipilih sebagai gantinya.)
const sc1TwoShots = sc1Shots.filter((s) => s.twoShot && s.size === 'MS');
if (sc1TwoShots[1]) {
  // Ganti two-shot master ke-2 menjadi OTS MCU pendengar: pada momen ini
  // anak sedang bicara (d5, thinking) dan kakek menyimak — reaction shot
  // pendengar (Playbook Bab 4 Aturan 3) dengan bahu anak sebagai foreground.
  // Probe: kepala kakek NDC (0.03, 0.24), frontal 0.98, jarak 3.4m.
  sc1TwoShots[1].target = 'kakek';
  sc1TwoShots[1].over = 'anak';
  sc1TwoShots[1].twoShot = false;
  sc1TwoShots[1].size = 'MCU';
  sc1TwoShots[1].angle = 'ots';
  sc1TwoShots[1].lensMm = 55;
  sc1TwoShots[1].move = 'microPush';
  sc1TwoShots[1].azimuthDeg = 145;
  sc1TwoShots[1].motive =
    'OTS MCU pendengar — kakek menyimak kalimat ragu Fajar, bahu anak sebagai foreground, wajah kakek frontal di Zona Emas';
}
if (sc1TwoShots[2]) {
  sc1TwoShots[2].azimuthDeg = 65;
  sc1TwoShots[2].move = 'microPush';
  sc1TwoShots[2].motive =
    'Two-shot dari azimuth 65° + micro push-in — sudut berbeda untuk variasi ritme visual panel ke-3';
}

// Scene 2: 38s–60s, hanya narasi → shot manual (ShotSequencer tidak efektif untuk narasi murni)
// Shot disusun manual mengikuti kaidah sinematografi: masuk → berjalan → doa → crane closure

const sc2Shots: Shot[] = [
  // 0.0–4.5s: WS dua karakter berjalan memasuki masjid (establishing)
  {
    id: 'sc2-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    anchor: 'wide',
    startSec: 38,
    durSec: 4.5,
    twoShot: true,
    motive: 'Establishing — dua karakter berjalan menuju masjid, pan mengikuti',
  },
  // 4.5–9.0s: MCU two-shot keduanya berjalan masuk pelataran (dikencangkan
  // dari MS 5.0s: wajah masuk Zona Emas, micro push-in memberi gerak)
  {
    id: 'sc2-s2-twowalk',
    target: 'both',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 50,
    anchor: 'medium',
    startSec: 42.5,
    durSec: 4.5,
    twoShot: true,
    motive: 'Two-shot MCU berjalan — dikencangkan ke 50mm + micro push-in agar wajah terbaca saat memasuki pelataran',
  },
  // 9.0–14.5s: MCU kakek — wajah khusyuk, siap berdoa (kalimat narator hikmah)
  {
    id: 'sc2-s3-cu-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'pushIn',
    lensMm: 55,
    azimuthDeg: 155,
    startSec: 47,
    durSec: 5.5,
    motive: 'MCU kakek berdoa — wajah khusyuk, narator membacakan hikmah',
  },
  // 14.5–16.5s: CU anak — wajah solemn menyimak dan meresapi (reaction shot
  // dipendekkan ke 2.0s sesuai Playbook Bab 4: CU reaksi 1.2–2.2s)
  {
    id: 'sc2-s4-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    azimuthDeg: 25,
    startSec: 52.5,
    durSec: 2.0,
    motive: 'CU reaksi anak — solemn menyimak dalil yang dibacakan narator',
  },
  // 16.5–22s: Slow pull-out closure — menggantikan crane: probe baseline
  // menunjukkan crane menaikkan aim (+1.8m) sehingga kepala kedua karakter
  // tenggelam ke NDC Y -0.08/-0.20 di bawah Zona Emas pada jarak 9–10.4m.
  // Pull-out eye-level 5.5s menjaga wajah tetap di tengah frame sambil
  // membuka langit senja untuk kartu dalil.
  {
    id: 'sc2-s5-crane',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 35,
    anchor: 'wide',
    startSec: 54.5,
    durSec: 5.5,
    twoShot: true,
    motive: 'Slow pull-out closure — kamera mundur perlahan, wajah tetap di Zona Emas, langit senja terbuka untuk dalil',
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
