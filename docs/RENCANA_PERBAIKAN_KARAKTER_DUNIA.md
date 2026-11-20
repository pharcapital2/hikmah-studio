# Rencana Perbaikan Karakter, Dunia & Props (pasca-Konten 3 v2)

Sumber: arahan Kholik 2026-11-20 ~19:05 + pemeriksaan kode. Urutan: kerudung
dulu (sedang dicek), lalu perbaikan ini, baru bangun scene Konten 4 di atas
cast/dunia yang sudah diperbaiki.

> **Koreksi 2026-11-20 ~19:09 (Kholik): contoh di atas hanya contoh — scene
> Fajar (Konten 3) TIDAK dibuat ulang.** Aksi + prop di bawah ini tetap
> dibuat sebagai instrumen reusable untuk konten berikutnya, bukan untuk
> mengubah Konten 3. Wiring ke `kontenHikmah3.ts` DIBATALKAN; isi pasar untuk
> Konten 3 dihentikan. Fokus dunia beralih ke lokasi Konten 4 (saung, kebun,
> pohon besar, hujan).

## 1. Dompet — prop + aksi mengambil + adegan mengulurkan

Masalah: Fajar tidak pernah memungut dompet; dialog menyebut "karung beras"
yang tidak ada di dunia.

- `src/cast/props3d.tsx`: tambah `WalletProp` — dompet cokelat (badan kotak
  pipih + lipatan + kancing), mengikuti pola `ClayCupProp` / `CarryPoleProp`.
- `src/cast/animations.ts`: tambah aksi baru `'pickup'` ke `CharacterAction`
  + `ACTION_LABELS` + `case 'pickup'` di `sampleActionPose` (membungkuk,
  tangan kanan turun ke tanah lalu terangkat menggenggam; pakai pola envelope
  `smooth01` seperti aksi `'drink'`).
- `src/cast/CharacterModel.tsx`: tampilkan `WalletProp` di tangan saat
  `action === 'pickup'` (dan saat segmen memegang/mengulurkan), pola sama
  seperti `{action === 'drink' && <ClayCupProp />}`.
- **DIBATALKAN:** wiring ke `src/scenes/kontenHikmah3.ts` tidak dilakukan —
  scene Konten 3 tidak diubah (Kholik, 19:09). Aksi `'pickup'` /
  `'holdWallet'` / `'giveWallet'` dipakai pertama kali di konten yang memang
  butuh adegan mengambil/mengulurkan.
- WORLD: dompet tergeletak di tanah pasar + `karung beras` di dekat warung
  (keduanya disebut dialog tapi belum ada di dunia). Dompet di tanah: prop
  dunia statis di titik pengambilan — kamera tidak kembali ke titik itu
  setelah diambil, jadi tidak terlihat ganda. Karung beras: prop dunia di
  lokasi pasar.

## 2. Tengok kanan-kiri — gerakan kepala menoleh

Masalah: narasi d2 "Fajar menoleh ke kanan dan ke kiri" tapi kepala diam.

- Mekanisme sudah ada: `CharacterModel.tsx` ~323 — `headYaw` mengikuti
  `lookAt` (clamp ±0.7 rad × 0.6), dan `ActionPose.headAddRot[1]` adalah yaw
  tambahan kepala.
- Opsi A (tanpa aksi baru): animasikan `lookAt` Fajar ke titik kiri lalu
  kanan selama segmen 10–18.9 dtk.
- Opsi B (lebih eksplisit, dipilih): aksi baru `'lookAround'` di
  `animations.ts` — `headAddRot[1] = sin(t * 2.2) * 0.5` (menoleh kiri-kanan
  perlahan selama segmen), tubuh tetap diam. Lebih mudah dibaca di timeline
  dan bisa dipakai ulang di konten lain.
- Verifikasi: storyboard Konten 3, cek shot d2 (Fajar menoleh).

## 3. Dunia masih kosong — isi lokasi pasar & halaman masjid

- **Ditunda:** isi pasar (`warung-chat`) untuk Konten 3 — tidak dikerjakan,
  scene Konten 3 tidak diubah.
- Fokus dunia beralih ke Konten 4: pohon besar pahlawan di dekat saung/kebun
  (prop dunia baru), cuaca hujan untuk adegan banjir, dan isi saung/kebun
  (tikar, lampu, tanaman).
- Prinsip: setiap benda yang disebut dialog HARUS ada di layar; tiap lokasi
  punya minimal 1 elemen hidup yang bergerak.

## Urutan kerja

1. Kerudung Bu Aminah (sedang dicek) → commit + push.
2. Verifikasi aksi baru + `WalletProp` (build lolos, audit 0 FAIL, cek di
   halaman CastPreview) — instrumen reusable, tanpa mengubah scene mana pun.
3. Bangun scene Konten 4 di atas cast/dunia yang sudah diperbaiki (pohon
   besar, hujan, saung/kebun; pakai `'lookAround'` kalau ada beat menoleh).
4. Setiap langkah: audit 0 FAIL + build lolos + commit + push.
