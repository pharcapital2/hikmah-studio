# Render Lokal (di Komputer Sendiri)

Panduan ini untuk me-render video Hikmah Studio di komputer sendiri
(Windows atau Mac), supaya tidak menunggu render di mesin Chol yang
tidak punya GPU.

## Kenapa render lokal lebih cepat

Mesin Chol tidak punya GPU, jadi gambar 3D digambar CPU lewat
SwiftShader (sekitar 2,2 detik per frame). Komputer biasa yang punya
GPU — walau GPU terintegrasi — dan CPU dengan core lebih banyak bisa
jauh lebih cepat, apalagi dengan concurrency yang lebih tinggi.

## Yang dibutuhkan (sekali pasang)

1. **Node.js 20 LTS** — unduh di https://nodejs.org (pilih versi LTS).
   Cek sesudah pasang: `node --version` (harus 18 atau lebih baru).
2. **Git** — unduh di https://git-scm.com/downloads.
3. **Google Chrome** — kalau belum ada, jalankan sekali:
   `npx remotion browser install chrome`
   (ini mengunduh Chrome khusus untuk render).
4. Koneksi internet untuk `npm install` (sekali saja, mengunduh
   sekitar 500 MB–1 GB).

## Langkah render

1. Dapatkan kodenya — salah satu dari:
   - `git clone https://github.com/pharcapital2/hikmah-studio.git`
     (kalau sudah pernah clone, cukup `git pull` di dalam folder itu), atau
   - unduh file ZIP repo dari Google Drive yang dikirim Chol,
     lalu ekstrak.
2. Masuk ke foldernya: `cd hikmah-studio`
3. Pasang dependensi (sekali saja, atau tiap kali ada update besar):
   `npm install`
4. Render satu konten, contoh Konten 3:
   `npm run render -- HikmahKonten3-9x16 "output/renders/Dompet yang Jatuh di Pasar Sore - Hikmah Konten 3.mp4" --codec=h264 --concurrency=4 --overwrite`
   - `concurrency` = jumlah core CPU komputer (lihat di Task Manager
     > Performance, atau isi 4 kalau tidak tahu). Makin besar makin
     cepat, selama RAM cukup.
   - **Jangan** menambahkan `--gl=swiftshader` di komputermu —
     biarkan Chrome memakai GPU.
   - Jangan menjalankan dua render sekaligus.
5. Hasilnya ada di `output/renders/`. Unggah file mp4 itu ke
   Google Drive, lalu beri tahu Chol.

## Yang terjadi sesudahnya

- File hasil render itu **bisu (tanpa suara)** — itu normal.
  Suara (voice-over) dicampur oleh Chol sesudahnya, lalu video
  final diunggah ke Drive.
- Kalau ada error saat render, kirim pesan errornya ke Chol
  (salin teks errornya apa adanya).

## Daftar komposisi

- `HikmahKonten1-9x16` — Konten #1
- `HikmahKonten2-9x16` — Konten #2
- `HikmahKonten3-9x16` — Konten #3 "Dompet yang Jatuh di Pasar Sore"
  (115,4 detik, 3462 frame)

## Kalau Chrome tidak ditemukan

Jalankan: `npx remotion browser install chrome`
lalu ulangi perintah render. Kalau masih gagal, kirim pesan
errornya ke Chol.
