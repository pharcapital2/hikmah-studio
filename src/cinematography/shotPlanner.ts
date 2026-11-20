import {
  DEFAULT_LENS,
  MAX_PUSH_SPEED,
  MAX_SHOT_SEC,
  MIN_SHOT_SEC,
  REACTION_MAX_SEC,
  REACTION_MIN_SEC,
  SIZE_DISTANCE,
  sizeIndex,
  type Shot,
} from './shotTypes';
import type { ObstacleCircle } from '../worlds/shared/types';

export type { ObstacleCircle };

export interface DialogueLine {
  speaker: string;
  startSec: number;
  durSec: number;
  text?: string;
  emotion?: 'neutral' | 'happy' | 'sad' | 'surprised' | 'angry' | 'khusyuk';
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface PlanOptions {
  /** Durasi total scene (detik); bila melebihi akhir dialog akan ditambah shot penutup. */
  totalSec?: number;
  /** Daftar halangan solid (bangunan/pohon) untuk validasi tabrakan kamera. */
  obstacles?: ObstacleCircle[];
  /** Batas dunia valid agar kamera tidak menampilkan area kosong / tepi dunia. */
  worldBounds?: WorldBounds;
  /** Resolver posisi kamera dunia (x,z) per shot untuk validasi tabrakan & batas dunia. */
  cameraXZ?: (shot: Shot) => { x: number; z: number } | undefined;
}

export interface PlanIssue {
  shotId: string;
  rule: 'axis' | '30deg' | 'duration' | 'collision' | 'motive' | 'overlap' | 'bounds';
  message: string;
}

const EMOTIONAL = new Set<NonNullable<DialogueLine['emotion']>>([
  'sad',
  'khusyuk',
  'surprised',
  'angry',
]);

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Azimut tetap di satu sisi axis (0 < az < 180) agar aturan 180° selalu terjaga.
 * Jarak sudut antar pasangan OTS / CU >= 30° untuk menghindari jump-cut.
 */
const AZ = {
  master: 90,
  otsA: 35,
  otsB: 145,
  msA: 55,
  msB: 125,
  cuA: 22,
  cuB: 158,
  reactA: 28,
  reactB: 152,
};

function speakerAzimuth(speakers: string[], speaker: string, tight: boolean): number {
  const idx = Math.max(0, speakers.indexOf(speaker));
  if (speakers.length <= 2) {
    if (idx === 0) return tight ? AZ.cuA : AZ.otsA;
    return tight ? AZ.cuB : AZ.otsB;
  }
  // Distribusi deterministik di sisi 20..160 derajat untuk >2 pembicara
  const frac = idx / Math.max(1, speakers.length - 1);
  return Math.round(20 + frac * 140);
}

/**
 * Membagi durasi panjang menjadi beberapa chunk berdurasi [MIN_SHOT_SEC, MAX_SHOT_SEC]
 * secara deterministik tanpa pernah melampaui batas durasi per shot.
 */
function splitDuration(total: number): number[] {
  if (total <= MAX_SHOT_SEC) return [Math.max(MIN_SHOT_SEC, total)];
  const count = Math.ceil(total / MAX_SHOT_SEC);
  const each = total / count;
  return Array.from({ length: count }, () => each);
}

export function planScene(
  dialogue: DialogueLine[],
  opts: PlanOptions = {}
): { shots: Shot[]; issues: PlanIssue[] } {
  const lines = [...dialogue].sort((a, b) => a.startSec - b.startSec);
  const speakers = Array.from(new Set(lines.map((l) => l.speaker)));
  const A = speakers[0];
  const B = speakers[1];
  const shots: Shot[] = [];
  let n = 0;
  const nextId = () => `shot-${String(++n).padStart(2, '0')}`;
  let t = 0;

  const push = (s: Omit<Shot, 'id' | 'startSec'>) => {
    shots.push({ ...s, id: nextId(), startSec: t });
    t += s.durSec;
  };

  // 1. Establishing: EWS aerial -> WS lokasi (memperkenalkan ruang & posisi awal)
  const firstStart = lines[0]?.startSec ?? 6;
  const introBudget = Math.max(6, firstStart);
  const ewsDur = clamp(introBudget * 0.5, 3, MAX_SHOT_SEC);
  const wsDur = clamp(introBudget - ewsDur, 3, MAX_SHOT_SEC);

  push({
    target: 'location',
    size: 'EWS',
    angle: 'aerial',
    move: 'crane',
    lensMm: DEFAULT_LENS.EWS,
    durSec: ewsDur,
    anchor: 'aerial',
    azimuthDeg: AZ.master,
    motive: 'Establishing: memperkenalkan lingkungan dari udara dengan crane turun',
  });

  push({
    target: 'location',
    size: 'WS',
    angle: 'eye',
    move: 'pullOut',
    lensMm: DEFAULT_LENS.WS,
    durSec: wsDur,
    anchor: 'wide',
    azimuthDeg: AZ.master,
    motive: 'WS lokasi: menempatkan karakter dan ruang dialog sebelum masuk percakapan',
  });

  // Jika jeda sebelum dialog pertama masih panjang, isi MS karakter pembuka agar durasi <= 6s
  if (lines[0] && t + MIN_SHOT_SEC <= lines[0].startSec) {
    for (const chunk of splitDuration(lines[0].startSec - t)) {
      push({
        target: A ?? 'location',
        size: 'MS',
        angle: 'eye',
        move: 'static',
        lensMm: DEFAULT_LENS.MS,
        durSec: chunk,
        anchor: 'medium',
        azimuthDeg: A ? AZ.msA : 55,
        motive: 'MS persiapan karakter sebelum ucapan pertama',
      });
    }
  } else if (lines[0] && t < lines[0].startSec) {
    // Serap celah kecil (<2s) ke WS pembuka jika tidak melebihi MAX_SHOT_SEC
    const gap = lines[0].startSec - t;
    if (shots[shots.length - 1].durSec + gap <= MAX_SHOT_SEC) {
      shots[shots.length - 1].durSec += gap;
      t += gap;
    }
  }

  let prevSpeaker: string | undefined;

  lines.forEach((line, i) => {
    const isA = line.speaker === A;
    const other = speakers.length > 1 ? (isA ? B : A) : undefined;
    const emo = Boolean(line.emotion && EMOTIONAL.has(line.emotion));

    // Sinkronisasi awal dialog: tambah cut/perpanjang hanya sampai batas MAX_SHOT_SEC
    if (t < line.startSec) {
      const gap = line.startSec - t;
      const last = shots[shots.length - 1];
      if (last && last.durSec + gap <= MAX_SHOT_SEC) {
        last.durSec += gap;
        t += gap;
      } else {
        for (const chunk of splitDuration(gap)) {
          push({
            target: other ?? 'location',
            size: other ? 'MS' : 'WS',
            angle: 'eye',
            move: 'static',
            lensMm: other ? DEFAULT_LENS.MS : DEFAULT_LENS.WS,
            durSec: chunk,
            anchor: other ? 'medium' : 'wide',
            azimuthDeg: other ? (other === A ? AZ.msA : AZ.msB) : 55,
            motive: 'Jeda natural antar kalimat sebelum pembicara masuk',
          });
        }
      }
    }

    const totalLineDur = Math.max(MIN_SHOT_SEC, line.durSec + (emo ? 1.4 : 0.25));

    if (!other) {
      // Monolog: MS -> CU (dengan pushIn bila emosional)
      const chunks = splitDuration(totalLineDur);
      chunks.forEach((dur, idx) => {
        const useCU = emo ? idx > 0 || chunks.length === 1 : idx % 2 === 1;
        push({
          target: line.speaker,
          size: useCU ? 'CU' : 'MS',
          angle: 'eye',
          move: emo ? 'pushIn' : idx === 0 ? 'static' : 'panR',
          lensMm: useCU ? DEFAULT_LENS.CU : DEFAULT_LENS.MS,
          durSec: dur,
          anchor: useCU ? 'close' : 'medium',
          azimuthDeg: useCU ? AZ.cuA : AZ.msA,
          motive: emo
            ? 'Push-in emosional pada monolog, tahan ekspresi setelah kalimat'
            : useCU
              ? 'CU penekanan kalimat monolog'
              : 'MS pembicara monolog',
        });
      });
      prevSpeaker = line.speaker;
      return;
    }

    if (emo) {
      // Resep momen emosional: MS -> pushIn pelan ke CU, tahan 1–2 dtk setelah kalimat
      const msDur = clamp(totalLineDur * 0.42, MIN_SHOT_SEC, MAX_SHOT_SEC);
      const cuRem = Math.max(MIN_SHOT_SEC, totalLineDur - msDur);
      push({
        target: line.speaker,
        size: 'MS',
        angle: 'eye',
        move: 'pushIn',
        lensMm: DEFAULT_LENS.MS,
        durSec: msDur,
        anchor: 'medium',
        azimuthDeg: isA ? AZ.msA : AZ.msB,
        motive: 'MS mendekat ke pembicara saat emosi meningkat',
      });
      for (const dur of splitDuration(cuRem)) {
        push({
          target: line.speaker,
          size: 'CU',
          angle: 'eye',
          move: 'pushIn',
          lensMm: DEFAULT_LENS.CU,
          durSec: dur,
          anchor: 'close',
          azimuthDeg: speakerAzimuth(speakers, line.speaker, true),
          motive: 'Push-in pelan ke CU untuk emosi, tahan setelah akhir kalimat',
        });
      }
    } else if (prevSpeaker === line.speaker) {
      // Pembicara sama dua kali berturut-turut: pastikan beda ukuran (>=1 tingkat) dari shot sebelumnya
      const last = shots[shots.length - 1];
      const nextSize = last?.target === line.speaker && last.size === 'MCU' ? 'MS' : 'MCU';
      const chunks = splitDuration(totalLineDur);
      chunks.forEach((dur, idx) => {
        const size = idx % 2 === 0 ? nextSize : nextSize === 'MCU' ? 'MS' : 'MCU';
        push({
          target: line.speaker,
          size,
          angle: size === 'MCU' ? 'ots' : 'eye',
          move: 'static',
          lensMm: size === 'MCU' ? 60 : DEFAULT_LENS.MS,
          durSec: dur,
          anchor: size === 'MCU' ? 'overShoulder' : 'medium',
          azimuthDeg: size === 'MCU' ? speakerAzimuth(speakers, line.speaker, false) : isA ? AZ.msA : AZ.msB,
          over: size === 'MCU' ? other : undefined,
          motive: 'Perubahan ukuran shot agar lanjutan dialog tidak jump-cut',
        });
      });
    } else {
      // Dialog bergantian: OTS MCU (sesekali pushIn halus di ketukan ke-3)
      const chunks = splitDuration(totalLineDur);
      chunks.forEach((dur, idx) => {
        const size = idx % 2 === 0 ? 'MCU' : 'MS';
        const usePush = idx === 0 && i % 3 === 1;
        push({
          target: line.speaker,
          size,
          angle: size === 'MCU' ? 'ots' : 'eye',
          move: usePush ? 'pushIn' : 'static',
          lensMm: size === 'MCU' ? 60 : DEFAULT_LENS.MS,
          durSec: dur,
          anchor: size === 'MCU' ? 'overShoulder' : 'medium',
          azimuthDeg: size === 'MCU' ? speakerAzimuth(speakers, line.speaker, false) : isA ? AZ.msA : AZ.msB,
          over: size === 'MCU' ? other : undefined,
          motive: usePush
            ? 'OTS dengan push-in halus mengikuti penekanan dialog'
            : 'OTS bergantian menjaga garis pandang 180°',
        });
      });
    }

    // Reaction shot pendengar saat ada jeda antar kalimat (0.8–1.5 dtk)
    const next = lines[i + 1];
    const pause = next ? next.startSec - (line.startSec + line.durSec) : 0.9;
    if (pause >= 0.45 && other) {
      const reactDur = clamp(pause, REACTION_MIN_SEC, REACTION_MAX_SEC);
      push({
        target: other,
        size: 'CU',
        angle: 'eye',
        move: 'static',
        lensMm: 85,
        durSec: reactDur,
        anchor: 'close',
        azimuthDeg: speakerAzimuth(speakers, other, true),
        motive: 'Reaction shot pendengar saat jeda kalimat',
      });
    }

    prevSpeaker = line.speaker;
  });

  // Penutup: kembali ke WS master -> crane/pullOut ke EWS aerial
  push({
    target: 'location',
    size: 'WS',
    angle: 'eye',
    move: 'pullOut',
    lensMm: DEFAULT_LENS.WS,
    durSec: 3,
    anchor: 'wide',
    azimuthDeg: AZ.master,
    motive: 'Kembali ke WS master untuk merangkum relasi karakter dan ruang',
  });
  push({
    target: 'location',
    size: 'EWS',
    angle: 'aerial',
    move: 'crane',
    lensMm: DEFAULT_LENS.EWS,
    durSec: 4,
    anchor: 'aerial',
    azimuthDeg: AZ.master,
    motive: 'Penutup scene: crane naik ke aerial, siap fade out',
  });

  if (opts.totalSec && t < opts.totalSec) {
    const extra = opts.totalSec - t;
    const last = shots[shots.length - 1];
    if (last && last.durSec + extra <= MAX_SHOT_SEC) {
      last.durSec += extra;
    } else {
      for (const chunk of splitDuration(extra)) {
        push({
          target: 'location',
          size: 'EWS',
          angle: 'aerial',
          move: 'orbit',
          lensMm: DEFAULT_LENS.EWS,
          durSec: chunk,
          anchor: 'aerial',
          azimuthDeg: 125,
          motive: 'Orbit aerial lambat menutup sisa durasi scene',
        });
      }
    }
  }

  let acc = 0;
  for (const s of shots) {
    s.startSec = acc;
    acc += s.durSec;
  }

  return { shots, issues: validatePlan(shots, opts) };
}

export function validatePlan(shots: Shot[], opts: PlanOptions = {}): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const add = (shotId: string, rule: PlanIssue['rule'], message: string) =>
    issues.push({ shotId, rule, message });

  shots.forEach((s, i) => {
    if (!s.motive?.trim()) {
      add(s.id, 'motive', 'motive wajib diisi');
    }

    const isReaction = s.size === 'CU' && s.move === 'static' && /reaction/i.test(s.motive);
    const lo = isReaction ? REACTION_MIN_SEC : MIN_SHOT_SEC;
    const hi = isReaction ? REACTION_MAX_SEC : MAX_SHOT_SEC;
    if (s.durSec < lo - 1e-6 || s.durSec > hi + 1e-6) {
      add(s.id, 'duration', `durasi ${s.durSec.toFixed(2)}s di luar batas ${lo}-${hi}s`);
    }

    if (s.azimuthDeg !== undefined && (s.azimuthDeg <= 0 || s.azimuthDeg >= 180)) {
      add(s.id, 'axis', `azimut ${s.azimuthDeg}° melewati garis axis 180°`);
    }

    if (s.move === 'pushIn' || s.move === 'pullOut') {
      const dist = SIZE_DISTANCE[s.size] * 0.35;
      if (dist / s.durSec > MAX_PUSH_SPEED) {
        add(s.id, 'duration', `kecepatan gerak ${(dist / s.durSec).toFixed(2)} m/s > ${MAX_PUSH_SPEED} m/s`);
      }
    }

    const prev = shots[i - 1];
    if (prev) {
      if (Math.abs(prev.startSec + prev.durSec - s.startSec) > 1e-6) {
        add(s.id, 'overlap', 'timeline shot tumpang tindih atau memiliki celah');
      }
      if (prev.target === s.target) {
        const dSize = Math.abs(sizeIndex(prev.size) - sizeIndex(s.size));
        const dAz = Math.abs((prev.azimuthDeg ?? 0) - (s.azimuthDeg ?? 0));
        if (dSize < 1 && dAz < 30) {
          add(s.id, '30deg', 'jump-cut: subjek sama dengan beda ukuran <1 tingkat dan sudut <30°');
        }
      }
    }

    const cam = opts.cameraXZ?.(s);
    if (cam) {
      if (opts.obstacles?.some((o) => Math.hypot(o.x - cam.x, o.z - cam.z) < o.r)) {
        add(s.id, 'collision', 'posisi kamera menembus objek solid');
      }
      if (
        opts.worldBounds &&
        (cam.x < opts.worldBounds.minX ||
          cam.x > opts.worldBounds.maxX ||
          cam.z < opts.worldBounds.minZ ||
          cam.z > opts.worldBounds.maxZ)
      ) {
        add(s.id, 'bounds', 'kamera berada di luar batas dunia / menampilkan area kosong');
      }
    }
  });

  return issues;
}
