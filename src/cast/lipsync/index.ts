export type Viseme = 'rest' | 'A' | 'E' | 'I' | 'O' | 'U' | 'MBP' | 'FV' | 'S' | 'L';

export interface VisemeKey {
  t: number;
  v: Viseme;
  w?: number;
}

export interface Mouth {
  open: number;
  wide: number;
  round: number;
  jaw: number;
  cheek: number;
  closed: boolean;
}

export function seededRandom(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAP: Record<string, Viseme> = {
  a: 'A',
  e: 'E',
  i: 'I',
  o: 'O',
  u: 'U',
  m: 'MBP',
  b: 'MBP',
  p: 'MBP',
  f: 'FV',
  v: 'FV',
  s: 'S',
  z: 'S',
  l: 'L',
  r: 'L',
  n: 'L',
  t: 'L',
  d: 'L',
  c: 'S',
  j: 'S',
  k: 'L',
  g: 'L',
  h: 'A',
  w: 'U',
  y: 'I',
};

const VOWELS = 'aeiou';

/**
 * Indonesian text -> viseme keys; deterministic syllable/letter timing
 * with breathing pauses on commas (150–400ms scale) and sentence stops.
 */
export function textToVisemes(
  text: string,
  startSec: number,
  endSec: number
): { keys: VisemeKey[]; wordTimes: number[]; isQuestion: boolean } {
  const items: { v: Viseme; wt: number; word: number }[] = [];
  let word = -1;
  let inWord = false;
  const src = text.toLowerCase();

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (/[a-z]/.test(c)) {
      if (!inWord) {
        word++;
        inWord = true;
      }
      if (c === 's' && src[i + 1] === 'y') {
        items.push({ v: 'S', wt: 0.7, word });
        i++;
        continue;
      }
      if (c === 'n' && (src[i + 1] === 'g' || src[i + 1] === 'y')) {
        items.push({ v: 'L', wt: 0.6, word });
        i++;
        continue;
      }
      const v = MAP[c];
      if (!v) continue;
      items.push({ v, wt: VOWELS.includes(c) ? 1.4 : 0.65, word });
    } else {
      inWord = false;
      if (c === ',' || c === ';') items.push({ v: 'rest', wt: 3.2, word: -1 });
      else if (/[.!?]/.test(c)) items.push({ v: 'rest', wt: 4.5, word: -1 });
      else if (c === ' ') items.push({ v: 'rest', wt: 0.35, word: -1 });
    }
  }

  const total = items.reduce((s, x) => s + x.wt, 0) || 1;
  const dur = Math.max(0.1, endSec - startSec);
  let t = startSec;
  const keys: VisemeKey[] = [];
  const wordTimes: number[] = [];

  for (const it of items) {
    if (it.word >= 0 && wordTimes[it.word] === undefined) {
      wordTimes[it.word] = t;
    }
    keys.push({
      t,
      v: it.v,
      w: it.v === 'rest' ? 0 : 0.3 + 0.7 * Math.min(1, it.wt / 1.4),
    });
    t += (it.wt / total) * dur;
  }

  keys.push({ t: endSec, v: 'rest', w: 0 });
  return { keys, wordTimes, isQuestion: text.includes('?') };
}

/** Amplitude (0..1) track -> visemes, for audio-driven fallback (seeded vowel cycle). */
export function amplitudeToVisemes(amps: number[], fps: number, seed = 1): VisemeKey[] {
  const r = seededRandom(seed);
  const vs: Viseme[] = ['A', 'E', 'O', 'I', 'U'];
  return amps.map((a, i) => ({
    t: i / fps,
    v: a < 0.08 ? 'rest' : vs[Math.floor(r() * vs.length)],
    w: Math.min(1, 0.3 + a * 0.7),
  }));
}

const SHAPE: Record<Viseme, Mouth> = {
  rest: { open: 0, wide: 0, round: 0, jaw: 0, cheek: 0, closed: true },
  A: { open: 1, wide: 0.2, round: 0, jaw: 0.9, cheek: 0.15, closed: false },
  E: { open: 0.5, wide: 0.7, round: 0, jaw: 0.45, cheek: 0.45, closed: false },
  I: { open: 0.25, wide: 1, round: 0, jaw: 0.2, cheek: 0.6, closed: false },
  O: { open: 0.65, wide: 0, round: 0.8, jaw: 0.65, cheek: -0.2, closed: false },
  U: { open: 0.3, wide: 0, round: 1, jaw: 0.3, cheek: -0.25, closed: false },
  MBP: { open: 0, wide: 0, round: 0, jaw: 0.05, cheek: 0.1, closed: true },
  FV: { open: 0.15, wide: 0.3, round: 0, jaw: 0.15, cheek: 0.1, closed: false },
  S: { open: 0.15, wide: 0.6, round: 0, jaw: 0.1, cheek: 0.25, closed: false },
  L: { open: 0.35, wide: 0.3, round: 0, jaw: 0.3, cheek: 0.1, closed: false },
};

const ease = (t: number) => t * t * (3 - 2 * t);

/** Sample mouth at time `t` with coarticulation: eased 60ms transitions between keys. */
export function sampleMouth(keys: VisemeKey[], t: number, trans = 0.06): Mouth {
  if (!keys.length || t < keys[0].t || t > keys[keys.length - 1].t) {
    return SHAPE.rest;
  }
  let i = 0;
  while (i + 1 < keys.length && keys[i + 1].t <= t) i++;
  const cur = keys[i];
  const prev = keys[Math.max(0, i - 1)];
  const k = ease(Math.min(1, (t - cur.t) / trans));
  const sc = (key: VisemeKey): Mouth => {
    const s = SHAPE[key.v];
    const w = key.w ?? 1;
    return {
      open: s.open * w,
      wide: s.wide,
      round: s.round,
      jaw: s.jaw * w,
      cheek: s.cheek * w,
      closed: s.closed,
    };
  };
  const a = sc(prev);
  const b = sc(cur);
  return {
    open: a.open + (b.open - a.open) * k,
    wide: a.wide + (b.wide - a.wide) * k,
    round: a.round + (b.round - a.round) * k,
    jaw: a.jaw + (b.jaw - a.jaw) * k,
    cheek: a.cheek + (b.cheek - a.cheek) * k,
    closed: b.closed && k > 0.5,
  };
}
