import React, { useMemo } from 'react';
import { StoryScene } from '../../types/story';

interface SubtitleOverlayProps {
  scene: StoryScene;
  sceneProgress: number;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  scene,
  sceneProgress,
}) => {
  // Split sentence into short 2–3 word chunks just like the YouTube Shorts reference
  const chunks = useMemo(() => {
    const words = scene.subtitleText.trim().split(/\s+/).filter(Boolean);
    const groups: string[] = [];
    for (let i = 0; i < words.length; i += 3) {
      groups.push(words.slice(i, i + 3).join(' '));
    }
    return groups.length > 0 ? groups : [''];
  }, [scene.subtitleText]);

  if (scene.sceneType !== 'narrative') {
    return null;
  }

  const effectiveProgress = Math.min(0.999, sceneProgress / 0.94);
  const activeChunkIndex = Math.min(
    chunks.length - 1,
    Math.floor(effectiveProgress * chunks.length)
  );
  const activeText = chunks[activeChunkIndex] ?? '';

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-[18%] z-20 flex flex-col items-center text-center">
      <p
        key={`${scene.id}-chunk-${activeChunkIndex}`}
        className="tiktok-subtitle-stroke font-display text-[23px] font-black leading-tight tracking-tight text-white drop-shadow-xl sm:text-[25px]"
      >
        {activeText}
      </p>
    </div>
  );
};
