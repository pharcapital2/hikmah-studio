import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Video,
  EyeOff,
  Film,
  Camera,
  MapPin,
  Users,
} from 'lucide-react';
import { PRODUCTION_STORIES, getStoryById, type StoryRegistryEntry } from './registry';
import { ProductionSceneCanvas, type FreeCamPose } from './ProductionSceneCanvas';
import { ProductionOverlay } from './ProductionOverlay';
import { drawProductionOverlayToCanvas } from './canvasOverlayRenderer';
import type { CameraPose } from '../cinematography/CameraDirector';
import type { Shot } from '../cinematography/shotTypes';

export interface HikmahStudioBridge {
  setStory: (keyOrId: string) => boolean;
  seek: (sec: number) => void;
  setPaused: (paused: boolean) => void;
  setClean: (clean: boolean) => void;
  getStoryInfo: () => {
    key: string;
    id: string;
    title: string;
    totalDurationSec: number;
    shots: Array<{
      id: string;
      sceneId: string;
      locationId: string;
      startSec: number;
      durSec: number;
      size: string;
      angle: string;
      move: string;
      target: string;
    }>;
  };
  getCurrentTime: () => number;
  getPose: () => {
    pos: [number, number, number];
    aim: [number, number, number];
    fov: number;
    shotId: string;
  } | null;
  captureCanvasDataUrl: () => string | null;
  isReady: () => boolean;
}

declare global {
  interface Window {
    __HIKMAH_STUDIO__?: HikmahStudioBridge;
  }
}

export interface ProductionStudioProps {
  onFpsSample?: (fps: number) => void;
}

function readInitialStudioParams() {
  const defaultEntry = PRODUCTION_STORIES[0];
  if (typeof window === 'undefined') {
    return {
      storyKey: defaultEntry.key,
      time: 0,
      isPlaying: true,
      cleanPreview: false,
      disablePostFx: false,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const storyParam = params.get('story');
  const matchedStory = storyParam ? getStoryById(storyParam) : undefined;
  const matchedEntry = matchedStory
    ? PRODUCTION_STORIES.find((e) => e.story.id === matchedStory.id)
    : undefined;
  const activeEntry = matchedEntry ?? defaultEntry;

  const tRaw = params.get('t');
  const tParsed = tRaw !== null && tRaw.trim() !== '' ? Number(tRaw) : NaN;
  const time =
    Number.isFinite(tParsed) && tParsed >= 0
      ? Math.min(activeEntry.story.totalDurationSec - 0.01, tParsed)
      : 0;

  const isAudit = params.get('audit') === '1';
  const isPaused = isAudit || params.get('paused') === '1';
  const isClean = isAudit || params.get('clean') === '1';

  return {
    storyKey: activeEntry.key,
    time,
    isPlaying: !isPaused,
    cleanPreview: isClean,
    disablePostFx: isAudit,
  };
}

const waitAnimationFrames = async (count: number): Promise<void> => {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }
};

export const ProductionStudio: React.FC<ProductionStudioProps> = ({ onFpsSample }) => {
  const [initialParams] = useState(readInitialStudioParams);
  const [selectedStoryKey, setSelectedStoryKey] = useState<string>(initialParams.storyKey);
  const [currentTime, setCurrentTime] = useState<number>(initialParams.time);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialParams.isPlaying);
  const [cleanPreview, setCleanPreview] = useState<boolean>(initialParams.cleanPreview);
  const [disablePostFx] = useState<boolean>(initialParams.disablePostFx);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingProgress, setRecordingProgress] = useState<number>(0);
  const [isExportingStoryboard, setIsExportingStoryboard] = useState<boolean>(false);
  const [freeCamEnabled, setFreeCamEnabled] = useState<boolean>(false);
  const [freeCamPose, setFreeCamPose] = useState<FreeCamPose | null>(null);
  const [overrideCopied, setOverrideCopied] = useState<boolean>(false);
  const [currentPose, setCurrentPose] = useState<CameraPose | null>(null);

  const activeEntry: StoryRegistryEntry = useMemo(
    () =>
      PRODUCTION_STORIES.find(
        (e) => e.key === selectedStoryKey || e.story.id === selectedStoryKey
      ) ?? PRODUCTION_STORIES[0],
    [selectedStoryKey]
  );
  const story = activeEntry.story;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const recordAbortRef = useRef<boolean>(false);
  const lastHudPoseUpdateRef = useRef<number>(0);
  const copyTimerRef = useRef<number | null>(null);

  // Refs for window.__HIKMAH_STUDIO__ bridge (always fresh, zero stale closures)
  const activeEntryRef = useRef<StoryRegistryEntry>(activeEntry);
  activeEntryRef.current = activeEntry;
  const currentTimeRef = useRef<number>(currentTime);
  currentTimeRef.current = currentTime;
  const currentPoseRef = useRef<CameraPose | null>(currentPose);
  currentPoseRef.current = currentPose;
  const hasRenderedFrameRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      recordAbortRef.current = true;
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.stop();
      }
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handlePoseChange = useCallback((pose: CameraPose) => {
    hasRenderedFrameRef.current = true;
    const prevShotId = currentPoseRef.current?.shot.id;
    currentPoseRef.current = pose;

    if (isRecordingRef.current) return;

    const now = performance.now();
    if (pose.shot.id !== prevShotId || now - lastHudPoseUpdateRef.current >= 200) {
      lastHudPoseUpdateRef.current = now;
      setCurrentPose(pose);
    }
  }, []);

  const selectStoryByKeyOrId = useCallback((keyOrId: string): boolean => {
    if (isRecordingRef.current) return false;
    const matched = PRODUCTION_STORIES.find(
      (e) => e.key === keyOrId || e.story.id === keyOrId
    );
    if (!matched) return false;
    hasRenderedFrameRef.current = false;
    currentPoseRef.current = null;
    currentTimeRef.current = 0;
    setSelectedStoryKey(matched.key);
    setCurrentTime(0);
    setCurrentPose(null);
    setFreeCamEnabled(false);
    setFreeCamPose(null);
    return true;
  }, []);

  // Expose window.__HIKMAH_STUDIO__ bridge for headless inspection & storyboard capture
  useEffect(() => {
    const bridge: HikmahStudioBridge = {
      setStory: (keyOrId: string) => selectStoryByKeyOrId(keyOrId),
      seek: (sec: number) => {
        const dur = activeEntryRef.current.story.totalDurationSec;
        const clamped = Math.max(0, Math.min(dur - 0.01, sec));
        currentTimeRef.current = clamped;
        setCurrentTime(clamped);
      },
      setPaused: (paused: boolean) => {
        setIsPlaying(!paused);
      },
      setClean: (clean: boolean) => {
        setCleanPreview(clean);
      },
      getStoryInfo: () => {
        const entry = activeEntryRef.current;
        const s = entry.story;
        return {
          key: entry.key,
          id: s.id,
          title: s.title,
          totalDurationSec: s.totalDurationSec,
          shots: s.scenes.flatMap((sc) =>
            sc.shots.map((sh) => ({
              id: sh.id,
              sceneId: sc.id,
              locationId: sc.locationId,
              startSec: sh.startSec,
              durSec: sh.durSec,
              size: sh.size,
              angle: sh.angle,
              move: sh.move,
              target: sh.target,
            }))
          ),
        };
      },
      getCurrentTime: () => currentTimeRef.current,
      getPose: () => {
        const p = currentPoseRef.current;
        if (!p) return null;
        return {
          pos: [p.pos.x, p.pos.y, p.pos.z],
          aim: [p.aim.x, p.aim.y, p.aim.z],
          fov: p.fov,
          shotId: p.shot.id,
        };
      },
      captureCanvasDataUrl: () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        return canvas.toDataURL('image/png');
      },
      isReady: () =>
        canvasRef.current !== null &&
        currentPoseRef.current !== null &&
        hasRenderedFrameRef.current,
    };

    window.__HIKMAH_STUDIO__ = bridge;
    return () => {
      delete window.__HIKMAH_STUDIO__;
    };
  }, [selectStoryByKeyOrId]);

  // Cari scene & shot aktif
  const activeScene = useMemo(() => {
    for (const sc of story.scenes) {
      if (currentTime >= sc.startSec && currentTime < sc.startSec + sc.durationSec) {
        return sc;
      }
    }
    return story.scenes[story.scenes.length - 1];
  }, [story.scenes, currentTime]);

  const activeShot: Shot | undefined = useMemo(() => {
    const shots = activeScene.shots;
    for (const sh of shots) {
      if (currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec) {
        return sh;
      }
    }
    return shots[shots.length - 1];
  }, [activeScene.shots, currentTime]);

  // Semua shots datar untuk navigasi shot-by-shot
  const allShots = useMemo(() => {
    return story.scenes.flatMap((s) => s.shots);
  }, [story.scenes]);

  // Loop requestAnimationFrame untuk pemutaran 60 FPS halus (nonaktif saat perekaman fixed-timestep)
  useEffect(() => {
    if (!isPlaying || isRecording) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.1);
      lastTs = now;

      setCurrentTime((prev) => {
        const next = prev + dt;
        if (next >= story.totalDurationSec) {
          setIsPlaying(false);
          return story.totalDurationSec - 0.01;
        }
        return next;
      });

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, story.totalDurationSec]);

  // Tombol navigasi playback
  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleRestart = useCallback(() => {
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(story.totalDurationSec - 0.01, time)));
  }, [story.totalDurationSec]);

  const handlePrevShot = useCallback(() => {
    const idx = allShots.findIndex(
      (sh) => currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec
    );
    if (idx > 0) {
      handleSeek(allShots[idx - 1].startSec + 0.01);
    } else {
      handleSeek(0);
    }
  }, [allShots, currentTime, handleSeek]);

  const handleNextShot = useCallback(() => {
    const idx = allShots.findIndex(
      (sh) => currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec
    );
    if (idx >= 0 && idx < allShots.length - 1) {
      handleSeek(allShots[idx + 1].startSec + 0.01);
    }
  }, [allShots, currentTime, handleSeek]);

  // Perekaman video komposit 9:16 (3D WebGL + Overlay 2D) dengan fixed-timestep 30 FPS bebas glitch
  const handleToggleRecord = useCallback(async () => {
    if (isRecordingRef.current) {
      recordAbortRef.current = true;
      return;
    }

    const glCanvas = canvasRef.current;
    if (!glCanvas || typeof MediaRecorder === 'undefined') {
      console.warn('Canvas or MediaRecorder not available for recording');
      return;
    }

    const activeStory = activeEntryRef.current.story;
    const RECORD_W = 720;
    const RECORD_H = 1280;
    const RECORD_FPS = 30;
    const frameIntervalMs = 1000 / RECORD_FPS;

    isRecordingRef.current = true;
    recordAbortRef.current = false;
    setIsRecording(true);
    setRecordingProgress(0);
    setIsPlaying(false);
    setFreeCamEnabled(false);

    let stream: MediaStream | null = null;

    try {
      // Pre-roll settle di t=0 agar frame pembuka bersih
      currentTimeRef.current = 0;
      setCurrentTime(0);
      await waitAnimationFrames(4);

      const composite = document.createElement('canvas');
      composite.width = RECORD_W;
      composite.height = RECORD_H;
      const ctx = composite.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to create 2D composite canvas context');
      }

      const drawCompositeFrame = (t: number) => {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, RECORD_W, RECORD_H);
        const src = canvasRef.current;
        if (src && src.width > 0 && src.height > 0) {
          const srcAspect = src.width / src.height;
          const dstAspect = RECORD_W / RECORD_H;
          let sx = 0;
          let sy = 0;
          let sw = src.width;
          let sh = src.height;
          if (srcAspect > dstAspect) {
            sw = src.height * dstAspect;
            sx = (src.width - sw) * 0.5;
          } else if (srcAspect < dstAspect) {
            sh = src.width / dstAspect;
            sy = (src.height - sh) * 0.5;
          }
          ctx.drawImage(src, sx, sy, sw, sh, 0, 0, RECORD_W, RECORD_H);
        }
        drawProductionOverlayToCanvas(ctx, RECORD_W, RECORD_H, activeStory, t);
      };

      drawCompositeFrame(0);

      stream = composite.captureStream(RECORD_FPS);
      const videoTrack = stream.getVideoTracks()[0] as
        | (MediaStreamTrack & { requestFrame?: () => void })
        | undefined;

      const mimeCandidates = [
        'video/webm;codecs=h264',
        'video/webm;codecs=vp8',
        'video/webm;codecs=vp9',
        'video/webm',
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m));
      const recorderOpts: MediaRecorderOptions = mimeType
        ? { mimeType, videoBitsPerSecond: 10_000_000 }
        : { videoBitsPerSecond: 10_000_000 };

      const recorder = new MediaRecorder(stream, recorderOpts);
      recorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) {
          chunks.push(ev.data);
        }
      };

      const stoppedPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => {
          if (chunks.length > 0) {
            const blobType = mimeType ?? 'video/webm';
            const blob = new Blob(chunks, { type: blobType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeStory.id}-9x16.webm`;
            a.click();
            URL.revokeObjectURL(url);
          }
          resolve();
        };
      });

      recorder.start(250);

      const totalFrames = Math.ceil(activeStory.totalDurationSec * RECORD_FPS);
      for (let f = 0; f < totalFrames; f++) {
        if (recordAbortRef.current) break;

        const frameStart = performance.now();
        const t = Math.min(activeStory.totalDurationSec - 0.001, f / RECORD_FPS);
        currentTimeRef.current = t;
        setCurrentTime(t);

        await waitAnimationFrames(2);
        if (recordAbortRef.current) break;

        drawCompositeFrame(t);
        if (videoTrack && typeof videoTrack.requestFrame === 'function') {
          try {
            videoTrack.requestFrame();
          } catch {
            // Abaikan bila track menggunakan mode auto-sampling FPS
          }
        }

        if (f % 10 === 0) {
          setRecordingProgress(t);
        }

        const elapsed = performance.now() - frameStart;
        if (elapsed < frameIntervalMs) {
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, frameIntervalMs - elapsed)
          );
        }
      }

      if (recorder.state === 'recording') {
        recorder.stop();
      }
      await stoppedPromise;
    } catch (err) {
      console.error('Recording failed:', err);
    } finally {
      recorderRef.current = null;
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
      isRecordingRef.current = false;
      recordAbortRef.current = false;
      setIsRecording(false);
      setRecordingProgress(0);
    }
  }, []);

  const handleCopyShotOverride = useCallback(async () => {
    if (!activeShot) return;
    const round2 = (n: number) => Math.round(n * 100) / 100;
    const poseSource: FreeCamPose | null =
      freeCamPose ??
      (currentPose
        ? {
            position: [round2(currentPose.pos.x), round2(currentPose.pos.y), round2(currentPose.pos.z)],
            target: [round2(currentPose.aim.x), round2(currentPose.aim.y), round2(currentPose.aim.z)],
            fov: round2(currentPose.fov),
          }
        : null);
    if (!poseSource) return;

    const text = `cameraOverride: ${JSON.stringify(poseSource)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      console.info(`[ProductionStudio] Shot override for ${activeShot.id}:\n${text}`);
    }
    setOverrideCopied(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setOverrideCopied(false);
    }, 2000);
  }, [activeShot, currentPose, freeCamPose]);

  const handleExportStoryboard = useCallback(async () => {
    if (isExportingStoryboard || allShots.length === 0) return;

    const prevTime = currentTimeRef.current;
    const prevPlaying = isPlaying;
    const prevFreeCam = freeCamEnabled;

    setIsExportingStoryboard(true);
    setIsPlaying(false);
    if (prevFreeCam) setFreeCamEnabled(false);

    try {
      await waitAnimationFrames(2);

      const cols = 4;
      const tileW = 270;
      const tileH = 480;
      const headerH = 44;
      const bannerH = 72;
      const gap = 12;
      const pad = 16;
      const rows = Math.max(1, Math.ceil(allShots.length / cols));

      const sheet = document.createElement('canvas');
      sheet.width = pad * 2 + cols * tileW + (cols - 1) * gap;
      sheet.height = bannerH + pad + rows * (headerH + tileH) + Math.max(0, rows - 1) * gap + pad;

      const ctx = sheet.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, sheet.width, sheet.height);

      // Story Title Banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, sheet.width, bannerH);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(0, bannerH - 3, sheet.width, 3);

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(story.title, pad, 32);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(
        `${story.id}  •  ${allShots.length} shots  •  ${story.totalDurationSec.toFixed(1)}s`,
        pad,
        54
      );

      for (let i = 0; i < allShots.length; i++) {
        const sh = allShots[i];
        const mid = Math.min(story.totalDurationSec - 0.01, sh.startSec + sh.durSec * 0.5);
        currentTimeRef.current = mid;
        setCurrentTime(mid);
        await waitAnimationFrames(3);

        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (tileW + gap);
        const y = bannerH + pad + row * (headerH + tileH + gap);

        // Dark header strip per tile
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, tileW, headerH);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, tileW - 1, headerH + tileH - 1);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(`#${i + 1} | ${sh.id}`, x + 8, y + 17, tileW - 16);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillText(
          `${sh.size} • ${sh.move} | ${sh.target} | t=${mid.toFixed(1)}s`,
          x + 8,
          y + 34,
          tileW - 16
        );

        const glCanvas = canvasRef.current;
        if (glCanvas) {
          ctx.drawImage(glCanvas, x, y + headerH, tileW, tileH);
        }
      }

      const dataUrl = sheet.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${story.id}-storyboard.png`;
      a.click();
    } finally {
      currentTimeRef.current = prevTime;
      setCurrentTime(prevTime);
      setFreeCamEnabled(prevFreeCam);
      setIsPlaying(prevPlaying);
      setIsExportingStoryboard(false);
    }
  }, [allShots, freeCamEnabled, isExportingStoryboard, isPlaying, story.id, story.title, story.totalDurationSec]);

  const progressPercent = Math.min(100, (currentTime / story.totalDurationSec) * 100);

  return (
    <div className="h-full w-full flex items-center justify-center gap-6 px-4 py-3 overflow-hidden">
      {/* 1. Preview Frame Vertikal 9:16 (Format Shorts / Reels) */}
      <section
        aria-label="9:16 Vertical Video Preview"
        className="relative aspect-[9/16] h-full max-h-full w-auto shrink-0 overflow-hidden rounded-[2rem] border-[3px] border-slate-700/80 bg-slate-950 shadow-2xl transition-all"
      >
        {/* Subtle Top Progress Strip */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 px-5 pt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-md">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* 3D WebGL Canvas */}
        <div className="h-full w-full">
          <ProductionSceneCanvas
            story={story}
            currentTime={currentTime}
            fps={60}
            canvasRef={canvasRef}
            onFpsSample={onFpsSample}
            onPoseChange={handlePoseChange}
            freeCamEnabled={freeCamEnabled}
            onFreeCamPoseChange={setFreeCamPose}
            disablePostFx={disablePostFx}
            isRecording={isRecording}
          />
        </div>

        {/* 2D Subtitle & Hikmah Overlay */}
        <ProductionOverlay
          story={story}
          currentTime={currentTime}
          cleanMode={cleanPreview}
        />
      </section>

      {/* 2. Control Panel & Sinematografi Sidebar */}
      {!cleanPreview && (
        <aside
          aria-label="Production Controls"
          className="flex h-full max-h-full w-[380px] shrink-0 flex-col justify-between overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-5 backdrop-blur-md shadow-xl"
        >
          {/* Bagian Atas: Header Info Konten */}
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Film className="h-5 w-5 text-emerald-400" />
                <h2 className="font-display text-sm font-bold tracking-tight text-white">
                  Studio Produksi Sinematik
                </h2>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                Lapis 3: Production
              </span>
            </div>

            {/* Story Switcher Tabs (dari registry) */}
            <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 gap-1">
              {PRODUCTION_STORIES.map((entry) => {
                const active = activeEntry.key === entry.key;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    disabled={isRecording}
                    onClick={() => selectStoryByKeyOrId(entry.key)}
                    className={`flex-1 rounded-lg py-1.5 px-2 text-xs font-semibold transition-all truncate disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>

            <div>
              <h3 className="font-display text-base font-extrabold text-white leading-tight">
                {story.title}
              </h3>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {story.summary}
              </p>
            </div>

            {/* Info Lokasi & Cast */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 p-2.5 border border-slate-800">
                <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Lokasi 3D</p>
                  <p className="font-medium text-slate-200 truncate">
                    {activeScene.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 p-2.5 border border-slate-800">
                <Users className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Karakter</p>
                  <p className="font-medium text-slate-200 truncate">
                    {activeScene.cast.map((c) => c.name).join(' & ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Kamera & Sinematografi Live Monitor */}
            {activeShot && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Camera className="h-3.5 w-3.5" />
                    <span>Kamera Sinematik</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-slate-300">
                    {activeShot.id}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                  <div className="rounded-lg bg-slate-900 p-1.5 border border-slate-800/80">
                    <span className="block text-[9px] text-slate-400 font-semibold uppercase">Size</span>
                    <span className="font-mono font-bold text-emerald-400">{activeShot.size}</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-1.5 border border-slate-800/80">
                    <span className="block text-[9px] text-slate-400 font-semibold uppercase">Lensa</span>
                    <span className="font-mono font-bold text-sky-400">{activeShot.lensMm}mm</span>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-1.5 border border-slate-800/80">
                    <span className="block text-[9px] text-slate-400 font-semibold uppercase">Gerak</span>
                    <span className="font-mono font-bold text-purple-400">{activeShot.move}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic leading-snug border-t border-slate-900 pt-1.5">
                  “{activeShot.motive}”
                </p>

                {currentPose && (
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-900 pt-1.5">
                    <span>Dist: {currentPose.focusDistance.toFixed(1)}m</span>
                    <span>f/{currentPose.fStop.toFixed(1)}</span>
                    <span>FOV: {currentPose.fov.toFixed(0)}°</span>
                  </div>
                )}

                {/* Free-Cam & Copy Shot Override */}
                <div className="flex items-center gap-1.5 border-t border-slate-900 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFreeCamEnabled((prev) => {
                        if (prev) setFreeCamPose(null);
                        return !prev;
                      });
                    }}
                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition ${
                      freeCamEnabled
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    🎯 Free-Cam
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyShotOverride}
                    disabled={!freeCamEnabled && !currentPose}
                    className={`flex-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      overrideCopied
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-900 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {overrideCopied ? '✅ Copied!' : '📋 Copy Shot Override'}
                  </button>
                </div>

                {freeCamEnabled && freeCamPose && (
                  <div className="rounded-lg bg-slate-900/80 px-2 py-1 font-mono text-[10px] text-amber-200/90 border border-amber-500/25">
                    pos [{freeCamPose.position.join(', ')}] → aim [{freeCamPose.target.join(', ')}] ({freeCamPose.fov}°)
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bagian Bawah: Scrubber & Tombol Playback */}
          <div className="flex flex-col gap-4 border-t border-slate-800 pt-4">
            {/* Scrubber Waktu */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between font-mono text-xs text-slate-400">
                <span className="text-white font-bold">{formatSec(currentTime)}</span>
                <span>{formatSec(story.totalDurationSec)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={story.totalDurationSec}
                step={0.05}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-emerald-400 h-1.5 rounded-lg bg-slate-800"
              />
            </div>

            {/* Tombol Kontrol Playback */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRestart}
                title="Ulangi dari Awal"
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <RotateCcw className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handlePrevShot}
                title="Shot Sebelumnya"
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <SkipBack className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Putar Video</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleNextShot}
                title="Shot Berikutnya"
                className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Action Bar Bawah: Rekam, Storyboard & Mode Bersih */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleToggleRecord}
                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-bold transition ${
                  isRecording
                    ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Video className="h-3.5 w-3.5 shrink-0" />
                <span>{isRecording ? `Stop (${Math.round(recordingProgress)}s)` : 'Rekam'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportStoryboard}
                disabled={isExportingStoryboard || isRecording}
                className="flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>{isExportingStoryboard ? '⏳...' : '🎞️ Storyboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCleanPreview((prev) => !prev)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-[11px] font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
                <span>Clean</span>
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

export default ProductionStudio;
