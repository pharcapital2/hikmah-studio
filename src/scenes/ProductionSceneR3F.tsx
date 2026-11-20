import React, { useMemo } from 'react';
import { SkyAndLight, WeatherFx } from '../worlds/shared';
import { VillageMap } from '../worlds/village/VillageMap';
import { CityMap } from '../worlds/city/CityMap';
import { CameraDirector, type CameraPose } from '../cinematography/CameraDirector';
import { CharacterModel } from '../cast/CharacterModel';
import type { ProductionStory } from './types';
import { evaluateSceneAtTime } from './sceneState';

export interface ProductionSceneR3FProps {
  story: ProductionStory;
  currentTime: number;
  fps?: number;
  frame?: number;
  onPoseChange?: (pose: CameraPose) => void;
  disableCameraDirector?: boolean;
}

export const ProductionSceneR3F: React.FC<ProductionSceneR3FProps> = ({
  story,
  currentTime,
  fps = 60,
  frame,
  onPoseChange,
  disableCameraDirector,
}) => {
  const frameState = useMemo(
    () => evaluateSceneAtTime(story, currentTime),
    [story, currentTime]
  );

  const {
    activeScene,
    activeLocation,
    charactersState,
    subjects,
    subjectFacings,
    subjectHeads,
    obstacles,
    cameraSide,
  } = frameState;

  // Hitung posisi sentral scene untuk 3-point lighting
  const sceneCenterPos = useMemo((): [number, number, number] => {
    const positions = charactersState.map((c) => c.position);
    if (positions.length === 0) return [0, 0, 0];
    const avg = positions.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
      [0, 0, 0]
    );
    return [avg[0] / positions.length, avg[1] / positions.length, avg[2] / positions.length];
  }, [charactersState]);

  const isNight = activeScene.timeOfDay === 'night';
  const isSunset = activeScene.timeOfDay === 'sunset';
  const isDramaticShorts = story.cinematographyStyle === 'dramatic-shorts';

  // Warna dan intensitas lampu 3-point adaptif per waktu & gaya sinematografi
  const keyColor = isSunset ? (isDramaticShorts ? '#FFA630' : '#FFB347') : isNight ? '#3A5F7D' : '#FFF8DC';
  const fillColor = isSunset ? (isDramaticShorts ? '#5A79B5' : '#8FA6CC') : isNight ? '#1A2A44' : '#B0C8E8';
  const rimColor = isSunset ? (isDramaticShorts ? '#FF6E26' : '#FF7733') : isNight ? '#5588AA' : '#E8F4FF';
  const keyIntensity = isSunset ? (isDramaticShorts ? 3.4 : 2.8) : isNight ? 0.6 : 2.2;
  const fillIntensity = isSunset ? (isDramaticShorts ? 0.75 : 0.8) : isNight ? 0.3 : 0.9;
  const rimIntensity = isSunset ? (isDramaticShorts ? 2.6 : 2.0) : isNight ? 1.2 : 1.4;

  return (
    <>
      {/* 1. Lapis Pencahayaan & Cuaca */}
      <SkyAndLight timeOfDay={activeScene.timeOfDay} weather={activeScene.weather} />
      <WeatherFx weather={activeScene.weather} time={currentTime} />

      {/* 1b. 3-Point Cinematic Lighting — kunci tampilan "film" */}
      {/* Key light: sumber utama hangat dari sudut 45° atas kanan */}
      <pointLight
        color={keyColor}
        intensity={keyIntensity}
        position={[sceneCenterPos[0] + 3.5, sceneCenterPos[1] + 4.5, sceneCenterPos[2] + 2.5]}
        distance={18}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      {/* Fill light: lemah dari kiri, mengurangi shadow ekstrem */}
      <pointLight
        color={fillColor}
        intensity={fillIntensity}
        position={[sceneCenterPos[0] - 3.0, sceneCenterPos[1] + 2.5, sceneCenterPos[2] + 1.5]}
        distance={14}
        decay={2}
      />
      {/* Rim/Back light: dari belakang subjek, memisahkan karakter dari background */}
      <pointLight
        color={rimColor}
        intensity={rimIntensity}
        position={[sceneCenterPos[0] + 1.0, sceneCenterPos[1] + 3.5, sceneCenterPos[2] - 4.5]}
        distance={12}
        decay={2}
      />

      {/* 2. Sutradara Kamera Sinematik */}
      <CameraDirector
        shots={activeScene.shots}
        location={activeLocation}
        worldId={activeScene.worldId}
        subjects={subjects}
        subjectHeads={subjectHeads}
        subjectFacings={subjectFacings}
        shotPathSamples={frameState.shotPathSamples}
        axis={activeScene.axis}
        obstacles={obstacles}
        cameraSide={cameraSide}
        disabled={disableCameraDirector}
        fps={fps}
        frame={frame !== undefined ? frame : currentTime * fps}
        onPose={onPoseChange}
      />

      {/* 3. Lapis WORLD (Dunia 3D Persisten) */}
      {activeScene.worldId === 'city' ? (
        <CityMap timeOfDay={activeScene.timeOfDay} weather={activeScene.weather} time={currentTime} />
      ) : (
        <VillageMap timeOfDay={activeScene.timeOfDay} weather={activeScene.weather} time={currentTime} />
      )}

      {/* 4. Lapis CAST (Karakter Reusable) */}
      {charactersState.map((char) => {
        const opponent = charactersState.find((c) => c.castId !== char.castId);
        let lookAtTarget: [number, number, number] | undefined;
        if (opponent && char.action !== 'walk' && char.action !== 'pray') {
          const dx = opponent.position[0] - char.position[0];
          const dz = opponent.position[2] - char.position[2];
          const distXZ = Math.hypot(dx, dz);
          if (distXZ > 1e-4) {
            const fx = Math.sin(char.facing);
            const fz = Math.cos(char.facing);
            const dot = (fx * dx + fz * dz) / distXZ;
            if (dot > -0.25) {
              const oppHead = subjectHeads[opponent.castId];
              lookAtTarget = oppHead
                ? [oppHead[0], oppHead[1], oppHead[2]]
                : [opponent.position[0], opponent.position[1] + 1.45, opponent.position[2]];
            }
          }
        }

        return (
          <CharacterModel
            key={char.castId}
            castId={char.castId}
            time={currentTime}
            position={char.position}
            rotationY={char.facing}
            action={char.action}
            emotion={char.emotion}
            speaking={char.speaking}
            listening={char.listening}
            lookAt={lookAtTarget}
          />
        );
      })}
    </>
  );
};

export default ProductionSceneR3F;
