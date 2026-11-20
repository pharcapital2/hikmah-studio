import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ProductionSceneR3F } from './ProductionSceneR3F';
import { CinematicPostFX } from './CinematicPostFX';
import type { ProductionStory } from './types';
import type { CameraPose } from '../cinematography/CameraDirector';

export interface FreeCamPose {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

interface ProductionSceneCanvasProps {
  story: ProductionStory;
  currentTime: number;
  fps?: number;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  onFpsSample?: (fps: number) => void;
  onPoseChange?: (pose: CameraPose) => void;
  freeCamEnabled?: boolean;
  onFreeCamPoseChange?: (pose: FreeCamPose) => void;
  disablePostFx?: boolean;
  isRecording?: boolean;
}

interface ShotRenderMeta {
  shotId: string;
  size: string;
  dofEnabled: boolean;
  focusDistQ: number;
}

const DOF_SHOTS = new Set(['CU', 'MCU', 'ECU', 'OTS']);
const round2 = (n: number): number => Math.round(n * 100) / 100;

function FreeCamTracker({
  controlsRef,
  initialPoseRef,
  onPoseChange,
}: {
  controlsRef: React.RefObject<any>;
  initialPoseRef: React.RefObject<CameraPose | null>;
  onPoseChange?: (pose: FreeCamPose) => void;
}) {
  const { camera } = useThree();
  const initializedRef = useRef(false);
  const lastKeyRef = useRef('');
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;

  useEffect(() => {
    const initialPose = initialPoseRef.current;
    if (initializedRef.current || !initialPose) return;
    initializedRef.current = true;
    camera.position.copy(initialPose.pos);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = initialPose.fov;
      camera.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.copy(initialPose.aim);
      controlsRef.current.update();
    }
  }, [camera, controlsRef, initialPoseRef]);

  useFrame(() => {
    const t = controlsRef.current?.target;
    const fov = camera instanceof THREE.PerspectiveCamera ? camera.fov : 45;
    const next: FreeCamPose = {
      position: [round2(camera.position.x), round2(camera.position.y), round2(camera.position.z)],
      target: [round2(t?.x ?? 0), round2(t?.y ?? 0), round2(t?.z ?? 0)],
      fov: round2(fov),
    };
    const key = `${next.position.join(',')}|${next.target.join(',')}|${next.fov}`;
    if (key !== lastKeyRef.current) {
      lastKeyRef.current = key;
      onPoseChangeRef.current?.(next);
    }
  });

  return null;
}

export const ProductionSceneCanvas: React.FC<ProductionSceneCanvasProps> = ({
  story,
  currentTime,
  fps = 60,
  canvasRef,
  onPoseChange,
  freeCamEnabled = false,
  onFreeCamPoseChange,
  disablePostFx = false,
  isRecording = false,
}) => {
  const activePoseRef = useRef<CameraPose | null>(null);
  const [shotMeta, setShotMeta] = useState<ShotRenderMeta | null>(null);
  const orbitRef = useRef<any>(null);
  const onPoseChangeRef = useRef(onPoseChange);
  onPoseChangeRef.current = onPoseChange;

  const handlePose = useCallback((pose: CameraPose) => {
    activePoseRef.current = pose;
    onPoseChangeRef.current?.(pose);

    const nextDof = pose.shot.deepFocus
      ? false
      : pose.dofEnabled || DOF_SHOTS.has(pose.shot.size);
    const nextDistQ = Math.round(pose.focusDistance * 4) / 4;

    setShotMeta((prev) => {
      if (
        prev &&
        prev.shotId === pose.shot.id &&
        prev.size === pose.shot.size &&
        prev.dofEnabled === nextDof &&
        prev.focusDistQ === nextDistQ
      ) {
        return prev;
      }
      return {
        shotId: pose.shot.id,
        size: pose.shot.size,
        dofEnabled: nextDof,
        focusDistQ: nextDistQ,
      };
    });
  }, []);

  // Tentukan mood berdasarkan scene aktif
  const activeScene = story.scenes.find(
    (sc) => currentTime >= sc.startSec && currentTime < sc.startSec + sc.durationSec
  ) ?? story.scenes[story.scenes.length - 1];

  const mood = activeScene.timeOfDay === 'night' ? 'night' : 'sunset';
  const enableDofPass = story.cinematographyStyle !== 'dramatic-shorts';
  const dofEnabled = enableDofPass && (shotMeta?.dofEnabled ?? false);
  const focusDist = shotMeta?.focusDistQ ?? 3;

  return (
    <Canvas
      shadows
      dpr={isRecording ? 1 : [1, 2]}
      camera={{ position: [0, 5, 20], fov: 45, near: 0.1, far: 500 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        if (canvasRef) {
          canvasRef.current = gl.domElement;
        }
      }}
    >
      <ProductionSceneR3F
        story={story}
        currentTime={currentTime}
        fps={fps}
        frame={currentTime * fps}
        onPoseChange={handlePose}
        disableCameraDirector={freeCamEnabled}
      />

      {freeCamEnabled && (
        <>
          <OrbitControls
            ref={orbitRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
          />
          <FreeCamTracker
            controlsRef={orbitRef}
            initialPoseRef={activePoseRef}
            onPoseChange={onFreeCamPoseChange}
          />
        </>
      )}

      {/* Cinematic Post-Processing — kunci tampilan "film" (skip saat audit headless) */}
      {!disablePostFx && (
        <CinematicPostFX
          mood={mood}
          dof={dofEnabled}
          enableDofPass={enableDofPass}
          focusDistance={focusDist}
          focalLength={0.08}
          bokehScale={dofEnabled ? (shotMeta?.size === 'CU' ? 5 : 3) : 2}
        />
      )}
    </Canvas>
  );
};

export default ProductionSceneCanvas;
