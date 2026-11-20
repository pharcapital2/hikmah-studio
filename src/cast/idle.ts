import { seededRandom } from './lipsync';

/**
 * Blink openness (1 = open, 0 = closed) at time `t` (seconds).
 * Seeded interval 2–6s, duration 120–180ms, occasional double blink.
 */
export function blinkAt(seed: number, t: number): number {
  const r = seededRandom(seed);
  let at = 1 + r() * 2;
  while (at < t + 1) {
    const d = 0.12 + r() * 0.06;
    const dbl = r() < 0.2;
    for (let n = 0; n < (dbl ? 2 : 1); n++) {
      const s = at + n * (d + 0.08);
      if (t >= s && t <= s + d) {
        const p = (t - s) / d;
        return 1 - Math.sin(p * Math.PI);
      }
    }
    at += 2 + r() * 4;
  }
  return 1;
}

/** Deterministic eye saccade offset `[x, y]` updated roughly every 0.5s. */
export function saccadeAt(seed: number, t: number): [number, number] {
  const bucket = Math.floor(t * 2);
  const r = seededRandom(seed * 97 + bucket);
  return [(r() - 0.5) * 0.028, (r() - 0.5) * 0.018];
}

/** Subtle periodic nod for a listening character so listeners stay alive. */
export function listenerNodAt(seed: number, t: number): number {
  const r = seededRandom(seed + 409);
  const period = 2.8 + r() * 1.6;
  const phase = (t + r() * period) % period;
  if (phase < 0.35) {
    return Math.sin((phase / 0.35) * Math.PI) * 0.07;
  }
  return 0;
}
