import React, { useState } from 'react';
import {
  Camera,
  CloudRain,
  Compass,
  Download,
  Eye,
  FileJson,
  Film,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  StoryScene,
  StoryScript,
  VillageLocationPreset,
} from '../../types/story';

interface StudioControlsProps {
  presets: StoryScript[];
  activeScript: StoryScript;
  activeScene: StoryScene;
  locationPresets: VillageLocationPreset[];
  activeLocationId: string;
  currentTime: number;
  isPlaying: boolean;
  audioEnabled: boolean;
  cleanPreview: boolean;
  isRecording: boolean;
  fps: number;
  onSelectPreset: (id: string) => void;
  onSelectLocation: (id: string) => void;
  onTogglePlay: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onPrevShot: () => void;
  onNextShot: () => void;
  onToggleAudio: () => void;
  onToggleCleanPreview: () => void;
  onToggleRecord: () => void;
  onDownloadScriptJson: () => void;
}

const SCENE_TYPE_BADGE: Record<
  StoryScene['sceneType'],
  { label: string; color: string }
> = {
  narrative: {
    label: 'Cerita',
    color: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
  },
  hikmah: {
    label: 'Hikmah',
    color: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  },
  dalil: {
    label: 'Dalil',
    color: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  },
};

export const StudioControls: React.FC<StudioControlsProps> = ({
  presets,
  activeScript,
  activeScene,
  locationPresets,
  activeLocationId,
  currentTime,
  isPlaying,
  audioEnabled,
  cleanPreview,
  isRecording,
  fps,
  onSelectPreset,
  onSelectLocation,
  onTogglePlay,
  onRestart,
  onSeek,
  onPrevShot,
  onNextShot,
  onToggleAudio,
  onToggleCleanPreview,
  onToggleRecord,
  onDownloadScriptJson,
}) => {
  const [activeTab, setActiveTab] = useState<'scenes' | 'locations'>('scenes');

  const activeLocationPreset = locationPresets.find(
    (loc) => loc.id === activeLocationId
  );
  const effectiveCamera = activeLocationPreset?.camera ?? activeScene.camera;

  if (cleanPreview) {
    return (
      <div className="studio-chrome fixed right-4 top-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-slate-800"
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={onToggleCleanPreview}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-slate-900/90 px-3 py-2 text-xs font-semibold text-emerald-300 shadow-lg backdrop-blur hover:bg-slate-800"
        >
          <Eye className="h-3.5 w-3.5" />
          Tampilkan Panel
        </button>
      </div>
    );
  }

  return (
    <aside className="h-full max-h-full w-full max-w-[440px] xl:w-[460px] flex flex-col justify-between gap-2.5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/85 p-3.5 shadow-2xl backdrop-blur-md">
      {/* Top Pinned Section */}
      <div className="shrink-0 flex flex-col gap-2.5">
        {/* Story Preset Picker */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label
              htmlFor="preset-select"
              className="text-[10px] font-bold uppercase tracking-wider text-slate-400"
            >
              Preset Cerita Islami (60s)
            </label>
            <span className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
              {fps} FPS • 9:16
            </span>
          </div>
          <select
            id="preset-select"
            value={activeScript.id}
            onChange={(e) => onSelectPreset(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white outline-none transition focus:border-emerald-400"
          >
            {presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.title} — ({preset.themeValue})
              </option>
            ))}
          </select>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-slate-300">
            {activeScript.summary}
          </p>
        </div>

        {/* Transport & Scrubber */}
        <div className="studio-chrome rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-mono">
            <span className="font-bold text-emerald-300">
              {currentTime.toFixed(1)}s / {activeScript.totalDuration.toFixed(0)}s
            </span>
            <span className="truncate text-slate-400">
              Shot {activeScene.index}/{activeScript.scenes.length}:{' '}
              <strong className="text-slate-200">{activeScene.title}</strong>
            </span>
          </div>

          <input
            id="studio-timeline-scrubber"
            name="timelineScrubber"
            type="range"
            min={0}
            max={activeScript.totalDuration}
            step={0.05}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            aria-label="Timeline scrubber"
            className="studio-scrubber mb-2 w-full"
          />

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onRestart}
                title="Ulangi dari awal"
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onPrevShot}
                title="Shot sebelumnya"
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-3.5 w-3.5" /> Jeda
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Putar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onNextShot}
                title="Shot berikutnya"
                className="rounded-lg border border-slate-700 bg-slate-800 p-1.5 text-slate-200 hover:bg-slate-700"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onToggleAudio}
              title="Toggle suara hujan & chime prosedural"
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                audioEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {audioEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              SFX
            </button>
          </div>
        </div>

        {/* 2-Column Compact Camera Rig & Cuaca Telemetry */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Camera className="h-3 w-3 text-amber-400" />
              Camera Rig
            </div>
            <p className="mt-0.5 truncate font-mono text-xs font-bold text-amber-300">
              {effectiveCamera.mode}
            </p>
            <p className="truncate text-[10.5px] text-slate-400">
              FOV {effectiveCamera.zoomTargetFov ?? effectiveCamera.fov ?? 45}°
              {activeLocationPreset ? ' • Jelajah' : ''}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <CloudRain className="h-3 w-3 text-sky-400" />
              Cuaca &amp; Banjir
            </div>
            <p className="mt-0.5 truncate font-mono text-xs font-bold capitalize text-sky-300">
              {activeScene.weather.preset}
            </p>
            <p className="truncate text-[10.5px] text-slate-400">
              Hujan {Math.round(activeScene.weather.rainIntensity * 100)}% •{' '}
              {activeScene.weather.mudflowActive ? 'Lumpur' : 'Kering'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle Tabbed Scroll Section */}
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 overflow-hidden">
        {/* 2-Tab Header */}
        <div className="grid shrink-0 grid-cols-2 gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('scenes')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition ${
              activeTab === 'scenes'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            Daftar Adegan ({activeScript.scenes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-bold transition ${
              activeTab === 'locations'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            Kamera Desa ({locationPresets.length})
          </button>
        </div>

        {/* Single Scrollable Container */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mt-2">
          {activeTab === 'scenes' ? (
            <div className="space-y-1.5">
              {activeScript.scenes.map((scene) => {
                const isCurrent = scene.id === activeScene.id;
                const badge = SCENE_TYPE_BADGE[scene.sceneType];

                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => onSeek(scene.startTime + 0.05)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                      isCurrent
                        ? 'border-emerald-400/60 bg-emerald-500/15 text-white'
                        : 'border-slate-800/90 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] text-slate-400">
                          {scene.startTime}s
                        </span>
                        <span className="truncate font-semibold">{scene.title}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
                        <span>{scene.camera.mode}</span>
                        {scene.characters.map((c) => (
                          <span key={c.id}>
                            • {c.name} ({c.expression})
                          </span>
                        ))}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => onSelectLocation('timeline')}
                className={`studio-chrome flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-bold transition ${
                  activeLocationId === 'timeline'
                    ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-sm shadow-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                <span>🎬 Mode Timeline Cerita</span>
                {activeLocationId === 'timeline' && (
                  <span className="rounded bg-emerald-500/25 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Aktif
                  </span>
                )}
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                {locationPresets.map((loc, idx) => {
                  const isSelected = activeLocationId === loc.id;
                  const spanFull =
                    locationPresets.length % 2 === 1 &&
                    idx === locationPresets.length - 1;

                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => onSelectLocation(loc.id)}
                      title={loc.description}
                      className={`studio-chrome flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11.5px] font-semibold transition ${
                        spanFull ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-sm shadow-amber-500/10'
                          : 'border-slate-800/90 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                      }`}
                    >
                      <span className="shrink-0 text-sm leading-none">{loc.icon}</span>
                      <span className="truncate">{loc.label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[11px] leading-relaxed text-slate-400">
                {activeLocationPreset
                  ? activeLocationPreset.description
                  : 'Pilih sudut kamera lokasi desa untuk inspeksi 3D instan tanpa mengubah posisi timeline.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Pinned Section */}
      <div className="studio-chrome shrink-0 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onToggleRecord}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            isRecording
              ? 'border-rose-400 bg-rose-500/20 text-rose-200 animate-pulse'
              : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
          }`}
        >
          {isRecording ? (
            <>
              <Download className="h-3.5 w-3.5" /> Stop &amp; Simpan WebM
            </>
          ) : (
            <>
              <Video className="h-3.5 w-3.5" /> Rekam Canvas (.webm)
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onDownloadScriptJson}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700"
        >
          <FileJson className="h-3.5 w-3.5 text-amber-300" />
          Ekspor Naskah JSON
        </button>
      </div>
    </aside>
  );
};
