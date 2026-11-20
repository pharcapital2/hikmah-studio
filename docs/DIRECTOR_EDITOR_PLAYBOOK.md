# Masterclass Sutradara & Editor Berkelas — Hikmah Studio (9:16 Vertical Cinema)

Dokumen ini adalah **"Otak Artistik"** bagi AI Agent (Muse / Sutradara Otonom) saat merancang cerita, menyusun blocking 3D, memilih lensa kamera, dan memotong gambar (editing) di **Hikmah Studio**.

> **Prinsip Utama:** Jangan pernah memposisikan kamera atau memotong shot hanya untuk "menampilkan karakter yang sedang bicara". Setiap shot, lensa, gerakan kamera, dan titik potong (*cut*) harus memiliki **motif emosional** yang menyentuh hati penonton.

---

## 1. Struktur Dramaturgi 60 Detik (The 5-Beat Golden Arc)

Video pendek vertikal (TikTok / Reels / Shorts) berdurasi 60 detik yang berkelas selalu mengikuti kurva emosi 5 babak:

| Beat | Rentang Waktu | Nama Babak | Tujuan Emosional | Bahasa Kamera & Pacing |
|---|---|---|---|---|
| **1** | `0.0s – 6.0s` | **The Visual Hook & Atmosphere** | Menangkap mata penonton dalam 3 detik pertama lewat suasana dunia yang hidup dan kontras situasi karakter. | `EWS` / `WS` (28–35mm), gerak `panR`/`crane`/`track` halus. Tampilkan keindahan desa/kota + karakter dalam aksi awal (kelelahan, berjalan, merenung). |
| **2** | `6.0s – 18.0s` | **The Encounter (Pertemuan)** | Mempertemukan dua karakter dengan energi berbeda (mis. anak tulus vs kakek lelah). | `WS` Entrance (saat karakter kedua masuk) $\rightarrow$ `MS` Two-Shot dengan **Depth Staging 3/4** (lensa 40–50mm). |
| **3** | `18.0s – 30.0s` | **The Vulnerability (Keraguan/Konflik Batin)** | Karakter mengungkapkan kelemahan, kebingungan, atau keluhan manusiawi. | Pindah ke `OTS` / `MCU` (55–65mm). Gunakan ekspresi `thinking` / `sad` / `angry`. Jangan buru-buru memotong; beri ruang hening sejenak. |
| **4** | `30.0s – 45.0s` | **The Hikmah Climax (Titik Balik)** | Kalimat nasihat puncak atau sabda Rasulullah ﷺ yang mengubah cara pandang. | **Puncak Sinematik:** `MCU` $\rightarrow$ `CU` dengan `pushIn` sangat lembut (70–85mm, ekspresi `solemn`). **WAJIB** disusul `CU` Reaction Shot pendengar (1.2–2.0 detik). |
| **5** | `45.0s – 60.0s` | **Spiritual Resolution & Dalil Closure** | Tindakan nyata setelah tersentuh hikmah (melangkah ke masjid, berdoa, berbagi) + perenungan Dalil. | `WS` Two-Shot $\rightarrow$ `MS` Low Angle $\rightarrow$ `WS` `crane` naik perlahan menghadap siluet masjid/langit senja. Sisakan ruang visual bersih untuk Kartu Dalil. |

---

## 2. Bahasa Lensa, Sudut, & Gerak Kamera (Director's Lens Kit)

Pilih kombinasi `size`, `angle`, `move`, dan `lensMm` berdasarkan psikologi adegan:

### A. Psikologi Lensa (`lensMm`)
* **24mm – 35mm (Wide / Environmental)**: Mengikat karakter dengan lingkungannya (sawah, jembatan sungai, pelataran masjid, jalan kota). Wajib untuk `EWS` dan `WS`.
* **40mm – 50mm (Natural Human Eye)**: Netral, jujur, intim namun tetap memberi konteks ruang. Ideal untuk `MS` dan Two-Shot percakapan.
* **60mm – 85mm (Telephoto / Soul Portrait)**: Memampatkan ruang latar belakang, memfokuskan seluruh perhatian penonton pada mata dan mikro-ekspresi wajah. Wajib untuk `MCU` dan `CU` di momen emosional.

### B. Psikologi Sudut Kamera (`angle`)
* **`eye`**: Kesetaraan, kejujuran, empati langsung antara penonton dan karakter.
* **`low`**: Kemuliaan, keteguhan iman, rasa syukur, atau keagungan masjid/alam (sangat kuat untuk shot doa / penutup).
* **`high`**: Kerendahan hati, kerapuhan manusia, kesendirian, atau sudut pandang orang dewasa melihat anak kecil.
* **`ots` (Over-The-Shoulder)**: Mengunci hubungan dialog dua karakter dan menjaga orientasi ruang 180°.

### C. Pantangan Gerak Kamera (`move`)
* **Jangan pernah menggerakkan kamera tanpa motivasi batin (`motive`).**
* `pushIn`: Hanya saat intensitas emosi meningkat (pengakuan tulus, penyampaian hadits/hikmah utama).
* `pullOut` / `crane`: Hanya saat *reveal* (membuka skala dunia) atau *closure* (melepas karakter ke perjalanan spiritual mereka).
* `static`: Pilihan terbaik untuk dialog cepat dan reaction shot agar penonton fokus membaca ekspresi mata dan subtitle tanpa pusing.

---

## 3. Seni Blocking & Depth Staging di Layar 9:16

Kanvas vertikal 9:16 (`1080×1920`) memiliki bidang horizontal yang sempit (~27° HFOV). Sutradara berkelas menyiasatinya dengan **Depth Staging (Komposisi Kedalaman)**, bukan menjejerkan karakter secara datar:

1. **Larangan Flat Profile 90°**:
   Jangan menaruh dua karakter berdiri sejajar kiri-kanan pada jarak yang sama dari kamera. Di layar 9:16, keduanya akan terpotong di tepi kiri-kanan layar dan menyisakan lubang kosong di tengah.
2. **Rumus Depth Staging 3/4 (Diagonal Berlapis)**:
   * Tempatkan Karakter A lebih dekat ke kamera (**Foreground**, agak di kiri/kanan frame).
   * Tempatkan Karakter B lebih dalam (**Midground/Background**, di sisi berlawanan).
   * Kamera mengambil sudut diagonal **35°–55°** terhadap garis sumbu kedua karakter (`axis`). Hasilnya: kedua karakter masuk frame 9:16 secara proporsional dengan dimensi kedalaman 3D yang kaya.
3. **Gunakan `stagingPresetId` & `safeCameraSide`**:
   Manfaatkan preset lokasi di `src/worlds/village/locations.ts` dan `src/worlds/city/locations.ts` yang sudah menghitung posisi bebas pilar/pohon, lalu kunci `cameraSide: 1 | -1` agar seluruh shot dalam satu scene konsisten pada sisi 180° yang bersih.

---

## 4. Hukum Editing Berkelas (The Editor's Cutting Room)

Editor kelas dunia memotong gambar berdasarkan **Walter Murch's Rule of 6** yang diadaptasi ke engine 3D Hikmah Studio:

### 1. Emosi di Atas Segalanya (51% Bobot Keputusan)
* Jangan memotong tepat di milidetik terakhir kalimat selesai seperti robot.
* Berikan **Emotional Hold (`+0.5s` s/d `+1.0s`)** pada wajah karakter setelah kalimat kunci selesai diucapkan, agar makna kalimat meresap ke hati penonton.

### 2. Cut on Action (Potong di Tengah Gerakan)
* Saat karakter hendak berjalan, memberi sesuatu (`give`), menunjuk (`point`), atau mengangkat tangan berdoa (`pray`), mulailah animasi aksi di `timeline[]` **0.2–0.4 detik sebelum cut** atau tepat pada titik pergantian shot. Gerakan yang menyambung antar-shot membuat perpindahan kamera terasa tak kasatmata (*seamless*).

### 3. The 40% Listener Rule (Kekuatan Reaction Shot)
* Penonton belajar cara merasakan sebuah adegan bukan dari orang yang bicara, melainkan dari **reaksi orang yang mendengarkan**.
* Setiap kali petuah hikmah atau kalimat mengharukan diucapkan, pastikan:
  1. Karakter pendengar memiliki `listening: true` di `timeline[]`-nya (memicu anggukan halus & kedipan mata).
  2. Emosi pendengar berubah secara bertahap (mis. `thinking` $\rightarrow$ `solemn` $\rightarrow$ `happy`).
  3. Sisipkan shot `MCU` atau `CU` yang menyorot wajah pendengar pada momen puncak.
* **Aturan Liputan Dialog (wajib, sejak review Konten 3, 2026-11-20):** setiap baris dialog WAJIB punya minimal satu shot yang menampilkan **wajah pendengar** — reaction `MCU`/`CU` pendengar, atau two-shot dengan kedua wajah terbaca. `OTS` saja **tidak cukup**: OTS menampilkan wajah pembicara + bahu pendengar, bukan wajah pendengar. Shot pembicara saja beruntun membuat video terasa amatir — penonton tidak bisa melihat mimik lawan bicara. Pola per baris: shot pembicara (`OTS MCU`) + shot pendengar (`MCU` eye-level 1.2–2.2 dtk) atau two-shot `MCU`. Jika output `generateShotSequence` terlalu condong ke pembicara, ganti dengan shot manual untuk scene itu (preceden: Konten 3 Scene 1).

### 4. Ritme & Pacing (Kurva Napas Durasi Shot)
* **Hindari durasi shot yang seragam** (misalnya semua shot rata 4.0 detik — itu terasa mekanis dan membosankan).
* Gunakan ritme organik:
  * **Establishing / World Shot**: `3.5s – 5.5s` (beri waktu mata penonton menikmati detail dunia 3D).
  * **Dialog Normal (`MS` / `OTS`)**: `2.5s – 4.2s`.
  * **Reaction Shot (`CU`)**: `1.2s – 2.2s` (singkat, tajam, berkesan).
  * **Climactic Hikmah (`MCU` / `CU` `pushIn`)**: `4.5s – 6.5s` (tahan lebih lama agar khusyuk).

### 5. Kontinuitas Eye-Trace & 9:16 Safe Zones
Dalam video 9:16 Hikmah Studio, `ProductionOverlay` merender elemen UI di atas kanvas 3D:
* **Zona Atas (0% – 14% tinggi layar)**: sengaja kosong — header judul & waktu putar dihapus (review Konten 3, 2026-11-20: elemen itu tidak perlu dan mengganggu frame). Jangan menaruh elemen overlay baru di zona ini.
* **Zona Bawah (76% – 100% tinggi layar)**: Kotak subtitle dialog & kartu Hikmah/Dalil.
* **ZONA EMAS WAJAH (22% – 62% tinggi layar / NDC $Y \in [-0.15, +0.45]$)**:
  Mata dan wajah karakter pada shot `MS`, `MCU`, dan `CU` **WAJIB** berada di Zona Emas ini. Jangan pernah membiarkan wajah karakter turun ke sepertiga bawah layar karena akan tertutup kotak subtitle!

---

## 5. Koreografi Akting & Bahasa Tubuh (`timeline[]`)

Sebuah karakter 3D terlihat hidup atau mati ditentukan oleh bagaimana sutradara mengisi `char.timeline[]`:

1. **Tidak Boleh Ada Karakter Mematung ("Mannequin Syndrome")**:
   * Setiap karakter di dalam scene harus memiliki timeline yang mencakup **seluruh durasi scene** (`0` sampai `scene.endSec - scene.startSec`, ingat: **waktu timeline selalu scene-relative mulai dari 0!**).
   * Karakter yang sedang menunggu giliran bicara wajib diset `listening: true` saat lawan bicaranya berbicara.
2. **Transisi Aksi yang Bermakna**:
   * Gunakan kombinasi aksi sesuai konteks cerita:
     * `walk`: Masuk ke lokasi atau berjalan bersama menuju masjid/tujuan.
     * `sit`: Melepas lelah di tepi jembatan, bangku taman, atau dek saung.
     * `give`: Menyerahkan sedekah/air/bantuan (sangat kuat untuk visualisasi kebaikan).
     * `point`: Menunjuk ke arah masjid, jalan, atau objek hikmah.
     * `bow`: Menghormat atau menyapa sopan kepada orang tua/guru.
     * `pray`: Mengangkat kedua tangan berdoa dengan `emotion: 'solemn'` di bagian penutup.
     * `lookAround`: Mengamati keindahan alam/kota di awal scene.
3. **Sinkronisasi Emosi Wajah (`emotion`)**:
   * Jangan memakai `emotion: 'neutral'` sepanjang video.
   * Bangun busur perubahan emosi: misalnya dari `sad`/`thinking` (saat mengeluh/ragu) $\rightarrow$ `surprised`/`solemn` (saat mendengar sabda Nabi ﷺ) $\rightarrow$ `happy` (saat hati menjadi lapang).

---

## 6. Color Grading, Cuaca & Atmosfer (`timeOfDay` & `weather`)

Gunakan waktu dan cuaca sebagai **metafora visual** dari isi cerita:
* **`golden` (Senja / Sore Keemasan)**: Kehangatan, pulang kerja, perenungan, silaturahmi, waktu menjelang Maghrib. Memberikan siluet hangat yang sangat sinematik.
* **`day` (Siang Cerah)**: Aktivitas pasar/kota, semangat kerja, interaksi sosial yang dinamis.
* **`dawn` (Pagi Berkabut)**: Harapan baru, kesegaran doa pagi, ketenangan batin.
* **`night` (Malam Berlampu)**: Muhasabah diri, keheningan doa malam, kontras lampu jalan/masjid yang syahdu.
* **`rain` / `fog`**: Ujian hidup, kesabaran di tengah kesulitan, atau suasana syahdu yang meredam kebisingan dunia.

---

## 7. Protokol Ruang Editing: 7 Pertanyaan Wajib Saat Memeriksa Storyboard PNG

Setelah menjalankan `npm run audit:scene -- all` dan `npm run storyboard -- all`, seorang Sutradara & Editor berkelas **WAJIB** membuka file `output/storyboards/<story>-contact-sheet.png` dan menjawab 7 pertanyaan ini secara jujur:

1. **[Framing 9:16]** Apakah di setiap panel `MS`/`MCU`/`CU`, wajah karakter berada di **Zona Emas tengah-atas** dan tidak terlalu kecil/jauh?
2. **[Sightline Bersih]** Apakah ada batang pohon, tiang lampu, pilar masjid, atau pagar yang membelah wajah karakter? (Jika ada, ubah `cameraSide`, `azimuthDeg`, atau pasang `cameraOverride`).
3. **[Arah Pandang & Eyeline]** Apakah saat dialog berlangsung, kedua karakter benar-benar saling berhadapan (tidak membelakangi lawan bicara atau menatap kosong ke tembok)?
4. **[Pijakan Tanah / Dek]** Apakah kaki atau dudukan karakter menapak sempurna di atas tanah/jembatan/dek saung (tidak melayang dan tidak tenggelam)?
5. **[Variasi Ritme Visual]** Jika dilihat dari Panel 1 sampai Panel terakhir, apakah ukuran shot bervariasi (`WS` $\rightarrow$ `MS` $\rightarrow$ `MCU` $\rightarrow$ `CU` $\rightarrow$ `WS`), atau ada 3 panel berturut-turut yang terlihat kembar identik?
6. **[Hidupnya Pendengar]** Apakah pada shot yang menampilkan dua orang, karakter yang sedang tidak bicara terlihat hidup (menghadap pembicara, postur natural, `listening: true`)?
7. **[Kemegahan Shot Penutup]** Apakah shot terakhir (`closure` / Dalil) memberikan komposisi langit/masjid/alam yang lapang dan menyentuh hati sebagai puncak perenungan?

> **Aturan Keras Ruang Editing:** Jika salah satu dari 7 poin di atas masih gagal pada gambar contact sheet PNG, **DILARANG** menyatakan pekerjaan selesai. Perbaiki `shots[]`, `cameraOverride`, atau `timeline[]`, lalu render ulang storyboard sampai setiap panel layak tayang.

---

## 8. Lihat Juga: Playbook Strategi Channel

Playbook ini mengatur **cara membuat video yang bagus**. Cara membuat video
yang **ditemukan, ditonton sampai habis, dan membuat penonton kembali**
diatur di `docs/CHANNEL_STRATEGY_PLAYBOOK.md` — cast tetap 2–3 karakter,
formula 60 detik (hook pertanyaan → satu dilema + pembalikan → hikmah +
sumber + ajakan komentar), tata bahasa judul, sistem Short + kompilasi, dan
checklist konten baru. Baca keduanya sebelum membuat konten baru.
