import type { ProductionStory } from './types';
import type { Shot } from '../cinematography/shotTypes';

/**
 * Konten Hikmah #4: "Yang Dibenci, Yang Menyelamatkan"
 * Durasi: 93.4 detik (mengikuti durasi voice-over Gemini 3.8 Flash TTS —
 * dialog Algenib 41.24s + narasi 46.12s = ~87.4s bicara; total TIDAK BOLEH
 * lebih dari 2 menit per keputusan Kholik 2026-11-20).
 * Tema: Kesabaran — hikmah baru, bukan ceramah: cerita sehari-hari dulu,
 * hikmah baru dibuka di akhir (dialog Kakek + kartu dalil).
 *
 * Penjadwalan (2026-11-20): semua jendela diukur dari durasi suara TTS yang
 * sebenarnya (output/vo/konten4/, batas per baris di grouping-algenib.json —
 * detektor hening ffmpeg, silencedetect noise=-40dB, d=0.4):
 * dialog (Algenib): d1 0.0–6.64, d2 7.35–12.23, d3 12.70–18.47,
 * d4 19.06–23.27, d5 24.01–27.06, d6 27.85–35.72, d7 36.41–41.24
 * (file dialogue.wav 41.24s — versi Algenib; Charon disimpan sebagai
 * dialogue-charon.wav, Gacrux sebagai dialogue-gacrux.wav);
 * narasi: n1 0.0–3.31, n2 4.42–14.61, n3 15.28–21.6, n4 22.67–32.5,
 * n5 33.18–40.36, komentar 41.05–46.12 (file narration.wav 46.12s).
 * Jendela = durasi bicara + 0.4s bantalan; jeda 0.5s antar baris.
 * Dua batas masih perlu dikonfirmasi dengan mendengarkan (catatan di
 * grouping-algenib.json): d2/d3 (jeda antar baris hanya 0.47s) dan d6 yang
 * dibaca sangat lambat (7.87s untuk 12 kata) — tetapi batas PER BARIS
 * dialog/narasi (yang dipakai scene ini) tidak berubah oleh keraguan itu,
 * karena keraguan hanya soal pembagian kalimat di dalam satu baris.
 *
 * Mix VO (setelah render): pecah dialogue.wav & narration.wav menjadi klip
 * per baris mengikuti batas grouping-algenib.json, lalu letakkan di awal
 * jendela masing-masing. Dialog Algenib mulai tepat di 0.0 (tidak ada lead
 * yang perlu dipangkas); narasi n1 dipangkas lead 0.24s.
 *
 * Keputusan staging (2026-11-20):
 * - Pohon tua pahlawan adalah prop DUNIA (GardenAndFieldZone), berdiri di
 *   tepi kebun dekat slot kebun-talk — dahannya menaungi jalan, akarnya
 *   mencengkeram tanah (sesuai narasi n2 & n4). Pohon sempat di (-41,-46.5)
 *   tetapi di luar frame WS enter (di luar sudut pandang horizontal 9:16);
 *   dipindah ke (-38,-46.5) 2026-11-20 agar terbaca di latar dialog —
 *   terverifikasi di storyboard v2 (shot #03/#05: batang + tajuk jelas
 *   di belakang pembicara).
 * - Scene 2 memakai cuaca 'rain' (sore + hujan) sebagai penanda lompatan
 *   waktu 3 hari; saung dan kebun berjarak ~150 unit, jadi pohon TIDAK
 *   terlihat dari saung — d5 & n4 dibawa oleh gestur Kakek + narasi.
 * - Bu Aminah tampil tanpa dialog (fixed cast): bekerja di kebun (aksi
 *   'hoe') selama Scene 1; Scene 2 hanya Fajar + Kakek.
 * - Suara Kakek: Charon ditolak Kholik karena terdengar terlalu muda
 *   (19:23); Gacrux dicoba (38.9s) lalu Algenib (41.2s, serak) — Kholik
 *   memilih Algenib (19:29). Algenib bicara lebih lambat, jadi d6 (permintaan
 *   maaf Fajar) memanjang dari 3.7s menjadi 8.3s dan mendapat 3 shot.
 * - WARN audit yang diterima (seperti Konten 3): shot pembuka Scene 2
 *   (k4-sc2-s1-enter) — kedua tokoh nyaris bertumpuk horizontal di
 *   t≈36.2s (|ndcA.x - ndcB.x|≈0.03), sesaat saja saat Fajar mulai
 *   berlari masuk; begitu ia mendekat ke slot, keduanya terpisah wajar.
 *   Dan shot pembuka Scene 1 (k4-sc1-s1-enter) — tokoh sempat di dekat
 *   tepi frame di ujung pan (t=0.12s B.x=0.84, t=4.88s A.x=-0.82);
 *   di tengah pan (t=2.5s) keduanya di dalam frame dengan wajar.
 * - Hujan Scene 2 sempat tidak terlihat: WeatherFx di ProductionSceneR3F
 *   tidak diberi center, jadi hujan turun di sekitar origin (0,0) —
 *   sedangkan saung ada di x≈114. Diperbaiki 2026-11-20 dengan
 *   center={sceneCenterPos} (rata-rata posisi karakter); hujan kini
 *   terbaca di storyboard v2 (shot #11/#19/#26).
 *
 * Sesuai Arsitektur 3 Lapis:
 * - Lapis 1 (WORLD): VillageMap ('garden' & 'rice-terraces')
 * - Lapis 2 (CAST): 'anak' (Adik Fajar), 'kakek' (Kakek Salman) & 'ibu' (Bu Aminah)
 * - Lapis 3 (PRODUCTION): Data shot manual (ShotSequencer tidak efektif
 *   untuk scene yang banyak narasi — lihat AGENTS.md §5b)
 *
 * Alur 5 beat (Playbook Bab 3):
 * 1. Hook — Pohon ini menghalangi jalan. Haruskah ditebang?
 * 2. Godaan — Fajar ingin menebang pohon yang merepotkan itu.
 * 3. Penolakan — Kakek melarang: akar pohon itulah yang menahan tanah.
 * 4. Pembalikan — Hujan semalaman, tanah longsor, pohon itu yang menahan.
 * 5. Hikmah — Yang dibenci hari ini, bisa jadi yang melindungi kita besok.
 */

// ─── Dialogue Scene 1: Kebun Sayur & Pohon Tua (0s - 36.1s) ────────────────
// Jendela = durasi bicara TTS + 0.4s bantalan; jeda 0.5s antar baris.
const sc1Dialogue = [
  {
    id: 'k4-n1',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 0.8,
    durSec: 3.7,
    text: 'Pohon ini menghalangi jalan. Haruskah ditebang?',
  },
  {
    id: 'k4-n2',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 5.0,
    durSec: 10.6,
    text: 'Sudah bertahun-tahun pohon tua itu berdiri di pinggir jalan menuju sawah. Daunnya berserakan, dahannya menutupi jalan, dan akarnya membuat tanah bergelombang.',
  },
  {
    id: 'k4-d1',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 16.1,
    durSec: 7.0,
    text: '“Pohon ini cuma bikin repot, Kek. Daunnya di mana-mana, jalannya jadi sempit. Tebang saja.”',
    emotion: 'angry' as const,
  },
  {
    id: 'k4-d2',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 23.6,
    durSec: 5.3,
    text: '“Jangan, Nak. Pohon ini sudah berdiri sebelum kamu lahir. Akarnya yang menahan tanah kita.”',
    emotion: 'solemn' as const,
  },
  {
    id: 'k4-d3',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 29.4,
    durSec: 6.2,
    text: '“Ah, itu cuma cerita orang tua. Tanah di sini baik-baik saja.”',
    emotion: 'thinking' as const,
  },
];

// ─── Dialogue Scene 2: Saung Sawah di Tengah Hujan (36.1s - 93.4s) ──────────
const sc2Dialogue = [
  {
    id: 'k4-n3',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 36.1,
    durSec: 6.7,
    text: 'Tiga hari kemudian, hujan turun semalaman. Air sungai naik, dan tanah di bukit atas mulai bergerak.',
  },
  {
    id: 'k4-d4',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 43.3,
    durSec: 4.6,
    text: '“Kek, tanah di atas longsor! Airnya menuju saung!”',
    emotion: 'surprised' as const,
  },
  {
    id: 'k4-d5',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 48.4,
    durSec: 3.5,
    text: '“Lihat pohon itu, Nak. Akarnya masih memegang tanah.”',
    emotion: 'solemn' as const,
  },
  {
    id: 'k4-d6',
    speakerId: 'anak',
    speakerName: 'Adik Fajar',
    startSec: 52.4,
    durSec: 8.3,
    text: '“Maaf, Kek. Kalau pohon itu kemarin ditebang, saung kita mungkin sudah hanyut.”',
    emotion: 'sad' as const,
  },
  {
    id: 'k4-n4',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 61.2,
    durSec: 10.2,
    text: 'Tapi pohon tua itu tetap berdiri. Akarnya mencengkeram tanah, menahan longsor, dan membelokkan air bah. Saung dan sawah di bawahnya selamat.',
  },
  {
    id: 'k4-d7',
    speakerId: 'kakek',
    speakerName: 'Kakek Salman',
    startSec: 71.9,
    durSec: 5.2,
    text: '“Yang kita benci hari ini, bisa jadi yang melindungi kita besok.”',
    emotion: 'solemn' as const,
  },
  {
    id: 'k4-n5',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 77.6,
    durSec: 7.6,
    text: 'Boleh jadi kamu membenci sesuatu, padahal itu baik bagimu. Quran surah Al-Baqarah, ayat 216.',
  },
  {
    id: 'k4-comment',
    speakerId: 'narator',
    speakerName: 'Narator',
    startSec: 85.7,
    durSec: 5.5,
    text: 'Apa yang dulu kamu benci, tapi ternyata menyelamatkanmu? Tulis di kolom komentar.',
  },
];

// ─── Shot manual Scene 1 (kebun + pohon tua) ────────────────────────────────
// Aturan liputan (Playbook §4): setiap baris dialog WAJIB punya minimal satu
// shot yang menampilkan wajah pendengar (reaction MCU atau two-shot dengan
// kedua wajah terbaca). OTS saja tidak cukup. Semua shot menutup rapat
// 0–36.1s tanpa jeda (audit FAIL bila ada celah).
const sc1Shots: Shot[] = [
  {
    id: 'k4-sc1-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    anchor: 'wide',
    startSec: 0,
    durSec: 5.0,
    twoShot: true,
    motive: 'Enter kebun sore — WS pan kanan, Fajar & Kakek berdiri di bawah pohon tua (narasi n1)',
  },
  {
    id: 'k4-sc1-s2-mcu-anak',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 5.0,
    durSec: 3.5,
    motive: 'MCU Fajar — menatap pohon tua, dahannya menutupi jalan (narasi n2)',
  },
  {
    id: 'k4-sc1-s3-ots-anak',
    target: 'anak',
    size: 'MS',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 8.5,
    durSec: 4.0,
    motive: 'OTS MS Fajar — memandang akar yang membuat tanah bergelombang (n2)',
  },
  {
    id: 'k4-sc1-s4-listen-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 12.5,
    durSec: 3.6,
    motive: 'Reaction MCU Kakek — berdiri tenang di bawah pohon, menyimak (akhir n2)',
  },
  {
    id: 'k4-sc1-s5-ots-anak2',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 16.1,
    durSec: 3.5,
    motive: 'OTS MCU Fajar — mengeluh, pohon cuma bikin repot (d1)',
  },
  {
    id: 'k4-sc1-s6-listen-kakek2',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 19.6,
    durSec: 4.0,
    motive: 'Reaction MCU Kakek — mendengar keluhan Fajar dengan tenang (d1)',
  },
  {
    id: 'k4-sc1-s7-ots-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 23.6,
    durSec: 2.6,
    motive: 'OTS MCU Kakek — melarang menebang, akar menahan tanah (d2)',
  },
  {
    id: 'k4-sc1-s8-listen-anak',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 26.2,
    durSec: 3.2,
    motive: 'Reaction MCU Fajar — mendengar larangan Kakek (d2)',
  },
  {
    id: 'k4-sc1-s9-ots-anak3',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 29.4,
    durSec: 3.3,
    motive: 'OTS MCU Fajar — meremehkan, itu cuma cerita orang tua (d3)',
  },
  {
    id: 'k4-sc1-s10-listen-kakek3',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 32.7,
    durSec: 3.4,
    motive: 'Reaction MCU Kakek — diam, menatap pohon tua, menutup adegan (d3)',
  },
];

// ─── Shot manual Scene 2 (saung diguyur hujan) ──────────────────────────────
// Kartu dalil/hikmah aktif mulai 81.9s (11.5 detik terakhir Scene 2) —
// shot penutup sejak 81.3s dibuat WS agar kartu tidak menutupi wajah.
// Semua shot menutup rapat 36.1–93.4s tanpa jeda.
const sc2Shots: Shot[] = [
  {
    id: 'k4-sc2-s1-enter',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'panR',
    lensMm: 35,
    anchor: 'wide',
    startSec: 36.1,
    durSec: 4.9,
    twoShot: true,
    motive: 'Enter saung diguyur hujan — WS pan kanan, Fajar berlari masuk dari hujan (narasi n3)',
  },
  {
    id: 'k4-sc2-s2-run-cu',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 41.0,
    durSec: 2.3,
    motive: 'CU Fajar — napas tersengal, tanah di bukit bergerak (akhir n3)',
  },
  {
    id: 'k4-sc2-s3-ots-anak',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 43.3,
    durSec: 2.5,
    motive: 'OTS MCU Fajar — memperingatkan, tanah longsor menuju saung (d4)',
  },
  {
    id: 'k4-sc2-s4-listen-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 45.8,
    durSec: 2.6,
    motive: 'Reaction MCU Kakek — mendengar kabar longsor (d4)',
  },
  {
    id: 'k4-sc2-s5-ots-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 48.4,
    durSec: 1.7,
    motive: 'OTS MCU Kakek — menunjuk ke arah pohon, akarnya masih memegang tanah (d5)',
  },
  {
    id: 'k4-sc2-s6-listen-anak',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 50.1,
    durSec: 2.3,
    motive: 'Reaction MCU Fajar — menoleh ke arah pohon (d5)',
  },
  {
    id: 'k4-sc2-s7-ots-anak2',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 52.4,
    durSec: 2.8,
    motive: 'OTS MCU Fajar — meminta maaf, saung nyaris hanyut (d6, bagian 1)',
  },
  {
    id: 'k4-sc2-s8-listen-kakek2',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 55.2,
    durSec: 2.8,
    motive: 'Reaction MCU Kakek — memaafkan dengan tenang (d6, bagian 2)',
  },
  {
    id: 'k4-sc2-s9-ots-anak3',
    target: 'anak',
    size: 'MCU',
    angle: 'ots',
    over: 'kakek',
    move: 'microPush',
    lensMm: 55,
    startSec: 58.0,
    durSec: 3.2,
    motive: 'OTS MCU Fajar — menutup permintaan maaf, menunduk (d6, bagian 3)',
  },
  {
    id: 'k4-sc2-s10-two-ws',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 35,
    anchor: 'wide',
    startSec: 61.2,
    durSec: 4.4,
    twoShot: true,
    motive: 'Two-shot WS slow pull — hujan, bukit, dan pohon tua yang tetap berdiri (n4)',
  },
  {
    id: 'k4-sc2-s11-mcu-kakek',
    target: 'kakek',
    size: 'MCU',
    angle: 'eye',
    move: 'pushIn',
    lensMm: 55,
    startSec: 65.6,
    durSec: 6.3,
    motive: 'MCU Kakek — push-in, memandang pohon menahan longsor (n4)',
  },
  {
    id: 'k4-sc2-s12-ots-kakek2',
    target: 'kakek',
    size: 'MCU',
    angle: 'ots',
    over: 'anak',
    move: 'microPush',
    lensMm: 55,
    startSec: 71.9,
    durSec: 2.5,
    motive: 'OTS MCU Kakek — hikmah: yang dibenci hari ini, melindungi besok (d7)',
  },
  {
    id: 'k4-sc2-s13-listen-anak2',
    target: 'anak',
    size: 'MCU',
    angle: 'eye',
    move: 'microPush',
    lensMm: 55,
    startSec: 74.4,
    durSec: 3.2,
    motive: 'Reaction MCU Fajar — meresapi hikmah Kakek (d7)',
  },
  {
    id: 'k4-sc2-s14-cu-anak',
    target: 'anak',
    size: 'CU',
    angle: 'eye',
    move: 'static',
    lensMm: 70,
    startSec: 77.6,
    durSec: 3.7,
    motive: 'CU Fajar — diam khusyuk, dalil mulai dibacakan (n5)',
  },
  {
    id: 'k4-sc2-s15-two-ws',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'slowPull',
    lensMm: 35,
    anchor: 'wide',
    startSec: 81.3,
    durSec: 6.0,
    twoShot: true,
    motive: 'Two-shot WS slow pull — kartu dalil & hikmah muncul (81.9s), hujan mereda (n5)',
  },
  {
    id: 'k4-sc2-s16-final',
    target: 'both',
    size: 'WS',
    angle: 'eye',
    move: 'static',
    lensMm: 35,
    anchor: 'wide',
    startSec: 87.3,
    durSec: 6.1,
    twoShot: true,
    motive: 'WS statis penutup — kartu dalil + ajakan komentar dibaca penonton (komentar)',
  },
];

// ─── Story Object: Konten Hikmah #4 ──────────────────────────────────────────
export const KONTEN_HIKMAH_4: ProductionStory = {
  id: 'pohon-yang-dibenci',
  title: 'Yang Dibenci, Yang Menyelamatkan',
  theme: 'Kesabaran dan Hikmah di Balik yang Dibenci',
  summary:
    'Fajar ingin menebang pohon tua yang menghalangi jalan. Kakek melarang — akar pohon itulah yang menahan tanah. Tiga hari kemudian hujan turun, tanah longsor, dan pohon yang dibenci itu justru yang menyelamatkan saung mereka.',
  totalDurationSec: 93.4,
  cinematographyStyle: 'dramatic-shorts',
  scenes: [
    // ── SCENE 1: Kebun Sayur & Pohon Tua (0s - 36.1s) ────────────────────────
    {
      id: 'sc1-kebun',
      title: 'Pohon Tua di Pinggir Jalan',
      worldId: 'village',
      locationId: 'garden',
      stagingPresetId: 'kebun-talk',
      cameraSide: 1,
      timeOfDay: 'sunset',
      weather: 'clear',
      ambience: 'birds',
      startSec: 0,
      durationSec: 36.1,
      axis: ['anak', 'kakek'],
      shots: sc1Shots,
      dialogue: sc1Dialogue,
      cast: [
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'idle',
          defaultEmotion: 'neutral',
          timeline: [
            // 0–16.1s: sudah berdiri di bawah pohon, menatap dahannya yang
            // menutupi jalan (narasi n1–n2). TIDAK ada jalan masuk: Fajar
            // yang berjalan selama shot pembuka WS membuat geometri two-shot
            // berubah dan CameraDirector membalik locked-orbit di tengah
            // shot (audit camera-continuity FAIL 0.35m di t≈2s).
            { startSec: 0,    durSec: 16.1, action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 16.1–23.1s: mengeluh, pohon cuma bikin repot (d1)
            { startSec: 16.1, durSec: 7.0,  action: 'idle', emotion: 'angry',    speaking: true,  listening: false },
            // 23.1–23.6s: jeda singkat
            { startSec: 23.1, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 23.6–28.9s: menyimak larangan Kakek (d2)
            { startSec: 23.6, durSec: 5.3,  action: 'idle', emotion: 'thinking', speaking: false, listening: true  },
            // 28.9–29.4s: jeda singkat
            { startSec: 28.9, durSec: 0.5,  action: 'idle', emotion: 'thinking', speaking: false, listening: false },
            // 29.4–35.6s: meremehkan, itu cuma cerita orang tua (d3)
            { startSec: 29.4, durSec: 6.2,  action: 'idle', emotion: 'thinking', speaking: true,  listening: false },
            // 35.6–36.1s: menutup adegan, menatap pohon
            { startSec: 35.6, durSec: 0.5,  action: 'idle', emotion: 'neutral',  speaking: false, listening: false },
          ],
        },
        {
          castId: 'kakek',
          name: 'Kakek Salman',
          slotId: 'slot-b',
          snapToGround: true,
          defaultAction: 'idle',
          defaultEmotion: 'solemn',
          timeline: [
            // 0–16.1s: berdiri tenang di bawah pohon tua (narasi n1–n2)
            { startSec: 0,    durSec: 16.1, action: 'idle', emotion: 'solemn', speaking: false, listening: false },
            // 16.1–23.1s: menyimak keluhan Fajar (d1)
            { startSec: 16.1, durSec: 7.0,  action: 'idle', emotion: 'solemn', speaking: false, listening: true  },
            // 23.1–23.6s: jeda singkat
            { startSec: 23.1, durSec: 0.5,  action: 'idle', emotion: 'solemn', speaking: false, listening: false },
            // 23.6–28.9s: melarang menebang, akar menahan tanah (d2)
            { startSec: 23.6, durSec: 5.3,  action: 'idle', emotion: 'solemn', speaking: true,  listening: false },
            // 28.9–29.4s: jeda singkat
            { startSec: 28.9, durSec: 0.5,  action: 'idle', emotion: 'solemn', speaking: false, listening: false },
            // 29.4–35.6s: menyimak Fajar yang meremehkan (d3)
            { startSec: 29.4, durSec: 6.2,  action: 'idle', emotion: 'solemn', speaking: false, listening: true  },
            // 35.6–36.1s: diam, menatap pohon tua
            { startSec: 35.6, durSec: 0.5,  action: 'idle', emotion: 'solemn', speaking: false, listening: false },
          ],
        },
        {
          castId: 'ibu',
          name: 'Bu Aminah',
          initialPos: [-30.0, -0.03, -52.0],
          snapToGround: true,
          defaultAction: 'hoe',
          defaultEmotion: 'neutral',
          timeline: [
            // 0–16.1s: bekerja di bedengan sayur (narasi n1–n2)
            { startSec: 0,    durSec: 16.1, action: 'hoe', emotion: 'neutral', speaking: false, listening: false },
            // 16.1–23.1s: menoleh mendengar keluhan Fajar (d1)
            { startSec: 16.1, durSec: 7.0,  action: 'hoe', emotion: 'neutral', speaking: false, listening: true  },
            // 23.1–23.6s: jeda singkat, kembali mencangkul
            { startSec: 23.1, durSec: 0.5,  action: 'hoe', emotion: 'neutral', speaking: false, listening: false },
            // 23.6–28.9s: menyimak larangan Kakek (d2)
            { startSec: 23.6, durSec: 5.3,  action: 'hoe', emotion: 'neutral', speaking: false, listening: true  },
            // 28.9–29.4s: jeda singkat
            { startSec: 28.9, durSec: 0.5,  action: 'hoe', emotion: 'neutral', speaking: false, listening: false },
            // 29.4–35.6s: menyimak Fajar yang meremehkan (d3)
            { startSec: 29.4, durSec: 6.2,  action: 'hoe', emotion: 'neutral', speaking: false, listening: true  },
            // 35.6–36.1s: kembali bekerja
            { startSec: 35.6, durSec: 0.5,  action: 'hoe', emotion: 'neutral', speaking: false, listening: false },
          ],
        },
      ],
    },

    // ── SCENE 2: Saung Sawah di Tengah Hujan (36.1s - 93.4s) ──────────────────
    {
      id: 'sc2-saung',
      title: 'Hujan, Longsor, dan Pohon yang Bertahan',
      worldId: 'village',
      locationId: 'rice-terraces',
      stagingPresetId: 'saung-dialog',
      cameraSide: -1,
      timeOfDay: 'sunset',
      weather: 'rain',
      ambience: 'wind',
      startSec: 36.1,
      durationSec: 57.3,
      axis: ['anak', 'kakek'],
      shots: sc2Shots,
      dialogue: sc2Dialogue,
      dalilCard: {
        arabic: 'وَعَسَى أَنْ تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَكُمْ',
        transliteration: "Wa 'asā an takrahū shay'an wa huwa khayrun lakum.",
        translation:
          'Boleh jadi kamu membenci sesuatu, padahal itu baik bagimu.',
        source: 'QS. Al-Baqarah: 216',
      },
      hikmahCard: {
        title: '3 Hikmah dari Pohon Tua',
        points: [
          'Yang dibenci hari ini bisa jadi yang melindungi kita besok.',
          'Akar yang tak terlihat justru yang paling kuat menahan.',
          'Bersabarlah — kebaikan sering datang dalam bentuk yang tidak kita duga.',
        ],
      },
      commentPrompt: 'Apa yang dulu kamu benci, tapi ternyata menyelamatkanmu? Tulis di kolom komentar.',
      cast: [
        {
          castId: 'anak',
          name: 'Adik Fajar',
          slotId: 'slot-b',
          initialPos: [108.0, -0.03, -54.0],
          targetPos: [114.2, -0.03, -59.5],
          snapToGround: true,
          defaultAction: 'run',
          defaultEmotion: 'surprised',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=36.1s, sceneElapsed = currentTime - 36.1
            // 0–7.2s: berlari masuk dari hujan menuju saung (narasi n3)
            { startSec: 0,    durSec: 7.2,  action: 'run',  emotion: 'surprised', targetPos: [114.2, -0.03, -59.5] },
            // 7.2–11.8s: memperingatkan, tanah longsor menuju saung (d4)
            { startSec: 7.2,  durSec: 4.6,  action: 'idle', emotion: 'surprised', speaking: true,  listening: false },
            // 11.8–12.3s: jeda singkat
            { startSec: 11.8, durSec: 0.5,  action: 'idle', emotion: 'surprised', speaking: false, listening: false },
            // 12.3–15.8s: menyimak Kakek menunjuk pohon (d5)
            { startSec: 12.3, durSec: 3.5,  action: 'idle', emotion: 'thinking',  speaking: false, listening: true  },
            // 15.8–16.3s: jeda singkat
            { startSec: 15.8, durSec: 0.5,  action: 'idle', emotion: 'thinking',  speaking: false, listening: false },
            // 16.3–24.6s: meminta maaf, saung nyaris hanyut (d6)
            { startSec: 16.3, durSec: 8.3,  action: 'idle', emotion: 'sad',      speaking: true,  listening: false },
            // 24.6–25.1s: jeda singkat
            { startSec: 24.6, durSec: 0.5,  action: 'idle', emotion: 'sad',      speaking: false, listening: false },
            // 25.1–35.3s: menatap hujan dan bukit, pohon tetap berdiri (n4)
            { startSec: 25.1, durSec: 10.2, action: 'idle', emotion: 'solemn',   speaking: false, listening: false },
            // 35.3–35.8s: jeda singkat
            { startSec: 35.3, durSec: 0.5,  action: 'idle', emotion: 'solemn',   speaking: false, listening: false },
            // 35.8–41.0s: menyimak hikmah Kakek (d7)
            { startSec: 35.8, durSec: 5.2,  action: 'idle', emotion: 'solemn',   speaking: false, listening: true  },
            // 41.0–41.5s: jeda singkat
            { startSec: 41.0, durSec: 0.5,  action: 'idle', emotion: 'solemn',   speaking: false, listening: false },
            // 41.5–57.3s: diam khusyuk saat dalil dibacakan + ajakan komentar (n5)
            { startSec: 41.5, durSec: 15.8, action: 'idle', emotion: 'solemn',   speaking: false, listening: false },
          ],
        },
        {
          castId: 'kakek',
          name: 'Kakek Salman',
          slotId: 'slot-a',
          snapToGround: true,
          defaultAction: 'sit',
          defaultEmotion: 'solemn',
          timeline: [
            // Waktu scene-relative: Scene 2 mulai di t=36.1s, sceneElapsed = currentTime - 36.1
            // 0–7.2s: duduk tenang di saung saat hujan turun (narasi n3)
            { startSec: 0,    durSec: 7.2,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 7.2–11.8s: menyimak kabar longsor dari Fajar (d4)
            { startSec: 7.2,  durSec: 4.6,  action: 'sit', emotion: 'surprised', speaking: false, listening: true  },
            // 11.8–12.3s: jeda singkat
            { startSec: 11.8, durSec: 0.5,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 12.3–15.8s: menunjuk pohon, akarnya masih memegang tanah (d5)
            { startSec: 12.3, durSec: 3.5,  action: 'sit', emotion: 'solemn',    speaking: true,  listening: false },
            // 15.8–16.3s: jeda singkat
            { startSec: 15.8, durSec: 0.5,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 16.3–24.6s: menyimak permintaan maaf Fajar (d6)
            { startSec: 16.3, durSec: 8.3,  action: 'sit', emotion: 'solemn',    speaking: false, listening: true  },
            // 24.6–25.1s: jeda singkat
            { startSec: 24.6, durSec: 0.5,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 25.1–35.3s: memandang hujan dan pohon yang bertahan (n4)
            { startSec: 25.1, durSec: 10.2, action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 35.3–35.8s: jeda singkat
            { startSec: 35.3, durSec: 0.5,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 35.8–41.0s: menyampaikan hikmah (d7)
            { startSec: 35.8, durSec: 5.2,  action: 'sit', emotion: 'solemn',    speaking: true,  listening: false },
            // 41.0–41.5s: jeda singkat
            { startSec: 41.0, durSec: 0.5,  action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
            // 41.5–57.3s: duduk khusyuk saat dalil dibacakan + ajakan komentar (n5)
            { startSec: 41.5, durSec: 15.8, action: 'sit', emotion: 'solemn',    speaking: false, listening: false },
          ],
        },
      ],
    },
  ],
};
