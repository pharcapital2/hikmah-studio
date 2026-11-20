import type { ObstacleCircle, Vec3, WorldLocation } from '../worlds/shared/types';
import { getWorldObstacles, resolveStagingPreset, surfaceYAt } from '../worlds/shared/spatial';
import { locations as villageLocations } from '../worlds/village/locations';
import { locations as cityLocations } from '../worlds/city/locations';
import { getCast, type Emotion } from '../cast/characters';
import { sampleActionPose, type CharacterAction } from '../cast/animations';
import { easeInOut } from '../cinematography/shotTypes';
import type { ActionSegment, ProductionScene, ProductionStory } from './types';

export interface EvaluatedCharacterState {
  castId: string;
  name: string;
  position: Vec3;
  facing: number;
  action: CharacterAction;
  emotion: Emotion;
  speaking: boolean;
  listening: boolean;
}

export interface ShotPathSample {
  sec: number;
  subjects: Record<string, Vec3>;
  subjectHeads: Record<string, Vec3>;
  subjectFacings: Record<string, number>;
}

export interface EvaluatedSceneFrame {
  activeScene: ProductionScene;
  sceneElapsed: number;
  activeLocation: WorldLocation | undefined;
  charactersState: EvaluatedCharacterState[];
  subjects: Record<string, Vec3>;
  subjectFacings: Record<string, number>;
  subjectHeads: Record<string, Vec3>;
  shotPathSamples: ShotPathSample[];
  obstacles: ObstacleCircle[];
  cameraSide: 1 | -1;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

function evaluateCharactersAtTime(
  activeScene: ProductionScene,
  currentTime: number,
  activeLocation: WorldLocation | undefined,
  preset: ReturnType<typeof resolveStagingPreset>
): {
  charactersState: EvaluatedCharacterState[];
  subjects: Record<string, Vec3>;
  subjectFacings: Record<string, number>;
  subjectHeads: Record<string, Vec3>;
} {
  const sceneElapsed = Math.max(0, currentTime - activeScene.startSec);

  const charactersState: EvaluatedCharacterState[] = activeScene.cast.map((char) => {
    const slot = char.slotId ? preset?.slots.find((s) => s.id === char.slotId) : undefined;
    const baseInitialPos: Vec3 = char.initialPos
      ? [...char.initialPos]
      : slot
        ? [...slot.position]
        : activeLocation
          ? [...activeLocation.position]
          : [0, 0, 0];
    const baseTargetPos: Vec3 | undefined = char.targetPos ?? slot?.targetPos;
    const baseFacing = char.facing ?? slot?.facing ?? 0;
    const defaultAction: CharacterAction = char.defaultAction ?? slot?.defaultAction ?? 'idle';
    const yOff = char.yOffset ?? slot?.surfaceOffset ?? 0;

    let currentPos: Vec3 = [...baseInitialPos];
    let facing = baseFacing;
    let action: CharacterAction = defaultAction;
    let emotion: Emotion = char.defaultEmotion;
    let speaking = false;
    let listening = false;

    if (char.timeline && char.timeline.length > 0) {
      let activeSeg: ActionSegment | undefined;
      for (const seg of char.timeline) {
        if (sceneElapsed >= seg.startSec && sceneElapsed < seg.startSec + seg.durSec) {
          activeSeg = seg;
          break;
        }
      }

      if (activeSeg) {
        action = activeSeg.action;
        emotion = activeSeg.emotion;
        speaking = activeSeg.speaking ?? false;
        listening = activeSeg.listening ?? false;

        if (activeSeg.action === 'walk' && (activeSeg.targetPos || baseTargetPos)) {
          const dest = activeSeg.targetPos ?? baseTargetPos!;
          const u =
            activeSeg.durSec > 0
              ? Math.min(1, Math.max(0, (sceneElapsed - activeSeg.startSec) / activeSeg.durSec))
              : 1;
          const e = easeInOut(u);
          currentPos = lerpVec3(baseInitialPos, dest, e);

          const dx = dest[0] - baseInitialPos[0];
          const dz = dest[2] - baseInitialPos[2];
          if (dx * dx + dz * dz > 1e-4) {
            facing = Math.atan2(dx, dz);
          }
        } else if (baseTargetPos && sceneElapsed >= activeSeg.startSec) {
          currentPos = [...baseTargetPos];
        }
      } else {
        const lastSeg = char.timeline[char.timeline.length - 1];
        if (sceneElapsed >= lastSeg.startSec + lastSeg.durSec && (lastSeg.targetPos || baseTargetPos)) {
          currentPos = [...(lastSeg.targetPos ?? baseTargetPos!)];
        }
      }
    }

    if (char.snapToGround !== false) {
      currentPos[1] = surfaceYAt(activeScene.worldId, currentPos[0], currentPos[2]) + yOff;
    } else if (yOff !== 0) {
      currentPos[1] += yOff;
    }

    return {
      castId: char.castId,
      name: char.name,
      position: currentPos,
      facing,
      action,
      emotion,
      speaking,
      listening,
    };
  });

  const subjects: Record<string, Vec3> = {};
  const subjectFacings: Record<string, number> = {};
  const subjectHeads: Record<string, Vec3> = {};

  for (const c of charactersState) {
    subjects[c.castId] = c.position;
    subjectFacings[c.castId] = c.facing;
    const cast = getCast(c.castId);
    const s = (cast?.costume?.height ?? 1.7) / 1.7;
    const pose = sampleActionPose(c.action, currentTime, cast?.seed ?? 1, 1);
    const rootY = pose.rootOffset[1];
    subjectHeads[c.castId] = [
      c.position[0],
      c.position[1] + (rootY + 1.41) * s,
      c.position[2],
    ];
  }

  return { charactersState, subjects, subjectFacings, subjectHeads };
}

const shotPathCache = new Map<string, ShotPathSample[]>();

export function evaluateSceneAtTime(
  story: ProductionStory,
  currentTime: number
): EvaluatedSceneFrame {
  let activeScene: ProductionScene = story.scenes[story.scenes.length - 1];
  for (const sc of story.scenes) {
    if (currentTime >= sc.startSec && currentTime < sc.startSec + sc.durationSec) {
      activeScene = sc;
      break;
    }
  }

  const sceneElapsed = Math.max(0, currentTime - activeScene.startSec);

  const registry: WorldLocation[] =
    activeScene.worldId === 'city' ? cityLocations : villageLocations;
  const rawLocation = registry.find((l) => l.id === activeScene.locationId);
  const preset = resolveStagingPreset(rawLocation, activeScene.stagingPresetId);

  const activeLocation: WorldLocation | undefined =
    rawLocation && preset?.recommendedAnchors
      ? {
          ...rawLocation,
          cameraAnchors: {
            ...rawLocation.cameraAnchors,
            ...preset.recommendedAnchors,
          },
        }
      : rawLocation;

  const { charactersState, subjects, subjectFacings, subjectHeads } =
    evaluateCharactersAtTime(activeScene, currentTime, activeLocation, preset);

  // Sampel awal/tengah/akhir shot aktif untuk stabilitas sudut kamera bebas-strobe
  let shotPathSamples: ShotPathSample[] = [];
  if (activeScene.shots.length > 0) {
    let activeShot = activeScene.shots[activeScene.shots.length - 1];
    for (const sh of activeScene.shots) {
      if (currentTime >= sh.startSec && currentTime < sh.startSec + sh.durSec) {
        activeShot = sh;
        break;
      }
    }
    const cacheKey = `${story.id}::${activeScene.id}::${activeShot.id}::${activeShot.startSec}::${activeShot.durSec}`;
    const cached = shotPathCache.get(cacheKey);
    if (cached) {
      shotPathSamples = cached;
    } else {
      const edge = Math.min(0.05, Math.max(0.001, activeShot.durSec * 0.1));
      const sampleTimes = [
        activeShot.startSec + edge,
        activeShot.startSec + activeShot.durSec * 0.5,
        activeShot.startSec + Math.max(edge, activeShot.durSec - edge),
      ];
      shotPathSamples = sampleTimes.map((ts) => {
        const sampled = evaluateCharactersAtTime(activeScene, ts, activeLocation, preset);
        return {
          sec: ts,
          subjects: sampled.subjects,
          subjectHeads: sampled.subjectHeads,
          subjectFacings: sampled.subjectFacings,
        };
      });
      shotPathCache.set(cacheKey, shotPathSamples);
    }
  }

  let centerXZ: [number, number];
  if (charactersState.length > 0) {
    const sumX = charactersState.reduce((acc, c) => acc + c.position[0], 0);
    const sumZ = charactersState.reduce((acc, c) => acc + c.position[2], 0);
    centerXZ = [sumX / charactersState.length, sumZ / charactersState.length];
  } else if (activeLocation) {
    centerXZ = [activeLocation.position[0], activeLocation.position[2]];
  } else {
    centerXZ = [0, 0];
  }

  const worldObstacles = getWorldObstacles(activeScene.worldId, centerXZ, 70);
  const locObstacles = activeLocation?.obstacles ?? [];
  const obstacles: ObstacleCircle[] = [...worldObstacles, ...locObstacles];

  const cameraSide: 1 | -1 = activeScene.cameraSide ?? preset?.safeCameraSide ?? 1;

  return {
    activeScene,
    sceneElapsed,
    activeLocation,
    charactersState,
    subjects,
    subjectFacings,
    subjectHeads,
    shotPathSamples,
    obstacles,
    cameraSide,
  };
}
