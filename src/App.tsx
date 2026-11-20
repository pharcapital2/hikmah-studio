import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, Volume2, VolumeX } from 'lucide-react';
import { STORY_PRESETS, getActiveSceneAtTime } from './data/storyScript';
import { VILLAGE_LOCATION_PRESETS } from './data/villageLocations';
import { StoryStageCanvas } from './components/scene/StoryStageCanvas';
import { SubtitleOverlay } from './components/ui/SubtitleOverlay';
import { HikmahDalilOverlay } from './components/ui/HikmahDalilOverlay';
import { StudioControls } from './components/ui/StudioControls';
import { disposeCharacterTextureCache } from './utils/characterCanvas';
import { disposeSharedToonGradient } from './utils/toonGradient';
import { soundEngine } from './utils/soundEngine';

const MapPreview = lazy(() => import('./pages/MapPreview'));
const CastPreview = lazy(() => import('./pages/CastPreview'));
const ProductionStudio = lazy(() => import('./scenes/ProductionStudio'));

type StudioMode = 'production' | 'story' | 'cast' | 'map-village' | 'map-city';

const MODE_TABS: { id: StudioMode; label: string; path: string }[] = [
  { id: 'production', label: '🎬 Studio Konten Hikmah', path: '/' },
  { id: 'cast', label: '🎭 Karakter & Animasi', path: '/cast/preview' },
  { id: 'map-village', label: '🏡 World Map: Desa', path: '/map/village' },
  { id: 'map-city', label: '🏙️ World Map: Kota', path: '/map/city' },
  { id: 'story', label: '📼 Legacy Stage', path: '/story/legacy' },
];

function getModeFromPath(pathname: string): StudioMode {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (normalized === '/cast/preview') return 'cast';
  if (normalized === '/map/village') return 'map-village';
  if (normalized === '/map/city') return 'map-city';
  if (normalized === '/story/legacy') return 'story';
  return 'production';
}

function getPathForMode(mode: StudioMode): string {
  return MODE_TABS.find((tab) => tab.id === mode)?.path ?? '/';
}

export function App() {
  const [studioMode, setStudioMode] = useState<StudioMode>(() =>
    getModeFromPath(window.location.pathname)
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    STORY_PRESETS[0].id
  );
  const [activeLocationId, setActiveLocationId] = useState<string>('timeline');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [cleanPreview, setCleanPreview] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const onPopState = () => {
      setStudioMode(getModeFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSwitchMode = useCallback((nextMode: StudioMode) => {
    if (nextMode !== 'story' && recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setIsRecording(false);
    }
    setStudioMode(nextMode);
    const targetPath = getPathForMode(nextMode);
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const activeScript = useMemo(
    () =>
      STORY_PRESETS.find((item) => item.id === selectedPresetId) ??
      STORY_PRESETS[0],
    [selectedPresetId]
  );

  const { scene: activeScene, sceneElapsed, sceneProgress } = useMemo(
    () => getActiveSceneAtTime(activeScript, currentTime),
    [activeScript, currentTime]
  );

  const activeLocationPreset = useMemo(
    () =>
      activeLocationId === 'timeline'
        ? null
        : VILLAGE_LOCATION_PRESETS.find((loc) => loc.id === activeLocationId) ??
          null,
    [activeLocationId]
  );

  // Playback RAF loop (60 FPS smooth progression, active only in Story mode)
  useEffect(() => {
    if (!isPlaying || studioMode !== 'story') return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= activeScript.totalDuration) {
          setIsPlaying(false);
          return activeScript.totalDuration - 0.01;
        }
        return next;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, studioMode, activeScript.totalDuration]);

  // Procedural audio ambience updates (paused outside Story mode)
  useEffect(() => {
    soundEngine.updateAmbience(
      isPlaying && studioMode === 'story',
      activeScene.weather.rainIntensity,
      activeScene.weather.mudflowActive,
      activeScene.id,
      activeScene.sceneType
    );
  }, [
    isPlaying,
    studioMode,
    activeScene.id,
    activeScene.sceneType,
    activeScene.weather.rainIntensity,
    activeScene.weather.mudflowActive,
  ]);

  // Dispose procedural Three.js textures on app unmount
  useEffect(() => {
    return () => {
      soundEngine.setEnabled(false);
      disposeCharacterTextureCache();
      disposeSharedToonGradient();
    };
  }, []);

  const handleSelectLocation = useCallback((id: string) => {
    setActiveLocationId(id);
    if (id !== 'timeline') {
      setIsPlaying(false);
    }
  }, []);

  const handleSelectPreset = useCallback((id: string) => {
    setActiveLocationId('timeline');
    setSelectedPresetId(id);
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (activeLocationId !== 'timeline') {
      setActiveLocationId('timeline');
      if (currentTime >= activeScript.totalDuration - 0.05) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
      return;
    }

    setIsPlaying((prev) => {
      if (!prev && currentTime >= activeScript.totalDuration - 0.05) {
        setCurrentTime(0);
      }
      return !prev;
    });
  }, [activeLocationId, currentTime, activeScript.totalDuration]);

  const handleRestart = useCallback(() => {
    setActiveLocationId('timeline');
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(activeScript.totalDuration - 0.01, time));
      setActiveLocationId('timeline');
      setCurrentTime(clamped);
    },
    [activeScript.totalDuration]
  );

  const handlePrevShot = useCallback(() => {
    setActiveLocationId('timeline');
    const idx = activeScript.scenes.findIndex((s) => s.id === activeScene.id);
    const target = activeScript.scenes[Math.max(0, idx - 1)];
    if (target) {
      setCurrentTime(target.startTime + 0.02);
    }
  }, [activeScript.scenes, activeScene.id]);

  const handleNextShot = useCallback(() => {
    setActiveLocationId('timeline');
    const idx = activeScript.scenes.findIndex((s) => s.id === activeScene.id);
    const target =
      activeScript.scenes[Math.min(activeScript.scenes.length - 1, idx + 1)];
    if (target) {
      setCurrentTime(target.startTime + 0.02);
    }
  }, [activeScript.scenes, activeScene.id]);

  const handleToggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      const next = !prev;
      soundEngine.setEnabled(next);
      return next;
    });
  }, []);

  const handleToggleRecord = useCallback(() => {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined') {
      return;
    }

    try {
      const stream = canvas.captureStream(60);
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordedChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeScript.id}-9x16.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      recorder.start();
      recorderRef.current = recorder;
      setActiveLocationId('timeline');
      setIsRecording(true);
      setCurrentTime(0);
      setIsPlaying(true);
    } catch (err) {
      console.error('Canvas recording failed:', err);
      setIsRecording(false);
    }
  }, [isRecording, activeScript.id]);

  const handleDownloadScriptJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(activeScript, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeScript.id}-script.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeScript]);

  const overallPercent = Math.min(
    100,
    (currentTime / activeScript.totalDuration) * 100
  );
  const showTopBar = !(studioMode === 'story' && cleanPreview);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      {/* Top Unified Studio Bar */}
      {showTopBar && (
        <header className="studio-chrome h-12 shrink-0 border-b border-slate-800/90 bg-slate-900/95 px-4 flex items-center justify-between gap-3">
          {/* Left: Brand Title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-display text-sm font-extrabold tracking-tight text-white">
              Hikmah Studio
            </span>
            <span className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              2.5D Toon
            </span>
          </div>

          {/* Center: 4 Mode Switcher Buttons */}
          <nav
            aria-label="Workspace Studio Modes"
            className="flex items-center gap-1.5 overflow-x-auto"
          >
            {MODE_TABS.map((tab) => {
              const active = studioMode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSwitchMode(tab.id)}
                  className={`whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-sm shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Live FPS & Story Quick Toggles */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
              {fps} FPS
            </span>

            {studioMode === 'story' && (
              <>
                <button
                  type="button"
                  onClick={handleToggleAudio}
                  title="Toggle SFX hujan & chime prosedural"
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                    audioEnabled
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {audioEnabled ? (
                    <Volume2 className="h-3.5 w-3.5" />
                  ) : (
                    <VolumeX className="h-3.5 w-3.5" />
                  )}
                  SFX
                </button>

                <button
                  type="button"
                  onClick={() => setCleanPreview(true)}
                  title="Sembunyikan panel saat preview penuh atau rekaman"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-700"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                  Mode Bersih
                </button>
              </>
            )}
          </div>
        </header>
      )}

      {/* Main 1-Screen Content */}
      <main className="flex-1 min-h-0 w-full overflow-hidden relative">
        {studioMode === 'production' && (
          <Suspense fallback={null}>
            <ProductionStudio onFpsSample={setFps} />
          </Suspense>
        )}

        {studioMode === 'story' && (
          <div className="h-full w-full flex items-center justify-center gap-5 px-4 py-3 overflow-hidden">
            {/* Vertical 9:16 Stage Frame (Height-Constrained) */}
            <section
              aria-label="9:16 Vertical Shorts Stage"
              className="relative aspect-[9/16] h-full max-h-full w-auto shrink-0 overflow-hidden rounded-[1.75rem] border-[3px] border-slate-700/90 bg-slate-950 shadow-2xl"
            >
              {/* Subtle Top Progress Bar & Theme Tag */}
              <div className="pointer-events-none absolute inset-x-0 top-0 z-40 px-4 pt-3">
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-sm">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-[width] duration-75"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="truncate rounded-full border border-white/15 bg-slate-950/65 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                    {activeLocationPreset
                      ? `${activeLocationPreset.icon} ${activeLocationPreset.label}`
                      : activeScript.themeValue}
                  </span>
                  <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/65 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-200 backdrop-blur-sm">
                    {activeLocationPreset
                      ? 'Jelajah Desa'
                      : `${activeScene.index}/${activeScript.scenes.length}`}
                  </span>
                </div>
              </div>

              {/* 3D R3F Stage */}
              <div className="h-full w-full">
                <StoryStageCanvas
                  script={activeScript}
                  activeScene={activeScene}
                  sceneElapsed={sceneElapsed}
                  sceneProgress={sceneProgress}
                  isPlaying={isPlaying}
                  cameraOverride={activeLocationPreset?.camera ?? null}
                  cameraSceneIdOverride={
                    activeLocationPreset ? `loc-${activeLocationPreset.id}` : null
                  }
                  canvasRef={canvasRef}
                  onFpsSample={setFps}
                />
              </div>

              {!activeLocationPreset && (
                <>
                  {/* Word-by-Word Subtitles for Narrative Scenes */}
                  <SubtitleOverlay
                    scene={activeScene}
                    sceneProgress={sceneProgress}
                  />

                  {/* Hikmah & Dalil Closing Cards (Zero CTA) */}
                  <HikmahDalilOverlay
                    scene={activeScene}
                    themeValue={activeScript.themeValue}
                  />
                </>
              )}
            </section>

            {/* Studio Control Sidebar (Hidden in Clean Mode) */}
            <StudioControls
              presets={STORY_PRESETS}
              activeScript={activeScript}
              activeScene={activeScene}
              locationPresets={VILLAGE_LOCATION_PRESETS}
              activeLocationId={activeLocationId}
              currentTime={currentTime}
              isPlaying={isPlaying}
              audioEnabled={audioEnabled}
              cleanPreview={cleanPreview}
              isRecording={isRecording}
              fps={fps}
              onSelectPreset={handleSelectPreset}
              onSelectLocation={handleSelectLocation}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              onSeek={handleSeek}
              onPrevShot={handlePrevShot}
              onNextShot={handleNextShot}
              onToggleAudio={handleToggleAudio}
              onToggleCleanPreview={() => setCleanPreview((prev) => !prev)}
              onToggleRecord={handleToggleRecord}
              onDownloadScriptJson={handleDownloadScriptJson}
            />
          </div>
        )}

        {studioMode === 'cast' && (
          <Suspense fallback={null}>
            <CastPreview embedded onFpsSample={setFps} />
          </Suspense>
        )}

        {studioMode === 'map-village' && (
          <Suspense fallback={null}>
            <MapPreview worldId="village" embedded onFpsSample={setFps} />
          </Suspense>
        )}

        {studioMode === 'map-city' && (
          <Suspense fallback={null}>
            <MapPreview worldId="city" embedded onFpsSample={setFps} />
          </Suspense>
        )}
      </main>
    </div>
  );
}

export default App;
