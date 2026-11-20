# Hikmah Studio – Aturan Agent (WAJIB DIBACA)

Stack: Vite + React + three.js (@react-three/fiber, drei) + Remotion.
Bahasa dokumentasi: Indonesia. Kode & identifier: Inggris.

## 1. Arsitektur 3 Lapis (jangan dicampur)

| Lapis | Folder | Isi | Sifat |
|---|---|---|---|
| 1. WORLD | `src/worlds/<village|city>/` | Map 3D lengkap: terrain, bangunan, jalan, vegetasi, hewan, kendaraan, cahaya, cuaca | Dibuat sekali, reusable |
| 2. CAST | `src/cast/` | Karakter: ID, rig, kostum, ekspresi, animasi, viseme | Dibuat sekali, reusable |
| 3. PRODUCTION | `src/data/`, `src/scenes/`, `src/remotion/` | Story → scene → VO → render | Hanya DATA + referensi |

### Istilah baku
- **World/Map**: dunia 3D persisten (Desa, Kota). BUKAN scene.
- **Location**: zona bernama di Map (id, posisi, arah, camera anchors, spawn points).
- **Cast**: karakter reusable yang dirujuk lewat `castId`.
- **Scene**: `{ worldId, locationId, timeOfDay, weather, cast[], shots[], dialogue[] }`.

### Aturan keras
1. **Scene DILARANG membuat/menggambar environment.** Scene hanya memilih `worldId + locationId`.
2. Map harus bisa dirender sendiri (`<VillageMap />`, `<CityMap />`) tanpa karakter/cerita.
3. Setiap Map wajib punya halaman preview free-cam: `/map/village`, `/map/city`.
4. Setiap Location wajib punya: `id`, `label`, `position`, `facing`, `cameraAnchors{wide,medium,close,overShoulder,lowAngle,aerial}`, `spawnPoints[]`.
5. Setiap Map wajib mengekspor `registry` (daftar zona/lokasi) di `locations.ts`.
6. Jangan edit `storyScript.ts` / `StoryStageCanvas.tsx` saat mengerjakan lapis 1 atau 2, kecuali ada instruksi eksplisit.
7. Satu pemilik per file. Jangan edit file milik agent lain.
8. Tanyakan/tulis rencana dulu sebelum perubahan besar. Hasil dianggap selesai hanya jika `npm run build` lolos dan preview bisa dibuka.

## 2. Standar World (detail seperti dunia nyata)
- Skala nyata: 1 unit = 1 meter. Manusia dewasa ≈ 1.7 unit, pintu 2.1, jalan desa 3–4, jalan kota 7–14.
- Tidak boleh ada area kosong datar. Tiap zona punya: ground variation, props kecil (pagar, tong, kayu bakar, tanaman pot, jemuran, sampah/bak, rambu), dan elemen hidup (hewan, orang latar, kendaraan).
- Sertakan variasi acak ber-seed (`seededRandom`) agar deterministik antar render Remotion. DILARANG `Math.random()` di render.
- Gunakan `InstancedMesh` untuk objek berulang (pohon, padi, rumput, mobil, lampu). Target ≥ 30 FPS preview.
- Animasi environment harus digerakkan `time` / `frame` (bukan `setInterval`) agar bisa di-render Remotion.
- Siang/sore/malam/hujan/kabut didukung lewat props `timeOfDay`, `weather`. Lampu rumah/jalan menyala malam hari.
- Gaya visual konsisten: stylized semi-realistis (toon gradient yang sudah ada), palet per-world di `palette.ts`.
- Ada audio-ambience tag per zona (`ambience: 'rooster'|'traffic'|...`) untuk dipakai VO/mixing.

### Checklist Desa
Rumah (bambu/kayu/bata), masjid, balai desa, warung, pasar, sekolah, sawah bertingkat, kebun, sungai + jembatan + irigasi, peternakan (kandang sapi/kambing/ayam/bebek, lapangan rumput), hewan hidup beranimasi, gunung + kabut, hutan (variasi pohon), jalan tanah, kereta kuda/dokar, sepeda, gerobak, lumbung, sumur, saung, lapangan, kuburan/mushola kecil, tiang listrik, bendera, orang latar.

### Checklist Kota
Gedung pencakar, ruko, apartemen, kantor, masjid raya, mall, rumah sakit, sekolah/kampus, stasiun/halte, jalan raya + marka + zebra cross + lampu lalu lintas + rambu, trotoar, flyover/jembatan, taman kota, pasar modern/kaki lima, mobil (sedan/SUV/angkot/bus/truk), motor, sepeda, pejalan kaki, billboard, lampu jalan, kabel, papan toko, tempat sampah, hidran, siang & malam (neon).

## 3. Aturan Kamera & Editing (Sutradara & Editor Profesional)
Detail teknis: `docs/CINEMATOGRAPHY.md`.
**Masterclass Dramaturgi, Blocking 9:16 & Editing (WAJIB DIBACA)**: `docs/DIRECTOR_EDITOR_PLAYBOOK.md`.
Ringkasan wajib:
- Setiap dialog/beat punya **shot plan**: ukuran shot, sudut, gerak, lensa, durasi.
- Ukuran: EWS/Establishing → WS → MS → MCU → CU → ECU. Selalu mulai scene dengan **establishing shot**.
- **Aturan 180°** (axis line) dan **30°**: dua shot berurutan pada subjek sama harus beda ≥30° atau beda ukuran.
- **Rule of thirds** + headroom + **lead/nose room** (ruang di arah pandang).
- Dialog dua orang: master → over-the-shoulder bergantian → reaction shot. Pindah shot saat jeda/akhir kalimat, bukan di tengah kata.
- Gerak kamera harus bermotif: push-in untuk emosi, pull-out untuk reveal/kesendirian, pan mengikuti aksi, orbit lambat untuk hero moment, handheld halus untuk ketegangan. Hindari gerak acak.
- Easing: ease-in-out (tidak linear). Durasi shot rata-rata 2–6 detik, bervariasi (ritme).
- Fokus/DoF: close-up boleh blur latar; lensa 24–35mm untuk wide, 50–85mm untuk dialog.
- Kamera tidak boleh menembus bangunan/objek: gunakan camera anchors dari Location, bukan koordinat liar.
- Kamera tidak pernah menampilkan area kosong/tepi dunia.

## 4. Aturan Animasi Bicara (Natural)
Detail: `docs/PERFORMANCE.md`. Ringkasan wajib:
- **Lip-sync berbasis viseme** (A/E/I/O/U/M-B-P/F-V/S/rest), bukan buka-tutup mulut acak. Data viseme berasal dari timestamp VO (`dialogue[].visemes` atau amplitudo audio).
- Smoothing + coarticulation: transisi 40–80 ms, tutup mulut penuh pada M/B/P, amplitudo mengikuti volume.
- Karakter hidup saat diam: **blink** acak 2–6 detik (durasi 120–180 ms), **idle breathing**, micro head sway.
- Saat bicara: head nod/tilt kecil di penekanan kata, **gesture tangan** selaras ritme kalimat, alis naik di tanda tanya/penekanan, eye saccade kecil.
- Mata melihat lawan bicara (lookAt), sesekali menunduk saat berpikir; pendengar tetap bereaksi (angguk, ekspresi).
- Emosi lewat `expression` per-beat (netral, senang, sedih, kaget, marah, khusyuk) dengan blend halus, bukan snap.
- Jeda natural di koma/titik; tidak ada dialog yang menumpuk tanpa jeda napas.
- Semua animasi deterministik (seeded) dan digerakkan `frame`.

## 5. Aturan Production Data — Jebakan Umum (WAJIB DIBACA)

### 5a. Timeline Karakter: Waktu Scene-Relative, BUKAN Absolut

`ProductionSceneR3F` menghitung waktu animasi dengan:
```ts
sceneElapsed = currentTime - scene.startSec
```
Artinya: `startSec` di dalam `char.timeline[]` adalah **hitungan dari 0 (awal scene itu sendiri)**, bukan dari awal keseluruhan story.

**❌ SALAH — waktu absolut story:**
```ts
// Scene 2 mulai di startSec: 38
timeline: [
  { startSec: 38.0, durSec: 7.0, action: 'walk' },  // ← tidak pernah aktif!
  { startSec: 45.0, durSec: 15.0, action: 'pray' },  // ← sceneElapsed max = 22, tidak pernah = 45
]
```

**✅ BENAR — waktu scene-relative:**
```ts
// Scene 2 mulai di startSec: 38 → sceneElapsed mulai dari 0
timeline: [
  { startSec: 0.0, durSec: 7.0, action: 'walk' },   // ← aktif di sceneElapsed 0–7
  { startSec: 7.0, durSec: 15.0, action: 'pray' },  // ← aktif di sceneElapsed 7–22
]
```

**Rumus konversi**: `timelineStartSec = storyAbsoluteTime - scene.startSec`

> [!CAUTION]
> Scene 1 yang `startSec = 0` tidak terlihat salah meski pakai waktu absolut (karena absolut = relatif). Bug ini hanya muncul di scene 2, 3, dst. Selalu gunakan waktu scene-relative di semua scene untuk konsistensi.

---

### 5b. ShotSequencer: Tidak Efektif untuk Scene Narasi Murni

`generateShotSequence()` memfilter baris dialogue yang bukan karakter (narator dibuang). Jika **semua dialogue adalah narator**, fungsi ini hanya menghasilkan 1–2 shot (establishing + closure) — tidak cukup untuk menutup scene 22 detik.

**Kapan pakai ShotSequencer:**
- ✅ Scene yang punya **minimal 2 baris dialogue antar-karakter** (bukan narator)
- ✅ Scene dialog utama (Scene 1 kebanyakan konten)

**Kapan pakai shot manual:**
- ✅ Scene penutup / closure yang isinya **narasi + dalil + doa** (semua narator)
- ✅ Scene transisi berjalan / perjalanan tanpa dialog karakter
- ✅ Scene yang membutuhkan shot crane reveal / aerial yang presisi

**Template shot manual untuk scene penutup (22s, dua karakter):**
```ts
const sc2Shots: Shot[] = [
  { id: '...s1', target: 'both',   size: 'WS',  angle: 'eye', move: 'panR',   lensMm: 35, startSec: SCENE_START,      durSec: 5.5, twoShot: true },
  { id: '...s2', target: 'both',   size: 'MS',  angle: 'low', move: 'static', lensMm: 40, startSec: SCENE_START + 5.5, durSec: 4.5, twoShot: true },
  { id: '...s3', target: CHAR_A,   size: 'MCU', angle: 'eye', move: 'pushIn', lensMm: 55, startSec: SCENE_START + 10,  durSec: 7.0 },
  { id: '...s4', target: CHAR_B,   size: 'CU',  angle: 'eye', move: 'static', lensMm: 70, startSec: SCENE_START + 17,  durSec: 3.5 },
  { id: '...s5', target: 'both',   size: 'WS',  angle: 'low', move: 'crane',  lensMm: 35, startSec: SCENE_START + 20.5,durSec: 1.5, twoShot: true },
];
```

> [!IMPORTANT]
> `startSec` di dalam `Shot[]` adalah **waktu absolut story** (berbeda dengan `timeline[]` karakter). CameraDirector memilih shot berdasarkan `currentTime` langsung. Jangan campur aduk dengan timeline karakter yang scene-relative.

---

### 5c. Karakter Harus `listening: true` Saat Lawan Bicara Berbicara

Saat karakter A berbicara, karakter B harus punya segmen `{ listening: true }` di timeline-nya agar tampil reaksi wajah (angguk, ekspresi). Jika karakter duduk diam tanpa `listening: true` selama 14 detik pertama scene, terlihat seperti patung.

**Pola yang benar untuk scene dialog 2 orang:**
```ts
// Karakter yang awalnya duduk (Kakek/Petani)
timeline: [
  { startSec: 0,   durSec: T_ANAK_MASUK, action: 'sit', emotion: 'solemn', speaking: false, listening: false },
  { startSec: T_ANAK_MASUK, durSec: T_ANAK_SELESAI - T_ANAK_MASUK, action: 'sit', emotion: 'solemn', speaking: false, listening: true },
  { startSec: T_ANAK_SELESAI, durSec: ..., action: 'sit', emotion: 'happy', speaking: true, listening: false },
  ...
]
```

---

### 5d. Import TypeScript: Semua Import di Atas File

Jangan menempatkan `import` di tengah file (misalnya di antara variabel). TypeScript tidak mengizinkannya dan akan error `TS1016`. Semua `import type { Shot }`, `import { generateShotSequence }`, dll. harus di baris paling atas file.

---

### 5e. Framing Layar Vertikal 9:16 & Two-Shot (Gunakan Depth Staging)

Format video vertikal 9:16 memiliki sudut pandang horizontal yang sangat sempit (~26°–28° FOV horizontal):
- ❌ **DILARANG side-by-side profil 90° jarak dekat**: Menaruh 2 karakter terpisah 2 meter pada sudut tegak lurus membuat kedua karakter terjepit di pinggir bezel layar dan tengahnya kosong melompong.
- ✅ **Gunakan Depth Staging (Sudut 3/4 Depth, Azimuth 45°–55° atau 135°–145°)**: Satu karakter di latar depan (foreground), satu di latar belakang (background). Keduanya mengisi kanvas vertikal dengan wajar dan sinematik.

---

### 5f. Karakter di Saung / Panggung & Garis Pandang Kamera (Sightline)

- **Elevasi Dek Saung**: Saung bambu (`Saung`) memiliki panggung kayu setinggi `+0.6m` di atas ground. Karakter yang duduk di saung wajib diset `initialPos[1] = groundY + 0.6` (mis. `4.4` di sawah), BUKAN `groundY` (`3.8`), agar tubuh karakter tidak tenggelam di lantai kayu.
- **Sightline Bebas Halangan**: Kamera tidak boleh merekam melewati tiang/pohon yang membelah layar tepat di antara lensa dan karakter. `CameraDirector` secara otomatis mendeteksi dan menggeser kamera agar garis pandang bersih.

---

### 5g. Wajib Audit Spasial & Visual Storyboard Sebelum Selesai

Setiap perubahan pada scene, staging karakter, kamera, atau lokasi **WAJIB** lolos audit matematis dan inspeksi visual sebelum dilaporkan selesai:
1. Jalankan `npm run audit:scene -- <story>` (atau `all`) dan pastikan **0 FAIL** (periksa juga setiap `WARN` seperti framing sempit, kedekatan halangan, atau `listening: true`).
2. Jalankan `npm run storyboard -- <story>` untuk merender contact sheet 9:16 seluruh shot ke `output/storyboards/<story>-contact-sheet.png`.
3. Buka dan periksa PNG contact sheet tersebut menggunakan `read_file` untuk memverifikasi secara visual bahwa wajah terlihat jelas, posisi karakter menapak ground/dek dengan wajar, tidak ada tiang/pohon membelah wajah, dan komposisi 9:16 bersih.

---

### 5h. Gunakan Staging Presets, Auto-Ground & Director Viewfinder

Hindari tebak-tebakan koordinat mentah dan elevasi `Y` manual:
- **`stagingPresetId` & `slotId`**: Gunakan `stagingPresets` pada `WorldLocation` (`src/worlds/village/locations.ts`, `src/worlds/city/locations.ts`) melalui `scene.stagingPresetId` dan `cast[].slotId`.
- **`snapToGround` & `yOffset`**: Secara default `snapToGround` aktif (`true`), sehingga elevasi karakter otomatis mengikuti `surfaceYAt(worldId, x, z)` (termasuk lengkung jembatan bambu dan dek saung `+0.65m`). Gunakan `yOffset` hanya untuk offset tambahan di atas permukaan.
- **`cameraSide`**: Tetapkan `cameraSide: 1 | -1` pada scene atau shot (atau ikuti `preset.safeCameraSide`) agar aturan 180° memilih sisi kamera yang bebas dari pilar/pohon.
- **`cameraOverride`**: Untuk hero shot atau framing khusus yang sulit dicapai secara prosedural, isi `shot.cameraOverride = { position, target, fov }`.
- **9:16 Director Viewfinder & Copy Pose**: Gunakan tombol **📱 9:16 Frame** & **📋 Copy Pose** di `/map/village` atau `/map/city`, serta **🎯 Free-Cam** & **📋 Copy Shot Override** di `ProductionStudio` untuk mencari komposisi kamera secara langsung di viewport 9:16.

---

## 6. Struktur Folder Target
```
src/
  worlds/
    shared/        seededRandom, palette, instancing, Sky/Weather, ambience types
    village/       VillageMap.tsx, locations.ts, zones/*, props/*, animals/*, vehicles/*
    city/          CityMap.tsx, locations.ts, zones/*, props/*, vehicles/*, buildings/*
  cast/            characters.ts, CharacterModel.tsx, lipsync/*, expressions.ts
  cinematography/  shotTypes.ts, shotPlanner.ts, CameraDirector.tsx
  pages/           MapPreview.tsx (/map/village, /map/city)
  scenes/          data scene saja
  data/storyScript.ts
docs/              DIRECTOR_EDITOR_PLAYBOOK.md, CINEMATOGRAPHY.md, PERFORMANCE.md
```
File lama di `src/components/scene/*` adalah legacy; migrasi dilakukan bertahap, jangan dihapus sebelum pengganti berfungsi.