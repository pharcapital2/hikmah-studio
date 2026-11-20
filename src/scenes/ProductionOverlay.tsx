import React, { useMemo } from 'react';
import type { ProductionStory, ProductionScene, SceneDialogue } from './types';
import type { Shot } from '../cinematography/shotTypes';
import { Sparkles, BookOpen, Quote } from 'lucide-react';

interface ProductionOverlayProps {
  story: ProductionStory;
  currentTime: number;
  cleanMode?: boolean;
}

const SPEEDLINE_COUNT = 32;

function pseudoUnit(index: number, tick: number): number {
  const x = Math.sin((index + 1) * 12.9898 + tick * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const RadialSpeedlinesOverlay: React.FC<{ currentTime: number }> = ({ currentTime }) => {
  const tick = Math.floor(currentTime * 18);
  const rays = useMemo(() => {
    return Array.from({ length: SPEEDLINE_COUNT }, (_, i) => {
      const baseAngle = (i / SPEEDLINE_COUNT) * Math.PI * 2;
      const angle = baseAngle + (pseudoUnit(i, tick) - 0.5) * 0.09;
      const r1 = 25 + pseudoUnit(i + 40, tick) * 15;
      const r2 = 76;
      const x1 = 50 + Math.cos(angle) * r1;
      const y1 = 46 + Math.sin(angle) * r1;
      const x2 = 50 + Math.cos(angle) * r2;
      const y2 = 46 + Math.sin(angle) * r2;
      const sw = 0.25 + pseudoUnit(i + 90, tick) * 0.55;
      return { x1, y1, x2, y2, sw };
    });
  }, [tick]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full opacity-85"
    >
      {rays.map((r, idx) => (
        <line
          key={idx}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke="rgba(255, 255, 255, 0.72)"
          strokeWidth={r.sw}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export const ProductionOverlay: React.FC<ProductionOverlayProps> = ({
  story,
  currentTime,
  cleanMode = false,
}) => {
  const isDramaticShorts = story.cinematographyStyle === 'dramatic-shorts';

  // Cari scene aktif
  const activeScene: ProductionScene = useMemo(() => {
    for (const sc of story.scenes) {
      if (currentTime >= sc.startSec && currentTime < sc.startSec + sc.durationSec) {
        return sc;
      }
    }
    return story.scenes[story.scenes.length - 1];
  }, [story.scenes, currentTime]);

  // Cari shot aktif untuk deteksi impactFx
  const activeShot: Shot | undefined = useMemo(() => {
    for (const sh of activeScene.shots) {
      if (currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec) {
        return sh;
      }
    }
    return activeScene.shots[activeScene.shots.length - 1];
  }, [activeScene.shots, currentTime]);

  // Cari dialog aktif (dukung startSec absolut maupun relatif terhadap scene)
  const activeDialogueMatch: { dialogue: SceneDialogue; startSec: number } | undefined = useMemo(() => {
    for (const d of activeScene.dialogue) {
      const start =
        activeScene.startSec > 0 && d.startSec >= activeScene.startSec
          ? d.startSec
          : activeScene.startSec + d.startSec;
      if (currentTime >= start && currentTime < start + d.durSec) {
        return { dialogue: d, startSec: start };
      }
    }
    return undefined;
  }, [activeScene, currentTime]);

  const activeDialogue = activeDialogueMatch?.dialogue;

  // Apakah kartu dalil/hikmah sedang aktif (biasanya di beat penutup scene 2, misal > 50s)
  const isHikmahCardActive = Boolean(
    (activeScene.dalilCard || activeScene.hikmahCard) &&
      currentTime >= activeScene.startSec + (activeScene.durationSec - 11.5)
  );

  // Karaoke chunk untuk mode dramatic-shorts
  const karaokeData = useMemo(() => {
    if (!isDramaticShorts || !activeDialogueMatch) return null;
    const words = activeDialogueMatch.dialogue.text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return null;
    const chunkSize = 4;
    const dur = Math.max(0.05, activeDialogueMatch.dialogue.durSec);
    const progress = Math.min(0.9999, Math.max(0, (currentTime - activeDialogueMatch.startSec) / dur));
    const activeIdx = Math.min(words.length - 1, Math.floor(progress * words.length));
    const chunkStart = Math.floor(activeIdx / chunkSize) * chunkSize;
    return {
      words: words.slice(chunkStart, chunkStart + chunkSize),
      activeLocalIdx: activeIdx - chunkStart,
    };
  }, [isDramaticShorts, activeDialogueMatch, currentTime]);

  const showSpeedlines = isDramaticShorts && activeShot?.impactFx === 'speedlines';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
      {showSpeedlines && <RadialSpeedlinesOverlay currentTime={currentTime} />}

      {/* 1. Header Bar: Judul & Tema (Disembunyikan jika cleanMode) */}
      {!cleanMode && (
        <div className="relative z-20 flex items-center justify-between w-full">
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-3.5 py-1.5 backdrop-blur-md border border-white/10 shadow-lg">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-display text-xs font-bold uppercase tracking-wider text-emerald-300">
              {story.theme}
            </span>
            <span className="text-white/30 text-xs">•</span>
            <span className="text-xs font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">
              {story.title}
            </span>
          </div>

          <div className="rounded-full bg-black/50 px-3 py-1 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/80">
            {formatTime(currentTime)} / {formatTime(story.totalDurationSec)}
          </div>
        </div>
      )}

      {/* 2. Area Tengah: Kartu Dalil & Mutiara Hikmah */}
      {isHikmahCardActive && (activeScene.dalilCard || activeScene.hikmahCard) ? (
        <div className="relative z-20 my-auto mx-auto w-full max-w-md px-2 flex flex-col gap-3.5 animate-in fade-in zoom-in-95 duration-500">
          {/* Kartu Dalil Hadits */}
          {activeScene.dalilCard && (
            <div className="rounded-2xl border border-amber-400/40 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-emerald-950/90 p-5 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between mb-3 border-b border-amber-400/20 pb-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs tracking-wider uppercase">
                  <BookOpen className="h-4 w-4 text-amber-400" />
                  <span>Hadits Pilihan</span>
                </div>
                <span className="rounded-md bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300 border border-amber-400/30">
                  {activeScene.dalilCard.source}
                </span>
              </div>

              {/* Teks Arab */}
              <p
                className="my-3 text-center font-serif text-2xl font-bold leading-relaxed text-amber-100 drop-shadow-md"
                dir="rtl"
              >
                {activeScene.dalilCard.arabic}
              </p>

              {/* Transliterasi & Terjemah */}
              {activeScene.dalilCard.transliteration && (
                <p className="text-center text-xs italic text-amber-200/80 mb-1">
                  "{activeScene.dalilCard.transliteration}"
                </p>
              )}
              <p className="text-center text-xs sm:text-sm font-medium text-slate-200">
                "{activeScene.dalilCard.translation}"
              </p>
            </div>
          )}

          {/* Kartu 3 Mutiara Hikmah */}
          {activeScene.hikmahCard && (
            <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-slate-950/95 to-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-2 mb-2.5 text-emerald-300 font-bold text-xs uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>{activeScene.hikmahCard.title}</span>
              </div>
              <ul className="flex flex-col gap-2">
                {activeScene.hikmahCard.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300 border border-emerald-400/40">
                      {idx + 1}
                    </span>
                    <span className="leading-tight">{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        /* Spacer bila kartu dalil tidak aktif */
        <div className="flex-1" />
      )}

      {/* 3. Area Bawah: Subtitle Dialog Dinamis */}
      {isDramaticShorts ? (
        <div className="relative z-20 w-full flex flex-col items-center text-center pb-16 sm:pb-20 min-h-[110px] justify-end">
          {!isHikmahCardActive && activeDialogue && karaokeData && (
            <div className="flex flex-col items-center gap-2 max-w-md px-3">
              <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 font-display text-lg sm:text-2xl font-extrabold leading-snug tracking-tight">
                {karaokeData.words.map((word, wIdx) => {
                  const isActive = wIdx === karaokeData.activeLocalIdx;
                  return (
                    <span
                      key={`${wIdx}-${word}`}
                      className={
                        isActive
                          ? 'rounded-lg bg-amber-400 px-2 py-0.5 text-slate-950 font-extrabold shadow-lg'
                          : 'text-white [text-shadow:_0_2px_4px_rgb(0_0_0_/_95%),_0_0_12px_rgb(0_0_0_/_90%)]'
                      }
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-20 w-full flex flex-col items-center text-center pb-8 sm:pb-12 min-h-[90px] justify-end">
          {activeDialogue && (
            <div className="flex flex-col items-center gap-2 max-w-lg px-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Speaker Tag Badge */}
              <div
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold shadow-md border backdrop-blur-md ${
                  activeDialogue.speakerId === 'anak'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                    : activeDialogue.speakerId === 'kakek'
                    ? 'bg-emerald-600/20 text-emerald-200 border-emerald-400/40'
                    : 'bg-slate-800/60 text-slate-200 border-white/20'
                }`}
              >
                <Quote className="h-3 w-3 opacity-70" />
                <span>{activeDialogue.speakerName}</span>
              </div>

              {/* Subtitle Text (High-Contrast untuk Video 9:16) */}
              <p className="font-display text-base sm:text-xl font-bold leading-snug tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] stroke-black [text-shadow:_0_2px_4px_rgb(0_0_0_/_90%),_0_0_20px_rgb(0_0_0_/_80%)]">
                {activeDialogue.text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default ProductionOverlay;
