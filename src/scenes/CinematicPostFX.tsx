/**
 * CinematicPostFX.tsx
 * Post-processing pipeline untuk tampilan cinematic film.
 *
 * Efek yang dipakai (semua deterministik, aman untuk Remotion):
 *  1. Bloom      — cahaya matahari/lampu "bersinar", kesan hangat
 *  2. Vignette   — sudut gelap, framing sinematik
 *  3. BrightnessContrast — grade kontras untuk kedalaman warna
 *  4. HueSaturation — boost saturasi warna untuk feel "sinematik"
 *  5. DepthOfField (opsional) — blur background saat CU/MCU
 *
 * Catatan: @react-three/postprocessing v2.x kompatibel dengan @react-three/fiber v8.
 */

import { memo } from 'react';
import { EffectComposer, Bloom, Vignette, BrightnessContrast, HueSaturation, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';

export interface CinematicPostFXProps {
  /** Preset mood: 'sunset' (hangat keemasan), 'night' (biru kelabu), 'neutral' */
  mood?: 'sunset' | 'night' | 'neutral';
  /** Aktifkan Depth of Field (blur background). Gunakan untuk CU/MCU. */
  dof?: boolean;
  /** Nonaktifkan DoF pass sepenuhnya bila cerita memakai gaya deep-focus (hindari rebuild pipeline). */
  enableDofPass?: boolean;
  /** Jarak fokus ke subjek utama (meter). Default: 3. */
  focusDistance?: number;
  /** F-stop virtual. Semakin kecil = blur lebih kuat. Default: 2.8 untuk CU. */
  focalLength?: number;
  /** Intensitas bokeh (depth blur). Default: 0.025. */
  bokehScale?: number;
}

const MOOD_SETTINGS = {
  // Senja: bloom lebih mudah menyala di highlight kulit/langit (threshold
  // 0.72 → 0.65), warna lebih jenuh & kontras sedikit naik agar tidak pucat,
  // vignette lebih tegas untuk framing 9:16.
  sunset: {
    bloomIntensity: 0.9,
    bloomLuminanceThreshold: 0.65,
    vignetteDarkness: 0.58,
    vignetteOffset: 0.38,
    brightness: 0.04,
    contrast: 0.2,
    hue: 0.03,
    saturation: 0.28,
  },
  night: {
    bloomIntensity: 1.4,
    bloomLuminanceThreshold: 0.6,
    vignetteDarkness: 0.68,
    vignetteOffset: 0.38,
    brightness: -0.06,
    contrast: 0.22,
    hue: -0.05,
    saturation: -0.1,
  },
  neutral: {
    bloomIntensity: 0.5,
    bloomLuminanceThreshold: 0.85,
    vignetteDarkness: 0.4,
    vignetteOffset: 0.5,
    brightness: 0.02,
    contrast: 0.1,
    hue: 0,
    saturation: 0.1,
  },
} as const;

export const CinematicPostFX = memo(function CinematicPostFX({
  mood = 'sunset',
  dof = false,
  enableDofPass = true,
  focusDistance = 3,
  focalLength = 0.08,
  bokehScale = 3.5,
}: CinematicPostFXProps) {
  const m = MOOD_SETTINGS[mood];
  const quantizedDist = Math.round(focusDistance * 4) / 4;

  return (
    <EffectComposer multisampling={0}>
      {/* 1. Bloom — efek cahaya "memancar" */}
      <Bloom
        intensity={m.bloomIntensity}
        luminanceThreshold={m.bloomLuminanceThreshold}
        luminanceSmoothing={0.025}
        kernelSize={KernelSize.LARGE}
        blendFunction={BlendFunction.SCREEN}
      />

      {/* 2. Brightness + Contrast */}
      <BrightnessContrast
        brightness={m.brightness}
        contrast={m.contrast}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* 3. Hue Saturation */}
      <HueSaturation
        hue={m.hue}
        saturation={m.saturation}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* 4. Vignette — framing sinematik */}
      <Vignette
        darkness={m.vignetteDarkness}
        offset={m.vignetteOffset}
        blendFunction={BlendFunction.NORMAL}
      />

      {/* 5. Depth of Field — tetap terpasang di sepanjang cerita agar tidak rebuild pipeline di cut */}
      {enableDofPass ? (
        <DepthOfField
          focusDistance={quantizedDist / 1000}
          focalLength={focalLength}
          bokehScale={dof ? bokehScale : 0}
          height={480}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
});
