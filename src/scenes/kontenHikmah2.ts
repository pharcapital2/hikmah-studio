import type { ProductionStory } from './types';
import { generateShotSequence } from '../cinematography/ShotSequencer';
import type { Shot } from '../cinematography/shotTypes';

/**
 * Konten Hikmah #2: "Sebutir Padi dan Sabar yang Berbuah Manis"
 * Durasi: 60 Detik (Storytelling Sinematik Berbasis ShotSequencer Cerdas, 3-Point Lighting, & Mimik Wajah)
 *
 * Sesuai Arsitektur 3 Lapis:
 * - Lapis 1 (WORLD): VillageMap ('rice-terraces' & 'bamboo-bridge')
 * - Lapis 2 (CAST): 'petani' (Pak Tani Sabar) & 'anak' (Adik Fajar)
 * - Lapis 3 (PRODUCTION): Data shot otomatis di-generate oleh ShotSequencer cerdas
 *
 * Metodologi Sinematografi Terkini:
 * 1. Establishing Shot Panorama Sawah Bertingkat (EWS)
 * 2. Master Two-Shot (Membidik KEDUA karakter bersama, bukan zoom terburu-buru)
 * 3. Over-The-Shoulder (OTS) bergantian dengan depth of field alami
 * 4. Close-Up (CU) bermotif pushIn HANYA saat kalimat puncak hikmah
 * 5. Reaction Shot CU menangkap ekspresi pendengar saat meresapi nasihat
 * 6. Closure Two-Shot & Crane Reveal saat Dalil Sabda Rasulullah ditampilkan
 */

// ─── Dialogue Scene 1: Sawah Bertingkat (0s - 38s) ───────────────────────────
const sc1Dialogue = [
  {
    id: 'k2-d1',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 0.8,
    durSec: 4.0,
    text: 'Senja berarak perlahan di atas hamparan sawah berundak. Angin sejuk membelai bulir-bulir padi yang mulai menguning.',
  },
  {
    id: 'k2-d2',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 5.2,
    durSec: 3.4,
    text: 'Pak Tani Sabar menyeka keringat di saung bambu, tersenyum memandangi bumi yang ia rawat dengan ketulusan.',
  },
  {
    id: 'k2-d3',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 9.0,
    durSec: 4.8,
    text: '“Assalamualaikum Pak Tani... Seharian mencangkul dan merawat sawah, apa tidak terasa lelah sekali Pak?”',
    emotion: 'happy' as const,
  },
  {
    id: 'k2-d4',
    speakerId: 'petani',
    speakerName: 'Pak Tani Sabar',
    startSec: 14.2,
    durSec: 4.6,
    text: '“Wa\'alaikumsalam Fajar... Lelah itu pasti ada, Nak. Tapi rasa syukur kepada Allah jauh lebih besar dari lelah ini.”',
    emotion: 'happy' as const,
  },
  {
    id: 'k2-d5',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 19.2,
    durSec: 4.6,
    text: '“Bagaimana bila musim kemarau datang atau hama menyerang Pak? Apakah Pak Tani tidak sedih dan cemas?”',
    emotion: 'thinking' as const,
  },
  {
    id: 'k2-d6',
    speakerId: 'petani',
    speakerName: 'Pak Tani Sabar',
    startSec: 24.2,
    durSec: 5.0,
    text: '“Wahai Fajar, tugas kita hanya berusaha dan menanam. Rezeki dan hasil adalah milik Allah. Tiada ikhtiar tulus yang sia-sia.”',
    emotion: 'solemn' as const,
  },
  {
    id: 'k2-d7',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 29.5,
    durSec: 4.2,
    text: '“Masya Allah... Jadi sabar dan tawakkal itulah yang membuat setiap butir padi menjadi berkah ya Pak?”',
    emotion: 'happy' as const,
  },
  {
    id: 'k2-d8',
    speakerId: 'petani',
    speakerName: 'Pak Tani Sabar',
    startSec: 34.0,
    durSec: 3.8,
    text: '“Benar sekali, Nak. Lihatlah fajar senja kian teduh, mari kita pulang dan bersiap menuju musholla.”',
    emotion: 'happy' as const,
  },
];

// ─── Dialogue Scene 2: Jembatan Bambu & Tepi Sungai (38s - 60s) ──────────────
const sc2Dialogue = [
  {
    id: 'k2-d9',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 38.5,
    durSec: 4.8,
    text: 'Keduanya melangkah pulang menyusuri jembatan bambu, diiringi gemericik aliran sungai yang menenteramkan jiwa.',
  },
  {
    id: 'k2-d10',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 44.0,
    durSec: 5.2,
    text: 'Hati yang rida dengan ketetapan Ilahi akan selalu memetik ketenangan, bagaikan tanah subur yang senantiasa berbuah kebaikan.',
  },
  {
    id: 'k2-d11',
    speakerId: 'narator',
    speakerName: 'Hikmah & Dalil',
    startSec: 50.5,
    durSec: 9.0,
    text: 'Rasulullah ﷺ bersabda: "Sungguh menakjubkan urusan seorang mukmin, sesungguhnya semua perkaranya adalah kebaikan baginya..." (HR. Muslim no. 2999)',
  },
];

// ─── Auto-generate shots via ShotSequencer (Gaya dramatic-shorts) ───────────
const sc1Shots = generateShotSequence(
  {
    dialogue: sc1Dialogue,
    cast: [
      { castId: 'petani', defaultAction: 'sit' },
      { castId: 'anak', defaultAction: 'walk' },
    ],
    sceneDurationSec: 38,
    sceneStartSec: 0,
    axis: ['anak', 'petani'],
    style: 'dramatic-shorts',
  },
  'k2-sc1'
);

const sc2Shots: Shot[] = [
  // 0.0–4.5s: Worm's-eye low-angle tracking walk di jembatan bambu
  {
    id: 'k2-sc2-s1-wormwalk',
    target: 'both',
    size: 'MS',
    angle: 'low',
    elevation: 'wormEye',
    headroom: 'tight',
    move: 'dollyTrack',
    lensMm: 38,
    anchor: 'medium',
    startSec: 38,
    durSec: 4.5,
    twoShot: true,
    deepFocus: true,
    motive: 'Worm-eye low-angle dolly track — langkah pulang melintasi jembatan bambu',
  },
  // 4.5–8.5s: High-angle kontras elevasi mengamati keduanya melintasi sungai
  {
    id: 'k2-sc2-s2-highwalk',
    target: 'both',
    size: 'WS',
    angle: 'high',
    elevation: 'high',
    move: 'microPush',
    lensMm: 35,
    anchor: 'wide',
    startSec: 42.5,
    durSec: 4.0,
    twoShot: true,
    deepFocus: true,
    motive: 'High-angle kontras elevasi — merenungi aliran sungai dan ketenangan hati',
  },
  // 8.5–12.5s: MCU Pak Tani berdoa dengan slow contemplative push-in
  {
    id: 'k2-sc2-s3-cu-petani',
    target: 'petani',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    azimuthDeg: 152,
    startSec: 46.5,
    durSec: 4.0,
    deepFocus: true,
    motive: 'MCU Pak Tani berdoa — contemplative micro push-in penuh tawakkal',
  },
  // 12.5–16.0s: CU Fajar berdoa khusyuk meresapi dalil
  {
    id: 'k2-sc2-s4-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 68,
    azimuthDeg: 28,
    startSec: 50.5,
    durSec: 3.5,
    deepFocus: true,
    motive: 'CU Fajar — breathing push-in khusyuk meresapi dalil Rasulullah',
  },
  // 16.0–22.0s: Crane-back finale 4-plane vertical sunset
  {
    id: 'k2-sc2-s5-crane',
    target: 'both',
    size: 'WS',
    angle: 'high',
    elevation: 'high',
    move: 'craneBack',
    lensMm: 32,
    anchor: 'aerial',
    startSec: 54.0,
    durSec: 6.0,
    twoShot: true,
    deepFocus: true,
    motive: 'Crane-back finale — mundur tinggi membingkai jembatan, pepohonan, dan langit senja',
  },
];

// ─── Story Object: Konten Hikmah #2 ──────────────────────────────────────────
export const KONTEN_HIKMAH_2: ProductionStory = {
  id: 'sabar-sebutir-padi',
  title: 'Sebutir Padi dan Sabar yang Berbuah Manis',
  theme: 'Sabar, Syukur, dan Berkah Tawakkal',
  summary:
    'Adik Fajar belajar dari Pak Tani Sabar di hamparan sawah berundak desa bahwa ikhtiar tulus yang diiringi tawakkal kepada Allah akan senantiasa berbuah manis dan menentramkan jiwa.',
  totalDurationSec: 60,
  cinematographyStyle: 'dramatic-shorts',
  scenes: [
    // ── SCENE 1: Sawah Bertingkat & Saung Bambu (0s - 38s) ───────────────────
    {
      id: 'sc1-sawah',
      title: 'Kearifan di Saung Sawah Berundak',
      worldId: 'village',
      locationId: 'rice-terraces',
      stagingPresetId: 'saung-dialog',
      cameraSide: -1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'wind',
      startSec: 0,
      durationSec: 38,
      axis: ['anak', 'petani'],
      shots: sc1Shots,
      dialogue: sc1Dialogue,
      cast: [
        {
          castId: 'petani',
          name: 'Pak Tani Sabar',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'sit',
          defaultEmotion: 'solemn',
          timeline: [
            // 0–9s: duduk melepas lelah di saung bambu, diam menyimak suasana senja
            { startSec: 0,    durSec: 9.0,  action: 'sit',   emotion: 'solemn',   speaking: false, listening: false },
            // 9–14s: menyimak salam dan sapaan hangat dari Adik Fajar
            { startSec: 9.0,  durSec: 5.0,  action: 'sit',   emotion: 'solemn',   speaking: false, listening: true  },
            // 14–19s: menjawab salam dengan senyum dan rasa syukur
            { startSec: 14.0, durSec: 5.0,  action: 'sit',   emotion: 'happy',    speaking: true,  listening: false },
            // 19–24s: mendengarkan pertanyaan Fajar tentang kemarau dan hama
            { startSec: 19.0, durSec: 5.0,  action: 'sit',   emotion: 'thinking', speaking: false, listening: true  },
            // 24–29.5s: menyampaikan nasihat hikmah tentang ikhtiar dan tawakkal (puncak emosi)
            { startSec: 24.0, durSec: 5.5,  action: 'sit',   emotion: 'solemn',   speaking: true,  listening: false },
            // 29.5–34s: tersenyum hangat menyimak pemahaman Fajar
            { startSec: 29.5, durSec: 4.5,  action: 'sit',   emotion: 'happy',    speaking: false, listening: true  },
            // 34–38s: melambaikan tangan mengajak pulang bersiap ke musholla
            { startSec: 34.0, durSec: 4.0,  action: 'wave',  emotion: 'happy',    speaking: true,  listening: false },
          ],
        },
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-b',
          initialPos: [111.0, 3.8, -64.0],
          targetPos: [114.2, 3.8, -59.5],
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'neutral',
          timeline: [
            { startSec: 0,    durSec: 9.0,  action: 'walk', emotion: 'neutral',  targetPos: [114.2, 3.8, -59.5] },
            { startSec: 9.0,  durSec: 5.0,  action: 'idle', emotion: 'happy',    speaking: true,  listening: false },
            { startSec: 14.0, durSec: 5.0,  action: 'idle', emotion: 'happy',    speaking: false, listening: true  },
            { startSec: 19.0, durSec: 5.0,  action: 'idle', emotion: 'thinking', speaking: true,  listening: false },
            { startSec: 24.0, durSec: 5.5,  action: 'idle', emotion: 'solemn',   speaking: false, listening: true  },
            { startSec: 29.5, durSec: 4.5,  action: 'idle', emotion: 'happy',    speaking: true,  listening: false },
            { startSec: 34.0, durSec: 4.0,  action: 'idle', emotion: 'happy',    speaking: false, listening: true  },
          ],
        },
      ],
    },

    // ── SCENE 2: Jembatan Bambu & Tepi Sungai (38s - 60s) ───────────────────
    {
      id: 'sc2-jembatan-bambu',
      title: 'Melangkah Pulang di Jembatan Bambu',
      worldId: 'village',
      locationId: 'bamboo-bridge',
      stagingPresetId: 'bridge-walk',
      cameraSide: 1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'river',
      startSec: 38,
      durationSec: 22,
      axis: ['anak', 'petani'],
      shots: sc2Shots,
      dialogue: sc2Dialogue,
      dalilCard: {
        arabic: 'عَجَبًا لأَمْرِ الْمُؤْمِنِ إِنَّ أَمْرَهُ كُلَّهُ خَيْرٌ',
        transliteration: "‘Ajaban li-amril mu'min, inna amrahu kullahu khair.",
        translation:
          'Sungguh menakjubkan urusan seorang mukmin, sesungguhnya semua perkaranya adalah kebaikan baginya.',
        source: 'HR. Muslim no. 2999',
      },
      hikmahCard: {
        title: '3 Hikmah Kesabaran & Tawakkal',
        points: [
          'Tugas seorang hamba adalah berikhtiar sungguh-sungguh; hasil akhir adalah wewenang Allah semata.',
          'Sabar dan syukur adalah sepasang sayap orang beriman yang melahirkan ketenangan sejati.',
          'Setiap bulir padi dan tetes keringat yang halal dipenuhi berkah dan bernilai ibadah.',
        ],
      },
      cast: [
        {
          castId: 'petani',
          name: 'Pak Tani Sabar',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'happy',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=38s, sceneElapsed = currentTime - 38
            { startSec: 0.0,  durSec: 10.0, action: 'walk', emotion: 'happy' },
            { startSec: 10.0, durSec: 12.0, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
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
            { startSec: 0.0,  durSec: 10.0, action: 'walk', emotion: 'happy' },
            { startSec: 10.0, durSec: 12.0, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
          ],
        },
      ],
    },
  ],
};
