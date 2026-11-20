# Panduan Akting & Animasi Bicara

## Pipeline
`script → VO (audio) → timestamp kata/fonem → viseme track → ekspresi + gesture → render`

## Data
```ts
type Viseme = 'rest'|'A'|'E'|'I'|'O'|'U'|'MBP'|'FV'|'S'|'L';
interface DialogueLine {
  castId: string; text: string; audioSrc?: string;
  startSec: number; endSec: number;
  emotion: 'neutral'|'happy'|'sad'|'surprised'|'angry'|'solemn'|'thinking';
  emphasis?: number[]; // indeks kata yang ditekan
  visemes?: { t: number; v: Viseme; w?: number }[];
}
```

## Aturan lip-sync
- Peta huruf Indonesia → viseme (a→A, e→E, i→I, o→O, u→U, m/b/p→MBP, f/v→FV, s/z/sy→S, l/r/n/t/d→L).
- Interpolasi antar viseme 40–80 ms (ease), bukan snap.
- MBP menutup bibir penuh; vokal dibuka sesuai amplitudo (0.3–1.0).
- Tanpa audio timestamp: perkirakan dari panjang suku kata, tapi tetap deterministik.
- Rahang + bibir + sedikit pipi; jangan hanya satu parameter buka-tutup.

## Kehidupan
- Blink: interval acak ber-seed 2–6 dtk, durasi 120–180 ms, blink ganda sesekali.
- Idle: nafas (dada naik turun ~0.25 Hz), head sway ±1–2°, bobot badan bergeser.
- Saat bicara: head nod di kata ditekan, tangan bergerak 1 gesture per frasa, alis naik di tanya/tekanan.
- Mata: lookAt lawan bicara, saccade kecil, lirik ke bawah/atas saat berpikir.
- Pendengar: angguk kecil, ekspresi bereaksi, tidak membeku.
- Emosi: blend ke ekspresi baru dalam 200–400 ms; kembali netral setelah baris.
- Jeda napas 150–400 ms di koma/titik; jangan dialog bertumpuk.

## Verifikasi
- Halaman `/cast/preview`: pilih karakter, ketik teks, lihat lip-sync + ekspresi.
- Uji dengan 3 kalimat: pendek, panjang berkoma, pertanyaan/seruan.
