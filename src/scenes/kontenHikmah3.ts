import type { ProductionStory } from './types';
import type { Shot } from '../cinematography/shotTypes';

/**
 * Konten Hikmah #3: "Dompet yang Jatuh di Pasar Sore"
 * Durasi: 115.4 detik (mengikuti durasi voice-over Gemini 3.8 Flash TTS —
 * naskah yang dibacakan ~107 detik; total TIDAK BOLEH lebih dari 2 menit
 * per keputusan Kholik 2026-11-20).
 * Tema: Kejujuran — hikmah baru, bukan ceramah: cerita sehari-hari dulu,
 * hikmah baru dibuka di akhir (narasi penutup + kartu dalil).
 *
 * Penjadwalan ulang (2026-11-20): semua jendela dialog diukur dari durasi
 * suara TTS yang sebenarnya (file WAV di output/vo/, diukur dengan detektor
 * energi — durasi bicara setelah memangkas hening awal/akhir):
 * d1 9.6s, d2 6.7s, d3 6.5s, d4 7.3s, d5 3.5s, d6 6.3s, d7 6.0s, d8 9.1s,
 * d9 2.6s, d10 7.8s, d11 9.4s, d12 21.2s, ajakan komentar 4.8s.
 * Jendela = durasi bicara + 0.4s bantalan; jeda 0.5s antar baris.
 *
 * Sesuai Arsitektur 3 Lapis:
 * - Lapis 1 (WORLD): VillageMap ('market' & 'mosque')
 * - Lapis 2 (CAST): 'anak' (Adik Fajar) & 'ibu' (Bu Aminah)
 * - Lapis 3 (PRODUCTION): Data shot otomatis di-generate oleh ShotSequencer cerdas
 *
 * Alur 5 beat (Playbook Bab 3):
 * 1. Hook — Fajar menemukan dompet tergeletak di pasar yang mulai sepi.
 * 2. Godaan — uang di dalamnya banyak; tak ada yang memperhatikan.
 * 3. Kegelisahan — Bu Aminah datang mencari dompetnya yang hilang.
 * 4. Pilihan — Fajar mengembalikan dompet itu, menolak imbalan.
 * 5. Hikmah — pulang dengan tangan kosong, hati yang ringan.
 */

// ─── Dialogue Scene 1: Pasar Tradisional & Warung (0s - 68s) ───────────────
// Jendela = durasi bicara TTS + 0.4s bantalan; jeda 0.5s antar baris.
const sc1Dialogue = [
  {
    id: 'k3-d1',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 0.8,
    durSec: 10.0,
    text: 'Sore itu, pasar mulai sepi. Di antara keranjang sayur dan langkah orang pulang, Fajar melihat sesuatu tergeletak di tanah.',
  },
  {
    id: 'k3-d2',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 11.3,
    durSec: 7.1,
    text: 'Sebuah dompet. Fajar menoleh ke kanan dan ke kiri — tak ada yang memperhatikan.',
  },
  {
    id: 'k3-d3',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 18.9,
    durSec: 6.9,
    text: '“Dompet... siapa yang menjatuhkan ini? Uangnya... banyak sekali.”',
    emotion: 'thinking' as const,
  },
  {
    id: 'k3-d4',
    speakerId: 'ibu',
    speakerName: 'Bu Aminah',
    startSec: 26.3,
    durSec: 7.7,
    text: '“Fajar... kamu lihat dompet Ibu, Nak? Tadi Ibu letakkan di atas karung beras, sekarang tidak ada.”',
    emotion: 'sad' as const,
  },
  {
    id: 'k3-d5',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 34.5,
    durSec: 3.9,
    text: '“Bu Aminah... Ibu kehilangan dompet?”',
    emotion: 'thinking' as const,
  },
  {
    id: 'k3-d6',
    speakerId: 'ibu',
    speakerName: 'Bu Aminah',
    startSec: 38.9,
    durSec: 6.7,
    text: '“Iya, Nak. Uang belanja seminggu ada di dalamnya... Ibu sudah tanya ke sana kemari.”',
    emotion: 'thinking' as const,
  },
  {
    id: 'k3-d7',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 46.1,
    durSec: 6.4,
    text: '“Bu... ini dompet Ibu, kan? Tadi jatuh di dekat karung beras. Ini, Bu.”',
    emotion: 'solemn' as const,
  },
  {
    id: 'k3-d8',
    speakerId: 'ibu',
    speakerName: 'Bu Aminah',
    startSec: 53.0,
    durSec: 9.5,
    text: '“Ya Allah... ini dompet Ibu! Terima kasih banyak, Nak. Nih, buat jajan — Ibu ikhlas.”',
    emotion: 'happy' as const,
  },
  {
    id: 'k3-d9',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 63.0,
    durSec: 3.0,
    text: '“Tidak usah, Bu. Ini memang punya Ibu.”',
    emotion: 'happy' as const,
  },
];

// ─── Dialogue Scene 2: Pelataran Masjid Desa (68s - 115.4s) ─────────────────
const sc2Dialogue = [
  {
    id: 'k3-d10',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 68.5,
    durSec: 8.2,
    text: 'Mereka pulang bersama menyusuri jalan desa. Fajar tidak membawa apa-apa — kecuali hati yang ringan.',
  },
  {
    id: 'k3-d11',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 77.2,
    durSec: 9.8,
    text: 'Kejujuran tidak pernah membuat kita rugi. Ia mengembalikan ketenangan — kepada orang yang kehilangan, dan kepada diri kita sendiri.',
  },
  {
    id: 'k3-d12',
    speakerId: 'narator',
    speakerName: 'Hikmah & Dalil',
    startSec: 87.5,
    durSec: 21.6,
    text: 'Rasulullah ﷺ bersabda: "Hendaklah kalian berlaku jujur, karena sesungguhnya kejujuran itu membawa kepada kebaikan, dan kebaikan itu membawa ke surga." (HR. Bukhari no. 6094 & Muslim no. 2607)',
  },
];

// ─── Shot manual Scene 1 (menggantikan generateShotSequence) ───────────────
// Alasan (review Kholik 2026-11-20): ShotSequencer dramatic-shorts terlalu
// sering memakai single shot pembicara — penonton tidak melihat mimik wajah
// pendengar. Aturan liputan baru (Playbook §4): setiap baris dialog WAJIB
// punya minimal satu shot yang menampilkan wajah pendengar (reaction MCU/CU
// atau two-shot dengan kedua wajah terbaca). OTS saja tidak cukup — OTS
// menampilkan wajah pembicara + bahu pendengar, bukan wajah pendengar.
// Pola per baris: shot pembicara (OTS MCU) + shot pendengar (MCU eye-level)
// atau two-shot MCU; klimaks d7 tetap memakai trio buildup → punch → react.
// Semua shot menutup rapat 0–68s tanpa jeda (audit FAIL bila ada celah).
const sc1Shots: Shot[] = [
  {
    id: 'k3-sc1-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    anchor: 'wide',
    startSec: 0,
    durSec: 5.0,
    twoShot: true,
    motive: 'Enter pasar sore — WS pan kanan, Fajar berjalan masuk menuju warung (narasi d1)',
  },
  {
    id: 'k3-sc1-s2-hook-cu',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 5.0,
    durSec: 3.2,
    motive: 'Hook CU Fajar — mata membesar melihat dompet tergeletak (narasi d1)',
  },
  {
    id: 'k3-sc1-s3-two-ms',
    target: 'both',
    size: 'MS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 40,
    startSec: 8.2,
    durSec: 3.1,
    twoShot: true,
    motive: 'Two-shot MS — Fajar melangkah mendekati dompet, Bu Aminah di latar (akhir d1)',
  },
  {
    id: 'k3-sc1-s4-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 11.3,
    durSec: 3.2,
    motive: 'CU Fajar — "Sebuah dompet." (narasi d2)',
  },
  {
    id: 'k3-sc1-s5-ots-anak',
    target: 'anak',
    size: 'MS',
    angle: 'ots',
    over: 'ibu',
    move: 'microPush',
    lensMm: 55,
    startSec: 14.5,
    durSec: 4.4,
    motive: 'OTS MS Fajar — menoleh ke kanan dan ke kiri, tak ada yang memperhatikan (d2)',
  },
  {
    id: 'k3-sc1-s6-ots-anak2',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'ibu',
    move: 'microPush',
    lensMm: 55,
    startSec: 18.9,
    durSec: 3.4,
    motive: 'OTS MCU Fajar — bahu Bu Aminah di foreground, Fajar menimbang-nimbang (d3)',
  },
  {
    id: 'k3-sc1-s7-listen-ibu',
    target: 'ibu',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 22.3,
    durSec: 4.0,
    motive: 'Reaction MCU Bu Aminah — wajah cemas menyimak gumaman Fajar (aturan liputan pendengar)',
  },
  {
    id: 'k3-sc1-s8-ots-ibu',
    target: 'ibu',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 26.3,
    durSec: 3.7,
    motive: 'OTS MCU Bu Aminah — bahu Fajar di foreground, Ibu bertanya kehilangan dompet (d4)',
  },
  {
    id: 'k3-sc1-s9-listen-anak',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 30.0,
    durSec: 4.5,
    motive: 'Reaction MCU Fajar — wajah berpikir mendengar Bu Aminah kehilangan dompet',
  },
  {
    id: 'k3-sc1-s10-ots-anak3',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'ibu',
    move: 'microPush',
    lensMm: 55,
    startSec: 34.5,
    durSec: 1.9,
    motive: 'OTS MCU Fajar — bertanya memastikan (d5)',
  },
  {
    id: 'k3-sc1-s11-two-mcu',
    target: 'both',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 50,
    startSec: 36.4,
    durSec: 2.5,
    twoShot: true,
    motive: 'Two-shot MCU — kedua wajah terbaca saat Fajar bertanya memastikan (d5)',
  },
  {
    id: 'k3-sc1-s12-ots-ibu2',
    target: 'ibu',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 38.9,
    durSec: 3.7,
    motive: 'OTS MCU Bu Aminah — menjelaskan isi dompet, uang belanja seminggu (d6)',
  },
  {
    id: 'k3-sc1-s13-listen-anak2',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 42.6,
    durSec: 3.5,
    motive: 'Reaction MCU Fajar — menunduk mendengar, keputusan mulai terbentuk',
  },
  {
    id: 'k3-sc1-s14-climax-buildup',
    target: 'anak',
    size: 'MCU',
    angle: 'low',
    elevation: 'low',
    headroom: 'oppressive',
    move: 'microPush',
    lensMm: 55,
    startSec: 46.1,
    durSec: 2.4,
    motive: 'Build-up ketegangan — MCU sudut rendah menuju pengembalian dompet (d7)',
  },
  {
    id: 'k3-sc1-s15-climax-punch',
    target: 'anak',
    size: 'CU',
    angle: 'dutch',
    dutchDeg: -7,
    move: 'axialPunch',
    lensMm: 46,
    impactFx: 'speedlines',
    startSec: 48.5,
    durSec: 1.8,
    motive: 'Puncak hikmah — axial punch-in + Dutch tilt + speedlines',
  },
  {
    id: 'k3-sc1-s16-climax-react',
    target: 'ibu',
    size: 'CU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 68,
    startSec: 50.3,
    durSec: 2.7,
    motive: 'Quiet CU reaksi Bu Aminah — terkejut, mata membesar menerima dompetnya',
  },
  {
    id: 'k3-sc1-s17-ots-ibu3',
    target: 'ibu',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 53.0,
    durSec: 3.8,
    motive: 'OTS MCU Bu Aminah — lega dan berterima kasih, menawarkan imbalan (d8)',
  },
  {
    id: 'k3-sc1-s18-listen-anak3',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 56.8,
    durSec: 3.0,
    motive: 'Reaction MCU Fajar — senyum tenang menyimak ucapan terima kasih',
  },
  {
    id: 'k3-sc1-s19-two-mcu2',
    target: 'both',
    size: 'MCU',
    angle: 'eye',
    move: 'dollyTrack',
    lensMm: 50,
    startSec: 59.8,
    durSec: 3.2,
    twoShot: true,
    motive: 'Two-shot MCU — kedua wajah lega, Fajar tersenyum mendengar tawaran imbalan',
  },
  {
    id: 'k3-sc1-s20-ots-anak4',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'ibu',
    move: 'microPush',
    lensMm: 55,
    startSec: 63.0,
    durSec: 2.3,
    motive: 'OTS MCU Fajar — menolak imbalan dengan tenang (d9)',
  },
  {
    id: 'k3-sc1-s21-two-close',
    target: 'both',
    size: 'MS',
    angle: 'eye',
    move: 'dollyTrack',
    lensMm: 40,
    startSec: 65.3,
    durSec: 2.7,
    twoShot: true,
    motive: 'Two-shot MS hangat — menutup percakapan, kedua tokoh tersenyum (d9 + closure)',
  },
];

// Scene 2: shot manual (narasi + hikmah, tanpa dialog antar-karakter) —
// ritme teruji dari Konten 1 Scene 2: enter WS → twowalk MCU → CU ibu →
// CU reaksi anak → slow pull-out penutup (bukan crane, agar kepala tidak
// tenggelam di bawah Zona Emas). Semua shot menutup rapat 68–115.4s.
const sc2Shots: Shot[] = [
  {
    id: 'k3-sc2-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    startSec: 68.0,
    durSec: 4.9,
    twoShot: true,
    motive: 'Enter pelataran masjid — WS pan kanan, keduanya melangkah pulang bersama (d10)',
  },
  {
    id: 'k3-sc2-s2-twowalk',
    target: 'both',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 50,
    startSec: 72.9,
    durSec: 4.3,
    twoShot: true,
    motive: 'Two-walk MCU — dikencangkan ke 50mm agar wajah terbaca saat berjalan (d10)',
  },
  {
    id: 'k3-sc2-s3-cu-ibu',
    target: 'ibu',
    size: 'MCU',
    angle: 'eye',
    move: 'pushIn',
    lensMm: 55,
    startSec: 77.2,
    durSec: 5.0,
    motive: 'MCU Bu Aminah — push-in lembut, wajah lega dan bersyukur (d11)',
  },
  {
    id: 'k3-sc2-s4-two-mcu',
    target: 'both',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 50,
    startSec: 82.2,
    durSec: 4.8,
    twoShot: true,
    motive: 'Two-shot MCU — kedua wajah tenang meresapi ketenangan (d11)',
  },
  {
    id: 'k3-sc2-s5-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 87.0,
    durSec: 3.4,
    motive: 'CU Fajar — senyum tenang mendengar sabda Rasulullah (awal d12)',
  },
  {
    id: 'k3-sc2-s6-mcu-ibu',
    target: 'ibu',
    size: 'MCU',
    angle: 'eye',
    move: 'pushIn',
    lensMm: 55,
    startSec: 90.4,
    durSec: 5.0,
    motive: 'MCU Bu Aminah — push-in, wajah khusyuk mendengar hadis (d12)',
  },
  {
    id: 'k3-sc2-s7-two-ws',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 35,
    anchor: 'wide',
    startSec: 95.4,
    durSec: 5.0,
    twoShot: true,
    motive: 'Two-shot WS slow pull — keduanya berdoa di pelataran masjid (d12)',
  },
  {
    id: 'k3-sc2-s8-cu-anak2',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 100.4,
    durSec: 3.5,
    motive: 'CU Fajar — hati yang ringan, menutup hadis (d12)',
  },
  {
    id: 'k3-sc2-s9-closure',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 35,
    anchor: 'wide',
    startSec: 103.9,
    durSec: 5.2,
    twoShot: true,
    motive: 'Slow pull-out — membuka langit senja saat kartu hikmah & dalil muncul (103.9s)',
  },
  {
    id: 'k3-sc2-s10-final',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'static',
    lensMm: 35,
    anchor: 'wide',
    startSec: 109.1,
    durSec: 6.3,
    twoShot: true,
    motive: 'WS statis penutup — kartu dalil + ajakan komentar dibaca penonton, narator mengucapkannya',
  },
];

// ─── Story Object: Konten Hikmah #3 ──────────────────────────────────────────
export const KONTEN_HIKMAH_3: ProductionStory = {
  id: 'dompet-yang-jatuh',
  title: 'Dompet yang Jatuh di Pasar Sore',
  theme: 'Kejujuran dan Ketenangan Hati',
  summary:
    'Adik Fajar menemukan dompet Bu Aminah yang jatuh di pasar sore. Di antara godaan untuk menyimpannya dan rasa bersalah yang mengusik, ia memilih mengembalikannya — dan pulang dengan hati yang ringan.',
  totalDurationSec: 115.4,
  cinematographyStyle: 'dramatic-shorts',
  scenes: [
    // ── SCENE 1: Pasar Tradisional & Warung (0s - 68s) ───────────────────────
    {
      id: 'sc1-pasar',
      title: 'Dompet yang Jatuh di Pasar Sore',
      worldId: 'village',
      locationId: 'market',
      stagingPresetId: 'warung-chat',
      cameraSide: 1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'market',
      startSec: 0,
      durationSec: 68,
      axis: ['anak', 'ibu'],
      shots: sc1Shots,
      dialogue: sc1Dialogue,
      cast: [
        {
          castId: 'ibu',
          name: 'Bu Aminah',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'idle',
          defaultEmotion: 'sad',
          timeline: [
            // 0–18.9s: sudah cemas mencari dompetnya yang hilang (narasi d1–d2)
            { startSec: 0,    durSec: 18.9, action: 'idle', emotion: 'sad',       speaking: false, listening: false },
            // 18.9–25.8s: menyimak gumaman Fajar yang menemukan sesuatu (d3)
            { startSec: 18.9, durSec: 6.9,  action: 'idle', emotion: 'sad',       speaking: false, listening: true  },
            // 25.8–26.3s: jeda singkat
            { startSec: 25.8, durSec: 0.5,  action: 'idle', emotion: 'sad',       speaking: false, listening: false },
            // 26.3–34s: bertanya, berharap ada yang melihat dompetnya (d4)
            { startSec: 26.3, durSec: 7.7,  action: 'idle', emotion: 'sad',       speaking: true,  listening: false },
            // 34–34.5s: jeda singkat sebelum Fajar menjawab
            { startSec: 34.0, durSec: 0.5,  action: 'idle', emotion: 'sad',       speaking: false, listening: false },
            // 34.5–38.4s: mendengarkan pertanyaan Fajar (d5)
            { startSec: 34.5, durSec: 3.9,  action: 'idle', emotion: 'thinking',  speaking: false, listening: true  },
            // 38.4–38.9s: jeda singkat, menunduk memikirkan dompetnya
            { startSec: 38.4, durSec: 0.5,  action: 'idle', emotion: 'thinking',  speaking: false, listening: false },
            // 38.9–45.6s: menjelaskan isi dompet — uang belanja seminggu (d6)
            { startSec: 38.9, durSec: 6.7,  action: 'idle', emotion: 'thinking',  speaking: true,  listening: false },
            // 45.6–46.1s: jeda singkat sebelum Fajar mengulurkan dompet
            { startSec: 45.6, durSec: 0.5,  action: 'idle', emotion: 'thinking',  speaking: false, listening: false },
            // 46.1–52.5s: terkejut — Fajar mengulurkan dompetnya (d7)
            { startSec: 46.1, durSec: 6.4,  action: 'idle', emotion: 'surprised', speaking: false, listening: true  },
            // 52.5–53s: jeda singkat, senyum lega mulai muncul
            { startSec: 52.5, durSec: 0.5,  action: 'idle', emotion: 'happy',     speaking: false, listening: false },
            // 53–62.5s: lega dan berterima kasih, menawarkan imbalan (d8)
            { startSec: 53.0, durSec: 9.5,  action: 'idle', emotion: 'happy',     speaking: true,  listening: false },
            // 62.5–63s: jeda singkat sebelum Fajar menolak imbalan
            { startSec: 62.5, durSec: 0.5,  action: 'idle', emotion: 'happy',     speaking: false, listening: false },
            // 63–66s: tersenyum mendengar Fajar menolak imbalan (d9)
            { startSec: 63.0, durSec: 3.0,  action: 'idle', emotion: 'happy',     speaking: false, listening: true  },
            // 66–68s: tersenyum, menutup percakapan
            { startSec: 66.0, durSec: 2.0,  action: 'idle', emotion: 'happy',     speaking: false, listening: false },
          ],
        },
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-b',
          initialPos: [-31.5, -0.03, 17.5],
          targetPos: [-27.2, -0.03, 21.2],
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'neutral',
          timeline: [
            // 0–10s: berjalan masuk dari arah jalan pasar menuju warung
            { startSec: 0,    durSec: 10.0, action: 'walk', emotion: 'neutral',  targetPos: [-27.2, -0.03, 21.2] },
            // 10–18.9s: tiba di warung, menemukan dompet, menoleh ke kanan-kiri
            { startSec: 10.0, durSec: 8.9,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 18.9–25.8s: menemukan dompet, menimbang-nimbang (d3)
            { startSec: 18.9, durSec: 6.9,  action: 'idle', emotion: 'thinking', speaking: true,  listening: false },
            // 25.8–26.3s: jeda singkat, menatap dompet di tangannya
            { startSec: 25.8, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 26.3–34s: menyimak Bu Aminah yang kehilangan dompet (d4)
            { startSec: 26.3, durSec: 7.7,  action: 'idle', emotion: 'thinking', speaking: false, listening: true  },
            // 34–34.5s: jeda singkat sebelum bertanya
            { startSec: 34.0, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 34.5–38.4s: bertanya memastikan (d5)
            { startSec: 34.5, durSec: 3.9,  action: 'idle', emotion: 'thinking', speaking: true,  listening: false },
            // 38.4–38.9s: jeda singkat, menunduk mendengar jawaban Ibu
            { startSec: 38.4, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 38.9–45.6s: mendengarkan isi dompet — uang belanja seminggu (d6)
            { startSec: 38.9, durSec: 6.7,  action: 'idle', emotion: 'thinking', speaking: false, listening: true  },
            // 45.6–46.1s: jeda singkat, mengambil keputusan
            { startSec: 45.6, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 46.1–52.5s: mengembalikan dompet (puncak cerita, d7)
            { startSec: 46.1, durSec: 6.4,  action: 'idle', emotion: 'solemn',   speaking: true,  listening: false },
            // 52.5–53s: jeda singkat, tersenyum lega
            { startSec: 52.5, durSec: 0.5,  action: 'idle', emotion: 'happy',    speaking: false, listening: false },
            // 53–62.5s: menyimak ucapan terima kasih Bu Aminah (d8)
            { startSec: 53.0, durSec: 9.5,  action: 'idle', emotion: 'happy',    speaking: false, listening: true  },
            // 62.5–63s: jeda singkat sebelum menolak imbalan
            { startSec: 62.5, durSec: 0.5,  action: 'idle', emotion: 'happy',    speaking: false, listening: false },
            // 63–66s: menolak imbalan dengan tenang (d9)
            { startSec: 63.0, durSec: 3.0,  action: 'idle', emotion: 'happy',    speaking: true,  listening: false },
            // 66–68s: tersenyum, menutup percakapan
            { startSec: 66.0, durSec: 2.0,  action: 'idle', emotion: 'happy',    speaking: false, listening: false },
          ],
        },
      ],
    },

    // ── SCENE 2: Pelataran Masjid Desa (68s - 115.4s) ────────────────────────
    {
      id: 'sc2-masjid',
      title: 'Pulang dengan Hati yang Ringan',
      worldId: 'village',
      locationId: 'mosque',
      stagingPresetId: 'courtyard-walk',
      cameraSide: -1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'birds',
      startSec: 68,
      durationSec: 47.4,
      axis: ['anak', 'ibu'],
      shots: sc2Shots,
      dialogue: sc2Dialogue,
      dalilCard: {
        arabic: 'عَلَيْكُمْ بِالصِّدْقِ فَإِنَّ الصِّدْقَ يَهْدِي إِلَى الْبِرِّ',
        transliteration: "'Alaikum bish-shidq, fa innash-shidqa yahdī ilal-birr.",
        translation:
          'Hendaklah kalian berlaku jujur, karena sesungguhnya kejujuran itu membawa kepada kebaikan.',
        source: 'HR. Bukhari no. 6094 & Muslim no. 2607',
      },
      hikmahCard: {
        title: '3 Hikmah Kejujuran',
        points: [
          'Jujur tidak membuat kita kehilangan apa-apa — justru menjaga hati tetap tenang.',
          'Barang yang bukan milik kita, sekecil apa pun, tetap bukan milik kita.',
          'Orang yang jujur dipercaya — dan kepercayaan jauh lebih berharga daripada uang.',
        ],
      },
      commentPrompt: 'Kalau kamu jadi Fajar, apa yang kamu lakukan? Tulis di kolom komentar.',
      cast: [
        {
          castId: 'ibu',
          name: 'Bu Aminah',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'walk',
          defaultEmotion: 'happy',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=68s, sceneElapsed = currentTime - 68
            // 0–9.2s: berjalan pulang bersama (narasi d10)
            { startSec: 0.0,  durSec: 9.2,  action: 'walk', emotion: 'happy' },
            // 9.2–19.5s: tiba di pelataran masjid, berdiri tenang (narasi d11)
            { startSec: 9.2,  durSec: 10.3, action: 'idle', emotion: 'happy' },
            // 19.5–47.4s: berdoa khusyuk saat hadis dibacakan + ajakan komentar (d12)
            { startSec: 19.5, durSec: 27.9, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
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
            // Waktu scene-relative: Scene 2 mulai di t=68s, sceneElapsed = currentTime - 68
            // 0–9.2s: berjalan pulang bersama (narasi d10)
            { startSec: 0.0,  durSec: 9.2,  action: 'walk', emotion: 'happy' },
            // 9.2–19.5s: tiba di pelataran masjid, berdiri tenang (narasi d11)
            { startSec: 9.2,  durSec: 10.3, action: 'idle', emotion: 'happy' },
            // 19.5–47.4s: berdoa khusyuk saat hadis dibacakan + ajakan komentar (d12)
            { startSec: 19.5, durSec: 27.9, action: 'pray', emotion: 'solemn', speaking: false, listening: false },
          ],
        },
      ],
    },
  ],
};
