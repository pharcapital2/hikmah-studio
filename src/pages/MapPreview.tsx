import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import {
  SkyAndLight,
  WeatherFx,
  type CameraAnchor,
  type StagingPreset,
  type StagingSlot,
  type TimeOfDay,
  type Weather,
  type WorldLocation,
  type WorldProps,
} from '../worlds/shared';

// Maps are discovered lazily so a missing map never breaks the build.
const mapLoaders = import.meta.glob('../worlds/*/*Map.tsx') as Record<
  string,
  () => Promise<Record<string, unknown>>
>;
const locLoaders = import.meta.glob('../worlds/*/locations.ts') as Record<
  string,
  () => Promise<{ registry?: WorldLocation[] }>
>;

const ANCHOR_OPTIONS = [
  { id: 'wide', label: 'wide' },
  { id: 'medium', label: 'medium' },
  { id: 'close', label: 'close' },
  { id: 'overShoulder', label: 'overShoulder' },
  { id: 'lowAngle', label: 'lowAngle' },
  { id: 'aerial', label: 'aerial' },
] as const;

type AnchorKey = (typeof ANCHOR_OPTIONS)[number]['id'];

const TOD_OPTIONS: { id: TimeOfDay; label: string }[] = [
  { id: 'day', label: '☀️ Siang' },
  { id: 'sunset', label: '🌅 Sore' },
  { id: 'night', label: '🌙 Malam' },
];

const WEATHER_OPTIONS: { id: Weather; label: string }[] = [
  { id: 'clear', label: '✨ Cerah' },
  { id: 'rain', label: '🌧️ Hujan' },
  { id: 'fog', label: '☁️ Kabut' },
];

export interface MapPreviewProps {
  worldId: 'village' | 'city';
  embedded?: boolean;
  onFpsSample?: (fps: number) => void;
}

function FpsSampler({ onFps }: { onFps?: (fps: number) => void }) {
  const acc = useRef({ frames: 0, elapsed: 0, last: -1 });

  useFrame((_, delta) => {
    if (!onFps) return;
    acc.current.frames += 1;
    acc.current.elapsed += delta;
    if (acc.current.elapsed >= 0.5) {
      const next = Math.max(1, Math.round(acc.current.frames / acc.current.elapsed));
      if (next !== acc.current.last) {
        acc.current.last = next;
        onFps(next);
      }
      acc.current.frames = 0;
      acc.current.elapsed = 0;
    }
  });

  return null;
}

function Rig({
  target,
  controls,
  cancelRef,
}: {
  target: CameraAnchor | null;
  controls: React.RefObject<any>;
  cancelRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { camera } = useThree();
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetLook = useMemo(() => new THREE.Vector3(), []);
  const st = useRef<{
    t: number;
    p0: THREE.Vector3;
    l0: THREE.Vector3;
    fov0: number;
    a: CameraAnchor;
  } | null>(null);

  useEffect(() => {
    cancelRef.current = () => {
      st.current = null;
    };
    return () => {
      cancelRef.current = null;
    };
  }, [cancelRef]);

  useEffect(() => {
    if (!target) return;
    const fov0 = camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
    st.current = {
      t: 0,
      p0: camera.position.clone(),
      l0: controls.current?.target.clone() ?? new THREE.Vector3(),
      fov0,
      a: target,
    };
  }, [target, camera, controls]);

  useFrame((_, dt) => {
    const s = st.current;
    if (!s) return;
    s.t = Math.min(1, s.t + Math.min(dt, 0.05) / 1.4);
    const e = s.t < 0.5 ? 2 * s.t * s.t : 1 - Math.pow(-2 * s.t + 2, 2) / 2;
    targetPos.set(...s.a.position);
    targetLook.set(...s.a.target);
    camera.position.lerpVectors(s.p0, targetPos, e);
    controls.current?.target.lerpVectors(s.l0, targetLook, e);
    if (s.a.fov && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.lerp(s.fov0, s.a.fov, e);
      camera.updateProjectionMatrix();
    }
    controls.current?.update();
    if (s.t >= 1) st.current = null;
  });

  return null;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface LivePoseSnapshot {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

function CameraPoseHelper({
  controls,
  getterRef,
}: {
  controls: React.RefObject<any>;
  getterRef: React.MutableRefObject<(() => LivePoseSnapshot) | null>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    getterRef.current = () => {
      const t = controls.current?.target;
      const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 50;
      return {
        position: [round2(camera.position.x), round2(camera.position.y), round2(camera.position.z)],
        target: [round2(t?.x ?? 0), round2(t?.y ?? 0), round2(t?.z ?? 0)],
        fov: round2(fov),
      };
    };
    return () => {
      getterRef.current = null;
    };
  }, [camera, controls, getterRef]);

  return null;
}

const SLOT_COLORS = ['#10b981', '#f59e0b', '#38bdf8', '#a855f7'] as const;

function StagingSlotMarker({ slot, color }: { slot: StagingSlot; color: string }) {
  const yBase = slot.position[1];

  return (
    <group>
      <group position={[slot.position[0], yBase, slot.position[2]]} rotation={[0, slot.facing, 0]}>
        {/* Ground anchor ring */}
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.32, 0.44, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>

        {/* Glowing semi-transparent human capsule (~1.7m) */}
        <mesh position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.22, 1.05, 8, 16]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.65}
            transparent
            opacity={0.45}
            depthWrite={false}
          />
        </mesh>

        {/* Facing arrow along +Z (CharacterModel forward) */}
        <mesh position={[0, 0.92, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.6, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0, 0.92, 0.86]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.12, 0.26, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
        </mesh>
      </group>

      {/* Optional walk target marker */}
      {slot.targetPos && (
        <group position={[slot.targetPos[0], slot.targetPos[1], slot.targetPos[2]]}>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.22, 0.34, 20]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.0, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.5} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StagingMarkers({ preset }: { preset: StagingPreset }) {
  return (
    <group name={`staging-preset-${preset.id}`}>
      {preset.slots.map((slot, idx) => (
        <StagingSlotMarker
          key={slot.id}
          slot={slot}
          color={SLOT_COLORS[idx % SLOT_COLORS.length]}
        />
      ))}
    </group>
  );
}

export default function MapPreview({ worldId, embedded = false, onFpsSample }: MapPreviewProps) {
  const [tod, setTod] = useState<TimeOfDay>('day');
  const [weather, setWeather] = useState<Weather>('clear');
  const [fps, setFps] = useState<number>(60);
  const [registry, setRegistry] = useState<WorldLocation[]>([]);
  const [locId, setLocId] = useState('');
  const [anchor, setAnchor] = useState<AnchorKey>('wide');
  const [flyTo, setFlyTo] = useState<CameraAnchor | null>(null);
  const [showPortraitFrame, setShowPortraitFrame] = useState<boolean>(false);
  const [copiedPose, setCopiedPose] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const controls = useRef<any>(null);
  const cancelFlyRef = useRef<(() => void) | null>(null);
  const poseGetterRef = useRef<(() => LivePoseSnapshot) | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleFps = useCallback(
    (nextFps: number) => {
      setFps(nextFps);
      onFpsSample?.(nextFps);
    },
    [onFpsSample]
  );

  const MapComp = useMemo(() => {
    const k = Object.keys(mapLoaders).find((p) => p.includes(`/${worldId}/`));
    if (!k) return null;
    return lazy(() =>
      mapLoaders[k]().then((m) => ({
        default: (m.default ?? Object.values(m).find((v) => typeof v === 'function')) as ComponentType<WorldProps>,
      }))
    );
  }, [worldId]);

  useEffect(() => {
    let active = true;
    const k = Object.keys(locLoaders).find((p) => p.includes(`/${worldId}/`));
    setRegistry([]);
    setLocId('');
    setAnchor('wide');
    setFlyTo(null);
    if (k) {
      locLoaders[k]().then((m) => {
        if (!active) return;
        const list = m.registry ?? [];
        setRegistry(list);
        if (list[0]) {
          setLocId(list[0].id);
          setFlyTo({ ...list[0].cameraAnchors.wide });
        }
      });
    }
    return () => {
      active = false;
    };
  }, [worldId]);

  const fly = useCallback(
    (id: string, a: AnchorKey) => {
      const l = registry.find((x) => x.id === id);
      if (l) setFlyTo({ ...l.cameraAnchors[a] });
    },
    [registry]
  );

  const activeLocation = useMemo(
    () => registry.find((x) => x.id === locId) ?? null,
    [registry, locId]
  );

  useEffect(() => {
    const firstPresetId = activeLocation?.stagingPresets?.[0]?.id ?? '';
    setSelectedPresetId(firstPresetId);
  }, [activeLocation]);

  const selectedPreset = useMemo(
    () => activeLocation?.stagingPresets?.find((p) => p.id === selectedPresetId) ?? null,
    [activeLocation, selectedPresetId]
  );

  const handleCopyPose = useCallback(async () => {
    const pose = poseGetterRef.current?.();
    if (!pose) return;
    const json = JSON.stringify(pose, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      console.info('[MapPreview] Camera Pose JSON:\n' + json);
    }
    setCopiedPose(true);
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => {
      setCopiedPose(false);
    }, 2000);
  }, []);

  return (
    <div
      className={
        embedded
          ? 'relative h-full w-full overflow-hidden bg-black'
          : 'relative h-screen w-screen overflow-hidden bg-black'
      }
    >
      <Canvas shadows dpr={[1, 2]} camera={{ position: [60, 40, 60], fov: 50, near: 0.1, far: 1500 }}>
        <SkyAndLight timeOfDay={tod} weather={weather} />
        <WeatherFx weather={weather} followCamera />
        <FpsSampler onFps={handleFps} />
        <OrbitControls
          ref={controls}
          makeDefault
          enableDamping
          dampingFactor={0.08}
          maxPolarAngle={Math.PI * 0.495}
          onStart={() => cancelFlyRef.current?.()}
        />
        <Rig target={flyTo} controls={controls} cancelRef={cancelFlyRef} />
        <CameraPoseHelper controls={controls} getterRef={poseGetterRef} />
        {selectedPreset && <StagingMarkers preset={selectedPreset} />}
        <Suspense fallback={null}>
          {MapComp ? (
            <MapComp timeOfDay={tod} weather={weather} />
          ) : (
            <group>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[200, 200, 20, 20]} />
                <meshStandardMaterial color="#555" wireframe />
              </mesh>
              <mesh position={[0, 1, 0]}>
                <boxGeometry args={[2, 2, 2]} />
                <meshStandardMaterial color="#e0a030" />
              </mesh>
            </group>
          )}
        </Suspense>
      </Canvas>

      {/* 9:16 Portrait Viewfinder Mask */}
      {showPortraitFrame && (
        <div
          aria-label="9:16 Viewfinder Mask"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="h-full flex-1 bg-black/65 backdrop-blur-[1px]" />
          <div className="relative aspect-[9/16] h-full max-w-full shrink-0 border-2 border-emerald-400/90 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <div className="absolute inset-y-0 left-1/3 border-l border-white/20" />
            <div className="absolute inset-y-0 left-2/3 border-l border-white/20" />
            <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-emerald-300/80">
              <span className="absolute right-2 -top-4 rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-emerald-300">
                1/3 Eye-Line
              </span>
            </div>
            <div className="absolute inset-x-0 top-2/3 border-t border-white/20" />
            <span className="absolute bottom-2 right-2 rounded bg-slate-950/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              9:16 SHORTS
            </span>
          </div>
          <div className="h-full flex-1 bg-black/65 backdrop-blur-[1px]" />
        </div>
      )}

      {/* Floating Glassmorphic Studio HUD */}
      <div className="studio-chrome pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-wrap items-start justify-between gap-2.5">
        <div className="pointer-events-auto flex max-w-full flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md">
          {/* Row 1: Title, Live FPS, Location Selector & Fly */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
              {worldId === 'village' ? '🏡 World: Desa' : '🏙️ World: Kota'}
            </span>
            <span className="rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-1 font-mono text-[11px] font-bold text-emerald-300">
              {fps} FPS • 60FPS
            </span>
            {!MapComp && (
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-300">
                Placeholder map belum tersedia
              </span>
            )}

            <div className="flex items-center gap-1.5">
              <select
                id="map-location-select"
                name="map-location"
                aria-label="Pilih lokasi dunia"
                value={locId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setLocId(nextId);
                  fly(nextId, anchor);
                }}
                className="max-w-[230px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white outline-none transition focus:border-emerald-400"
              >
                {registry.length === 0 && <option value="">— memuat lokasi —</option>}
                {registry.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => fly(locId, anchor)}
                disabled={!locId}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✈️ Fly
              </button>
            </div>

            {/* Director Viewfinder Tools: 9:16 Frame & Copy Pose */}
            <button
              type="button"
              onClick={() => setShowPortraitFrame((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                showPortraitFrame
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-sm'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              📱 9:16 Frame
            </button>

            <button
              type="button"
              onClick={handleCopyPose}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                copiedPose
                  ? 'border-emerald-400 bg-emerald-500/25 text-emerald-200'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600 hover:bg-slate-800'
              }`}
            >
              {copiedPose ? '✅ Copied!' : '📋 Copy Pose'}
            </button>

            {activeLocation && (
              <span className="hidden rounded-md border border-slate-800 bg-slate-900/70 px-2 py-1 font-mono text-[10px] text-slate-400 sm:inline-block">
                ambience: {activeLocation.ambience}
              </span>
            )}
          </div>

          {/* Row 2: Camera Anchor Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Anchor:
            </span>
            {ANCHOR_OPTIONS.map((opt) => {
              const active = anchor === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setAnchor(opt.id);
                    fly(locId, opt.id);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    active
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200 shadow-sm'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Row 2b: Staging Preset Pills (if location defines stagingPresets) */}
          {activeLocation?.stagingPresets && activeLocation.stagingPresets.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Staging:
              </span>
              {activeLocation.stagingPresets.map((preset) => {
                const active = selectedPresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setSelectedPresetId(active ? '' : preset.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? 'border-purple-400/70 bg-purple-500/20 text-purple-200 shadow-sm'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label} ({preset.slots.length})
                  </button>
                );
              })}
              {selectedPresetId && (
                <button
                  type="button"
                  onClick={() => setSelectedPresetId('')}
                  className="rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
                >
                  Hide
                </button>
              )}
            </div>
          )}

          {/* Row 3: Time of Day & Weather Pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Waktu:
              </span>
              {TOD_OPTIONS.map((opt) => {
                const active = tod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTod(opt.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Cuaca:
              </span>
              {WEATHER_OPTIONS.map((opt) => {
                const active = weather === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setWeather(opt.id)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                      active
                        ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                        : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Standalone Navigation Links (only shown outside embedded 1-screen Studio) */}
        {!embedded && (
          <nav className="pointer-events-auto flex items-center gap-1.5 rounded-2xl border border-slate-800 bg-slate-950/80 p-2 text-xs font-semibold shadow-2xl backdrop-blur-md">
            <a
              href="/map/village"
              className={`rounded-lg px-2.5 py-1 transition ${
                worldId === 'village'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              village
            </a>
            <a
              href="/map/city"
              className={`rounded-lg px-2.5 py-1 transition ${
                worldId === 'city'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              city
            </a>
            <a
              href="/cast/preview"
              className="rounded-lg px-2.5 py-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              cast
            </a>
            <a
              href="/"
              className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-sky-300 transition hover:bg-slate-800"
            >
              ← app
            </a>
          </nav>
        )}
      </div>

      {/* Subtle Free-Cam Controls Hint */}
      <div className="studio-chrome pointer-events-none absolute bottom-3 left-3 z-20 rounded-xl border border-slate-800/80 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md">
        Drag kiri: Orbit • Scroll: Zoom • Drag kanan: Pan • Klik lokasi untuk terbang
      </div>
    </div>
  );
}
