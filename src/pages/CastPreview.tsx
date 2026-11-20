import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { castRegistry, OUTFIT_LABELS, type Emotion, type OutfitStyle } from '../cast/characters';
import { ACTION_LABELS, type CharacterAction } from '../cast/animations';
import { CharacterModel } from '../cast/CharacterModel';
import { textToVisemes } from '../cast/lipsync';

const EMOTION_OPTIONS: { id: Emotion; label: string; icon: string }[] = [
  { id: 'neutral', label: 'Netral', icon: '😐' },
  { id: 'happy', label: 'Senang', icon: '😊' },
  { id: 'sad', label: 'Sedih', icon: '😢' },
  { id: 'surprised', label: 'Kaget', icon: '😲' },
  { id: 'angry', label: 'Marah', icon: '😠' },
  { id: 'solemn', label: 'Khusyuk', icon: '🤲' },
  { id: 'thinking', label: 'Berpikir', icon: '🤔' },
];

const SAMPLES = [
  'Halo! Assalamualaikum warahmatullahi wabarakatuh.',
  'Pagi ini, kita pergi ke masjid bersama ayah, ibu, dan adik.',
  'Apakah kamu sudah makan? Ayo cepat kita bersiap!',
];

const LOOK_AT: [number, number, number] = [0, 1.6, 3];

export interface CastPreviewProps {
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

function CameraAutoFrame({
  action,
  controlsRef,
  cancelRef,
}: {
  action: CharacterAction;
  controlsRef: React.RefObject<any>;
  cancelRef: React.MutableRefObject<(() => void) | null>;
}) {
  const { camera } = useThree();
  const isHorse = action === 'ride_horse';
  const prevHorseRef = useRef(isHorse);
  const animRef = useRef<{
    t: number;
    p0: THREE.Vector3;
    p1: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    cancelRef.current = () => {
      animRef.current = null;
    };
    return () => {
      cancelRef.current = null;
    };
  }, [cancelRef]);

  useEffect(() => {
    if (prevHorseRef.current === isHorse) return;
    prevHorseRef.current = isHorse;
    const targetY = isHorse ? 1.25 : 0.9;
    const desiredDist = isHorse ? 4.8 : 3.7;
    const desiredY = isHorse ? 1.9 : 1.32;
    const dir = camera.position.clone().sub(new THREE.Vector3(0, targetY, 0));
    dir.y = 0;
    if (dir.lengthSq() < 0.001) dir.set(0, 0, 1);
    dir.normalize().multiplyScalar(desiredDist);
    dir.y = desiredY;
    animRef.current = {
      t: 0,
      p0: camera.position.clone(),
      p1: dir,
    };
  }, [isHorse, camera]);

  useFrame((_, dt) => {
    const anim = animRef.current;
    if (!anim) return;
    anim.t = Math.min(1, anim.t + Math.min(dt, 0.05) / 0.55);
    const e = anim.t < 0.5 ? 2 * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 2) / 2;
    camera.position.lerpVectors(anim.p0, anim.p1, e);
    controlsRef.current?.update();
    if (anim.t >= 1) animRef.current = null;
  });

  return null;
}

interface RigProps {
  castId: string;
  outfit?: OutfitStyle;
  text: string;
  emotion: Emotion;
  prev: Emotion;
  since: number;
  listening: boolean;
  action: CharacterAction;
  actionSpeed: number;
  turntable: boolean;
  clockRef: React.MutableRefObject<number>;
}

const Rig: React.FC<RigProps> = ({
  castId,
  outfit,
  text,
  emotion,
  prev,
  since,
  listening,
  action,
  actionSpeed,
  turntable,
  clockRef,
}) => {
  const [time, setTime] = useState(0);
  const turntableRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!turntable && turntableRef.current) {
      turntableRef.current.rotation.y = 0;
    }
  }, [turntable]);

  useFrame((s, dt) => {
    clockRef.current = s.clock.elapsedTime;
    setTime(s.clock.elapsedTime);
    if (turntable && turntableRef.current) {
      turntableRef.current.rotation.y += Math.min(dt, 0.05) * 0.55;
    }
  });

  const dur = Math.max(1, text.length * 0.07);
  const { keys, wordTimes, isQuestion } = useMemo(() => textToVisemes(text, 0, dur), [text, dur]);
  const cycle = dur + 1.5;
  const local = time % cycle;
  const cycleStart = time - local;
  const speaking = !listening && local <= dur;

  const shiftedKeys = useMemo(
    () => keys.map((k) => ({ ...k, t: k.t + cycleStart })),
    [keys, cycleStart]
  );
  const emphasisTimes = useMemo(
    () => wordTimes.filter((_, i) => i % 3 === 0).map((w) => w + cycleStart),
    [wordTimes, cycleStart]
  );

  return (
    <group ref={turntableRef}>
      <CharacterModel
        castId={castId}
        time={time}
        emotion={emotion}
        prevEmotion={prev}
        emotionStart={since}
        visemes={shiftedKeys}
        speaking={speaking}
        listening={listening}
        isQuestion={isQuestion}
        emphasisTimes={emphasisTimes}
        lookAt={LOOK_AT}
        action={action}
        actionSpeed={actionSpeed}
        outfit={outfit}
      />
    </group>
  );
};

const CastPreview: React.FC<CastPreviewProps> = ({ embedded = false, onFpsSample }) => {
  const [castId, setCastId] = useState<string>('ayah');
  const [outfitOverride, setOutfitOverride] = useState<OutfitStyle | 'default'>('default');
  const [action, setAction] = useState<CharacterAction>('idle');
  const [actionSpeed, setActionSpeed] = useState<number>(1.0);
  const [turntable, setTurntable] = useState<boolean>(false);
  const [text, setText] = useState<string>(SAMPLES[1]);
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [prev, setPrev] = useState<Emotion>('neutral');
  const [since, setSince] = useState<number>(0);
  const [listening, setListening] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  const clockRef = useRef<number>(0);
  const controlsRef = useRef<any>(null);
  const cancelAutoFrameRef = useRef<(() => void) | null>(null);

  const orbitTarget = useMemo<[number, number, number]>(
    () => (action === 'ride_horse' ? [0, 1.25, 0] : [0, 0.9, 0]),
    [action]
  );

  const handleFps = useCallback(
    (nextFps: number) => {
      setFps(nextFps);
      onFpsSample?.(nextFps);
    },
    [onFpsSample]
  );

  const characters = useMemo(() => Object.values(castRegistry), []);
  const activeCharacter = castRegistry[castId] ?? characters[0];
  const activeActionInfo = useMemo(
    () => ACTION_LABELS.find((item) => item.id === action) ?? ACTION_LABELS[0],
    [action]
  );

  return (
    <div
      className={`${
        embedded ? 'h-full' : 'h-screen'
      } w-full flex overflow-hidden bg-slate-950 text-slate-100`}
    >
      {/* Left / Main 3D Studio Stage */}
      <div className="relative h-full flex-1 overflow-hidden">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.32, 3.7], fov: 36, near: 0.1, far: 60 }}
          onCreated={(s) => s.clock.start()}
        >
          <color attach="background" args={['#0b1526']} />
          <fog attach="fog" args={['#0b1526', 8, 22]} />

          {/* Studio 3-point + Toon Lighting */}
          <ambientLight intensity={0.65} color="#dbeafe" />
          <hemisphereLight args={['#e0f2fe', '#334155', 0.45]} />
          <directionalLight
            position={[3.5, 5.5, 4.0]}
            intensity={1.45}
            color="#fff4dc"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-camera-left={-3}
            shadow-camera-right={3}
            shadow-camera-top={3.5}
            shadow-camera-bottom={-1.5}
            shadow-bias={-0.0005}
          />
          <directionalLight position={[-3.5, 3.0, -3.5]} intensity={0.65} color="#60a5fa" />
          <directionalLight position={[-2.5, 1.8, 3.0]} intensity={0.35} color="#e2e8f0" />

          {/* Stylized Circular Studio Floor with Soil & Grass Rings */}
          <group>
            <mesh position={[0, -0.075, 0]} receiveShadow>
              <cylinderGeometry args={[3.6, 3.85, 0.14, 48]} />
              <meshToonMaterial color="#4a392b" />
            </mesh>
            <mesh position={[0, -0.035, 0]} receiveShadow>
              <cylinderGeometry args={[2.95, 3.1, 0.06, 48]} />
              <meshToonMaterial color="#6b533b" />
            </mesh>
            <mesh position={[0, -0.01, 0]} receiveShadow>
              <cylinderGeometry args={[2.5, 2.58, 0.02, 48]} />
              <meshToonMaterial color="#5e8c45" />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
              <ringGeometry args={[2.46, 2.52, 64]} />
              <meshBasicMaterial color="#10b981" transparent opacity={0.45} />
            </mesh>
          </group>

          <FpsSampler onFps={handleFps} />
          <CameraAutoFrame action={action} controlsRef={controlsRef} cancelRef={cancelAutoFrameRef} />

          <Rig
            castId={castId}
            outfit={outfitOverride === 'default' ? undefined : outfitOverride}
            text={text}
            emotion={emotion}
            prev={prev}
            since={since}
            listening={listening}
            action={action}
            actionSpeed={actionSpeed}
            turntable={turntable}
            clockRef={clockRef}
          />

          <OrbitControls
            ref={controlsRef}
            target={orbitTarget}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.5}
            maxDistance={7.5}
            maxPolarAngle={Math.PI * 0.49}
            onStart={() => cancelAutoFrameRef.current?.()}
          />
        </Canvas>

        {/* Floating Top-Left Stage Badge */}
        <div className="studio-chrome pointer-events-none absolute left-3.5 top-3.5 z-20 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 shadow-xl backdrop-blur-md">
            <span
              className="h-3 w-3 rounded-full border border-white/30"
              style={{ backgroundColor: activeCharacter?.costume.top ?? '#10b981' }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  {activeCharacter?.name ?? castId}
                </span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                  {activeActionInfo?.icon} {activeActionInfo?.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ekspresi: <span className="text-amber-300">{emotion}</span> • Kecepatan{' '}
                <span className="font-mono text-slate-200">{actionSpeed.toFixed(1)}x</span>
                {turntable ? ' • Turntable Aktif' : ''}
              </p>
            </div>
            <span className="ml-2 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] font-bold text-emerald-300">
              {fps} FPS
            </span>
          </div>
        </div>

        {/* Bottom-Left Stage Controls Hint */}
        <div className="studio-chrome pointer-events-none absolute bottom-3.5 left-3.5 z-20 rounded-xl border border-slate-800/80 bg-slate-950/75 px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur-md">
          Drag kiri: Orbit 360° • Scroll: Zoom • Drag kanan: Pan
        </div>
      </div>

      {/* Right Studio Inspector Dock */}
      <aside className="h-full w-[380px] shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-900/90 p-3.5 flex flex-col gap-3 xl:w-[420px]">
        {!embedded && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-sky-300 transition hover:bg-slate-700"
            >
              ← Kembali ke Studio
            </a>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <a
                href="/map/village"
                className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-300 hover:text-white"
              >
                Desa
              </a>
              <a
                href="/map/city"
                className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 text-slate-300 hover:text-white"
              >
                Kota
              </a>
            </div>
          </div>
        )}

        {/* Section 1: Karakter Khas Channel */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Karakter Khas Channel ({characters.length})
            </h2>
            <span className="font-mono text-[10px] text-emerald-300">
              {activeCharacter?.costume.height.toFixed(2)}m
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {characters.map((c) => {
              const selected = c.id === castId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setCastId(c.id);
                    setOutfitOverride('default');
                  }}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition ${
                    selected
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200 shadow-sm'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-white/25"
                    style={{ backgroundColor: c.costume.top }}
                  />
                  <span className="truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 1B: Gaya Outfit / Busana */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Gaya Outfit / Busana ({OUTFIT_LABELS.length})
            </h2>
            <button
              type="button"
              onClick={() => setOutfitOverride('default')}
              className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition ${
                outfitOverride === 'default'
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Bawaan Karakter
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {OUTFIT_LABELS.map((item) => {
              const effectiveOutfit =
                outfitOverride === 'default'
                  ? activeCharacter?.costume.outfit ?? 'koko_sarong'
                  : outfitOverride;
              const selected = effectiveOutfit === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setOutfitOverride(item.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                    selected
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-sm leading-none">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Animasi & Aksi */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Animasi &amp; Aksi ({ACTION_LABELS.length})
            </h2>
            <button
              type="button"
              onClick={() => setTurntable((v) => !v)}
              className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                turntable
                  ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              🔄 Putar Turntable
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ACTION_LABELS.map((item) => {
              const selected = action === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAction(item.id)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                    selected
                      ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-sm leading-none">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-slate-800/80 pt-2.5">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-300">Kecepatan Aksi</span>
              <span className="font-mono font-bold text-emerald-300">{actionSpeed.toFixed(1)}x</span>
            </div>
            <input
              id="cast-action-speed"
              name="actionSpeed"
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={actionSpeed}
              onChange={(e) => setActionSpeed(parseFloat(e.target.value))}
              aria-label="Kecepatan Aksi"
              className="studio-scrubber w-full"
            />
          </div>
        </section>

        {/* Section 3: Ekspresi Wajah */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Ekspresi Wajah ({EMOTION_OPTIONS.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {EMOTION_OPTIONS.map((opt) => {
              const selected = emotion === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setPrev(emotion);
                    setEmotion(opt.id);
                    setSince(clockRef.current);
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                    selected
                      ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                      : 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 4: Lip-Sync & Dialog Tester */}
        <section className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lip-Sync &amp; Dialog Tester
            </h2>
            <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setListening(false)}
                className={`rounded-md px-2 py-0.5 transition ${
                  !listening ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Bicara
              </button>
              <button
                type="button"
                onClick={() => setListening(true)}
                className={`rounded-md px-2 py-0.5 transition ${
                  listening ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendengar
              </button>
            </div>
          </div>

          <textarea
            id="cast-dialogue-text"
            name="dialogueText"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Ketik dialog Bahasa Indonesia untuk uji viseme..."
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs leading-relaxed text-slate-100 outline-none transition focus:border-emerald-400"
          />

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {SAMPLES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText(sample)}
                className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                  text === sample
                    ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                Sampel {idx + 1}
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
};

export default CastPreview;
