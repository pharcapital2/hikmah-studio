# Panduan Sinematografi untuk Agent

## Tipe data
```ts
type ShotSize = 'EWS'|'WS'|'MS'|'MCU'|'CU'|'ECU';
type ShotAngle = 'eye'|'low'|'high'|'dutch'|'aerial'|'ots';
type CameraMove = 'static'|'pushIn'|'pullOut'|'panL'|'panR'|'tilt'|'orbit'|'track'|'crane'|'handheld';
interface Shot {
  id: string; target: string; size: ShotSize; angle: ShotAngle;
  move: CameraMove; lensMm: number; startSec: number; durSec: number;
  motive: string; // alasan artistik, WAJIB diisi
  anchor?: AnchorKey;
  azimuthDeg?: number;
  over?: string;
  twoShot?: boolean;
  /** Sisi axis 180° (+1 atau -1) khusus shot ini; menimpa cameraSide milik scene */
  cameraSide?: 1 | -1;
  /** Override pose kamera eksak (berguna untuk hero shot dari Free-Cam / Viewfinder) */
  cameraOverride?: {
    position: [number, number, number];
    target: [number, number, number];
    fov?: number;
  };
}
```

## Staging Presets & Sisi Kamera (`stagingPresets` / `cameraSide`)
- Setiap `WorldLocation` dapat mendefinisikan `stagingPresets?: StagingPreset[]` berisi daftar `slots` (posisi, arah hadap, `defaultAction`, `surfaceOffset`) yang sudah terverifikasi bebas halangan, lengkap dengan `safeCameraSide?: 1 | -1`.
- Pada `ProductionScene`, isi `stagingPresetId` dan `cameraSide` (atau biarkan mewarisi `preset.safeCameraSide`), lalu hubungkan `cast[].slotId`.
- `snapToGround` (default `true`) otomatis menempelkan ketinggian karakter ke `surfaceYAt(worldId, x, z) + yOffset` (termasuk lengkung jembatan & dek saung), sehingga kaki/dudukan karakter tidak melayang atau tenggelam.
- Jika komposisi prosedural masih kurang pas untuk shot tertentu, aktifkan **🎯 Free-Cam** di `ProductionStudio` (atau **📱 9:16 Frame** di `MapPreview`), geser kamera di viewfinder 9:16, klik **📋 Copy Shot Override**, dan tempel hasilnya ke `shot.cameraOverride`.

## Workflow Audit Spasial & Visual Storyboard
1. **Validasi planner**: `npm run verify:camera` (`npx tsx src/cinematography/verifyPlanner.ts`) — memastikan kontrak `ShotSequencer`, simetri jarak, front-facing, OTS clearance, dan `cameraOverride`.
2. **Audit spasial 9:16 per frame**: `npm run audit:scene -- [konten-1|konten-2|all] [--json]` — mengevaluasi setiap shot pada 3 titik sampel (awal, tengah, akhir) untuk NDC framing 9:16, arah hadap wajah, clipping jarak, tabrakan & sightline halangan 3D, ground clearance, serta kontinuitas timeline. Target wajib: **0 FAIL**.
3. **Render & inspeksi storyboard**: `npm run storyboard -- [konten-1|konten-2|all]` — merender seluruh shot melalui headless browser ke contact sheet 4 kolom di `output/storyboards/<story>-contact-sheet.png` untuk QA visual sebelum produksi selesai.

## Resep dasar
| Situasi | Urutan shot |
|---|---|
| Buka scene | EWS/aerial establishing → WS lokasi → MS karakter |
| Dialog 2 orang | WS master → OTS A → OTS B → CU reaksi → kembali master |
| Momen emosional | MS → pushIn pelan ke CU, tahan 1–2 dtk setelah kalimat |
| Perjalanan | track samping / follow belakang, lalu WS dengan karakter mengecil |
| Reveal | mulai CU detail → pullOut ke WS |
| Penutup | pullOut/crane ke aerial, fade |

## Aturan
1. Axis 180°: tetapkan garis antar karakter per scene, kamera tetap di satu sisi.
2. Jangan jump-cut: beda ukuran ≥1 tingkat atau beda sudut ≥30°.
3. Cut pada jeda ucapan/akhir kalimat; reaction shot 0.8–1.5 dtk.
4. Shot durasi bervariasi 2–6 dtk; wide lebih lama, CU lebih pendek.
5. Pakai `cameraAnchors` Location; offset kecil boleh, tembus objek dilarang.
6. Easing ease-in-out, kecepatan gerak lambat (push-in ≤ 1.5 m/dtk).
7. Setiap shot punya `motive`. Tanpa motif → tidak boleh ada gerak (gunakan static).
8. Validasi otomatis `shotPlanner`: cek axis, durasi, tabrakan objek, area kosong.
9. Output planner harus deterministik untuk frame yang sama.
