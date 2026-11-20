import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraConfig } from '../../types/story';

interface CinematicCameraRigProps {
  sceneId: string;
  cameraConfig: CameraConfig;
  sceneElapsed: number;
  sceneProgress: number;
  isPlaying: boolean;
  onFpsSample?: (fps: number) => void;
}

export const CinematicCameraRig: React.FC<CinematicCameraRigProps> = ({
  sceneId,
  cameraConfig,
  sceneElapsed,
  sceneProgress,
  isPlaying,
  onFpsSample,
}) => {
  const { camera } = useThree();
  const prevSceneIdRef = useRef<string>('');
  const currentLookAt = useRef(new THREE.Vector3(...cameraConfig.lookAt));
  const desiredPos = useRef(new THREE.Vector3(...cameraConfig.position));
  const desiredLook = useRef(new THREE.Vector3(...cameraConfig.lookAt));
  const fpsAcc = useRef({ frames: 0, elapsed: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    if (onFpsSample) {
      fpsAcc.current.frames += 1;
      fpsAcc.current.elapsed += delta;
      if (fpsAcc.current.elapsed >= 0.5) {
        const fps = Math.round(fpsAcc.current.frames / fpsAcc.current.elapsed);
        onFpsSample(fps);
        fpsAcc.current.frames = 0;
        fpsAcc.current.elapsed = 0;
      }
    }

    const basePos = cameraConfig.position;
    const baseLook = cameraConfig.lookAt;
    const baseFov = cameraConfig.fov ?? 48;

    // Hard cut immediately when entering a new shot so the camera never flies through rocks/walls
    const isCutFrame = prevSceneIdRef.current !== sceneId;
    if (isCutFrame) {
      prevSceneIdRef.current = sceneId;

      const startPos = new THREE.Vector3(...basePos);
      let startFov = baseFov;

      if (cameraConfig.mode === 'crashZoom') {
        const dir = new THREE.Vector3(...basePos)
          .sub(new THREE.Vector3(...baseLook))
          .multiplyScalar(1.22);
        startPos.copy(new THREE.Vector3(...baseLook)).add(dir);
        startFov = Math.min(58, (cameraConfig.zoomTargetFov ?? 42) + 8);
      } else if (cameraConfig.mode === 'topDownReveal') {
        startPos.y = Math.max(1.8, basePos[1] - 0.65);
      }

      camera.position.copy(startPos);
      currentLookAt.current.set(...baseLook);
      camera.lookAt(currentLookAt.current);

      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = startFov;
        camera.updateProjectionMatrix();
      }
    }

    desiredLook.current.set(...baseLook);
    desiredPos.current.set(...basePos);

    // Subtle intra-shot camera choreography matching cinematic street-level shorts
    const easeT = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);

    if (cameraConfig.mode === 'orbitPan') {
      const orbitSpan = (cameraConfig.orbitSpeed ?? 0.14) * 0.65;
      const angle = (easeT - 0.5) * orbitSpan;
      const offsetX = desiredPos.current.x - desiredLook.current.x;
      const offsetZ = desiredPos.current.z - desiredLook.current.z;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      desiredPos.current.x =
        desiredLook.current.x + offsetX * cosA - offsetZ * sinA;
      desiredPos.current.z =
        desiredLook.current.z + offsetX * sinA + offsetZ * cosA;
    } else if (cameraConfig.mode === 'steadyTrack') {
      // Gentle dolly toward lookAt over the duration of the shot
      const dir = new THREE.Vector3(...baseLook)
        .sub(new THREE.Vector3(...basePos))
        .normalize();
      desiredPos.current.addScaledVector(dir, easeT * 0.45);
    } else if (cameraConfig.mode === 'topDownReveal') {
      // Slow vertical rise revealing corridor scale & mountain horizon
      desiredPos.current.y = basePos[1] - 0.65 + easeT * 0.85;
      desiredPos.current.x = basePos[0] + Math.sin(sceneElapsed * 0.35) * 0.18;
    } else if (cameraConfig.mode === 'crashZoom') {
      // Smooth push-in over the first ~40% of the shot without clipping face
      const zoomEase = Math.min(1, sceneProgress / 0.38);
      const smoothZoom = zoomEase * zoomEase * (3 - 2 * zoomEase);
      const offset = new THREE.Vector3(...basePos).sub(desiredLook.current);
      desiredPos.current
        .copy(desiredLook.current)
        .addScaledVector(offset, THREE.MathUtils.lerp(1.22, 1.0, smoothZoom));
    }

    const damping = cameraConfig.damping ?? 4.5;
    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      desiredPos.current.x,
      damping,
      dt
    );
    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      desiredPos.current.y,
      damping,
      dt
    );
    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      desiredPos.current.z,
      damping,
      dt
    );

    currentLookAt.current.x = THREE.MathUtils.damp(
      currentLookAt.current.x,
      desiredLook.current.x,
      damping * 1.2,
      dt
    );
    currentLookAt.current.y = THREE.MathUtils.damp(
      currentLookAt.current.y,
      desiredLook.current.y,
      damping * 1.2,
      dt
    );
    currentLookAt.current.z = THREE.MathUtils.damp(
      currentLookAt.current.z,
      desiredLook.current.z,
      damping * 1.2,
      dt
    );

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        cameraConfig.mode === 'crashZoom'
          ? (cameraConfig.zoomTargetFov ?? 42)
          : baseFov;
      camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 4.5, dt);
      camera.updateProjectionMatrix();
    }

    const shake =
      cameraConfig.mode === 'cameraShake'
        ? (cameraConfig.shakeIntensity ?? 0.09)
        : (cameraConfig.shakeIntensity ?? 0);

    if (shake > 0 && isPlaying) {
      const t = state.clock.elapsedTime;
      const sx = Math.sin(t * 36) * shake * 0.65;
      const sy = Math.cos(t * 42) * shake * 0.65;
      camera.position.x += sx;
      camera.position.y += sy;
      camera.lookAt(
        currentLookAt.current.x + sx * 0.4,
        currentLookAt.current.y + sy * 0.4,
        currentLookAt.current.z
      );
    } else {
      camera.lookAt(currentLookAt.current);
    }
  });

  return null;
};
