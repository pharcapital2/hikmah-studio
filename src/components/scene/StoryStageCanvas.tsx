import React from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraConfig, StoryScene, StoryScript } from '../../types/story';
import { VillageEnvironment } from './VillageEnvironment';
import { WeatherSystem } from './WeatherSystem';
import { StoryCharacter } from './StoryCharacter';
import { CinematicCameraRig } from './CinematicCameraRig';

interface StoryStageCanvasProps {
  script: StoryScript;
  activeScene: StoryScene;
  sceneElapsed: number;
  sceneProgress: number;
  isPlaying: boolean;
  cameraOverride?: CameraConfig | null;
  cameraSceneIdOverride?: string | null;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
  onFpsSample?: (fps: number) => void;
}

export const StoryStageCanvas: React.FC<StoryStageCanvasProps> = ({
  script,
  activeScene,
  sceneElapsed,
  sceneProgress,
  isPlaying,
  cameraOverride = null,
  cameraSceneIdOverride = null,
  canvasRef,
  onFpsSample,
}) => {
  const isNight =
    activeScene.weather.preset === 'storm' ||
    activeScene.weather.preset === 'rain';
  const effectiveIsPlaying = isPlaying || Boolean(cameraOverride);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0.35, 1.65, 4.8], fov: 48, near: 0.1, far: 140 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      onCreated={({ gl }) => {
        if (canvasRef) {
          canvasRef.current = gl.domElement;
        }
      }}
    >
      <CinematicCameraRig
        sceneId={cameraSceneIdOverride || activeScene.id}
        cameraConfig={cameraOverride || activeScene.camera}
        sceneElapsed={sceneElapsed}
        sceneProgress={sceneProgress}
        isPlaying={cameraOverride ? true : isPlaying}
        onFpsSample={onFpsSample}
      />

      <WeatherSystem weather={activeScene.weather} isPlaying={isPlaying} />

      <VillageEnvironment
        focalProp={activeScene.focalProp}
        isGolden={activeScene.weather.preset === 'golden'}
        isNight={isNight}
        showDebris={activeScene.showDebris}
        isPlaying={effectiveIsPlaying}
      />

      {activeScene.characters.map((charState) => {
        const profile = script.characterProfiles[charState.id] ?? {
          id: charState.id,
          name: charState.name,
          primaryColor: '#6b7c59',
          secondaryColor: '#e2e8f0',
          headwear: 'peci-white' as const,
        };

        return (
          <StoryCharacter
            key={`${script.id}-${charState.id}`}
            character={charState}
            profile={profile}
            sceneProgress={sceneProgress}
            sceneType={activeScene.sceneType}
            isPlaying={isPlaying}
          />
        );
      })}
    </Canvas>
  );
};
