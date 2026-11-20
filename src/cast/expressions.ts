import type { Emotion } from './characters';
export interface Expr { brow: number; browTilt: number; smile: number; eyeOpen: number; mouthOpenBias: number }
export const expressions: Record<Emotion, Expr> = {
  neutral: { brow: 0, browTilt: 0, smile: 0, eyeOpen: 1, mouthOpenBias: 0 },
  happy: { brow: 0.2, browTilt: 0, smile: 1, eyeOpen: 0.85, mouthOpenBias: 0.05 },
  sad: { brow: -0.2, browTilt: 0.6, smile: -0.7, eyeOpen: 0.75, mouthOpenBias: 0 },
  surprised: { brow: 1, browTilt: 0, smile: 0, eyeOpen: 1.25, mouthOpenBias: 0.25 },
  angry: { brow: -0.6, browTilt: -0.8, smile: -0.4, eyeOpen: 0.85, mouthOpenBias: 0 },
  solemn: { brow: -0.05, browTilt: 0.15, smile: 0.05, eyeOpen: 0.7, mouthOpenBias: 0 },
  thinking: { brow: 0.3, browTilt: 0.3, smile: 0, eyeOpen: 0.95, mouthOpenBias: 0 },
};
const ease = (t: number) => t * t * (3 - 2 * t);
/** Blend previous->next emotion over 300ms, deterministic by frame. */
export function blendExpression(prev: Emotion, next: Emotion, secSinceChange: number, dur = 0.3): Expr {
  const k = ease(Math.min(1, Math.max(0, secSinceChange / dur)));
  const a = expressions[prev], b = expressions[next];
  const o = {} as Expr;
  (Object.keys(a) as (keyof Expr)[]).forEach(key => { o[key] = a[key] + (b[key] - a[key]) * k; });
  return o;
}
