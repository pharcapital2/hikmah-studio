import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';
import { StoryScene } from '../../types/story';

interface HikmahDalilOverlayProps {
  scene: StoryScene;
  themeValue: string;
}

export const HikmahDalilOverlay: React.FC<HikmahDalilOverlayProps> = ({
  scene,
  themeValue,
}) => {
  if (scene.sceneType === 'hikmah' && scene.hikmahData) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-[3px]">
        <div
          key={scene.id}
          className="animate-card-reveal w-full rounded-3xl border border-amber-400/40 bg-gradient-to-b from-slate-900/95 via-emerald-950/90 to-slate-950/95 p-6 shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/35 bg-amber-400/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Hikmah Cerita
            </span>
            <span className="text-[11px] font-semibold text-emerald-300/80">
              {themeValue}
            </span>
          </div>

          <h2 className="font-display text-lg font-extrabold leading-snug text-white">
            {scene.hikmahData.title}
          </h2>

          <div className="my-3 h-px w-full bg-gradient-to-r from-amber-400/50 via-emerald-400/40 to-transparent" />

          <ul className="space-y-2.5 text-left text-[13.5px] leading-relaxed text-slate-100">
            {scene.hikmahData.points.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  if (scene.sceneType === 'dalil' && scene.dalilData) {
    return (
      <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-slate-950/65 px-5 backdrop-blur-[4px]">
        <div
          key={scene.id}
          className="animate-card-reveal w-full rounded-3xl border border-emerald-400/45 bg-gradient-to-b from-emerald-950/95 via-slate-900/95 to-slate-950/95 p-6 text-center shadow-2xl"
        >
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-500/15 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-300">
              <BookOpen className="h-3.5 w-3.5" />
              Dalil Penutup
            </span>
          </div>

          <p
            dir="rtl"
            lang="ar"
            className="font-arabic mb-4 text-[21px] font-bold leading-[2.05] text-amber-200 drop-shadow"
          >
            {scene.dalilData.arabic}
          </p>

          <div className="mx-auto mb-3 h-px w-2/3 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

          <p className="text-[13px] italic leading-relaxed text-slate-200">
            &ldquo;{scene.dalilData.translation}&rdquo;
          </p>

          <div className="mt-4 inline-flex items-center rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-1.5 text-xs font-extrabold tracking-wide text-amber-300">
            {scene.dalilData.source}
          </div>
          {/* Intentionally zero CTA (no subscribe/like/follow prompt) */}
        </div>
      </div>
    );
  }

  return null;
};
