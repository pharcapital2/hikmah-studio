import React from 'react';
import { AbsoluteFill, Composition, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { STORY_PRESETS, getActiveSceneAtTime } from '../data/storyScript';
import { VillageEnvironment } from '../components/scene/VillageEnvironment';
import { WeatherSystem } from '../components/scene/WeatherSystem';
import { StoryCharacter } from '../components/scene/StoryCharacter';
import { CinematicCameraRig } from '../components/scene/CinematicCameraRig';
import { SubtitleOverlay } from '../components/ui/SubtitleOverlay';
import { HikmahDalilOverlay } from '../components/ui/HikmahDalilOverlay';
import { ProductionSceneR3F, ProductionOverlay, KONTEN_HIKMAH_1, KONTEN_HIKMAH_2 } from '../scenes';

export interface HikmahCompositionProps {
  scriptId?: string;
}

export const HikmahShortComposition: React.FC<HikmahCompositionProps> = ({
  scriptId = 'batu-besar-sabar',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  const script =
    STORY_PRESETS.find((item) => item.id === scriptId) ?? STORY_PRESETS[0];
  const { scene, sceneElapsed, sceneProgress } = getActiveSceneAtTime(
    script,
    currentTime
  );
  const isNight =
    scene.weather.preset === 'storm' || scene.weather.preset === 'rain';

  return (
    <AbsoluteFill className="bg-slate-950">
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0.35, 1.65, 4.8], fov: 48, near: 0.1, far: 140 }}
      >
        <CinematicCameraRig
          sceneId={scene.id}
          cameraConfig={scene.camera}
          sceneElapsed={sceneElapsed}
          sceneProgress={sceneProgress}
          isPlaying={true}
        />
        <WeatherSystem weather={scene.weather} isPlaying={true} />
        <VillageEnvironment
          focalProp={scene.focalProp}
          isGolden={scene.weather.preset === 'golden'}
          isNight={isNight}
          showDebris={scene.showDebris}
          isPlaying={true}
        />
        {scene.characters.map((charState) => {
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
              sceneType={scene.sceneType}
              isPlaying={true}
            />
          );
        })}
      </ThreeCanvas>

      <SubtitleOverlay scene={scene} sceneProgress={sceneProgress} />
      <HikmahDalilOverlay scene={scene} themeValue={script.themeValue} />
    </AbsoluteFill>
  );
};

export const HikmahKonten1Composition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  return (
    <AbsoluteFill className="bg-slate-950">
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 5, 20], fov: 45, near: 0.1, far: 500 }}
      >
        <ProductionSceneR3F
          story={KONTEN_HIKMAH_1}
          currentTime={currentTime}
          fps={fps}
          frame={frame}
        />
      </ThreeCanvas>
      <ProductionOverlay story={KONTEN_HIKMAH_1} currentTime={currentTime} />
    </AbsoluteFill>
  );
};

export const HikmahKonten2Composition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const currentTime = frame / fps;

  return (
    <AbsoluteFill className="bg-slate-950">
      <ThreeCanvas
        width={width}
        height={height}
        shadows
        camera={{ position: [0, 5, 20], fov: 45, near: 0.1, far: 500 }}
      >
        <ProductionSceneR3F
          story={KONTEN_HIKMAH_2}
          currentTime={currentTime}
          fps={fps}
          frame={frame}
        />
      </ThreeCanvas>
      <ProductionOverlay story={KONTEN_HIKMAH_2} currentTime={currentTime} />
    </AbsoluteFill>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HikmahKonten1_9x16"
        component={HikmahKonten1Composition}
        durationInFrames={3600}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition
        id="HikmahKonten2_9x16"
        component={HikmahKonten2Composition}
        durationInFrames={3600}
        fps={60}
        width={1080}
        height={1920}
      />
      <Composition
        id="HikmahShort9x16"
        component={HikmahShortComposition}
        durationInFrames={3600}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={{ scriptId: 'batu-besar-sabar' }}
      />
    </>
  );
};
