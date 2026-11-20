import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  CharacterProfile,
  CharacterSceneState,
  SceneType,
} from '../../types/story';
import {
  getCharacterSpriteTexture,
  getClock02Texture,
} from '../../utils/characterCanvas';

interface StoryCharacterProps {
  character: CharacterSceneState;
  profile: CharacterProfile;
  sceneProgress: number;
  sceneType: SceneType;
  isPlaying: boolean;
}

export const StoryCharacter: React.FC<StoryCharacterProps> = ({
  character,
  profile,
  sceneProgress,
  sceneType: _sceneType,
  isPlaying,
}) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const spriteGroupRef = useRef<THREE.Group | null>(null);
  const [talkPhase, setTalkPhase] = useState<0 | 1>(0);
  const isSpeaking = Boolean(
    character.isSpeaking || character.expression === 'talking'
  );

  // Alternate mouth open/close every 160ms while speaking
  useEffect(() => {
    if (!isSpeaking) {
      setTalkPhase(0);
      return;
    }
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setTalkPhase((prev) => (prev === 0 ? 1 : 0));
    }, 160);
    return () => window.clearInterval(timer);
  }, [isSpeaking, isPlaying]);

  const texture = useMemo(
    () =>
      getCharacterSpriteTexture(
        profile,
        character.expression,
        isSpeaking ? talkPhase : 0,
        character.facing ?? 'right'
      ),
    [profile, character.expression, isSpeaking, talkPhase, character.facing]
  );

  const clockTexture = useMemo(
    () => (character.propOverlay === 'clock02' ? getClock02Texture() : null),
    [character.propOverlay]
  );

  const isWalking = Boolean(
    character.targetPosition &&
      (character.targetPosition[0] !== character.position[0] ||
        character.targetPosition[2] !== character.position[2])
  );

  useFrame((state) => {
    if (!groupRef.current || !spriteGroupRef.current) return;

    // Position interpolation across scene progress
    const target = character.targetPosition ?? character.position;
    const smoothT = sceneProgress * sceneProgress * (3 - 2 * sceneProgress);
    const px = THREE.MathUtils.lerp(character.position[0], target[0], smoothT);
    const py = THREE.MathUtils.lerp(character.position[1], target[1], smoothT);
    const pz = THREE.MathUtils.lerp(character.position[2], target[2], smoothT);
    groupRef.current.position.set(px, py, pz);

    const t = state.clock.elapsedTime;
    const baseScale = character.scale ?? 1;

    // Keep body completely steady while speaking so ONLY the mouth moves
    let scaleY = 1;
    let scaleX = 1;
    let bounceY = 0;
    let rotZ = 0;

    if (!isSpeaking) {
      // Gentle idle breathing squash & stretch
      const breath = Math.sin(t * 3.8 + (character.id.length % 5));
      scaleY = 1 + breath * 0.025;
      scaleX = 1 - breath * 0.018;

      if (isWalking && sceneProgress < 0.95) {
        const step = Math.abs(Math.sin(t * 9.0));
        bounceY = step * 0.1;
        rotZ = Math.sin(t * 9.0) * 0.06;
        scaleY = 1 + step * 0.04;
      } else if (character.expression === 'angry') {
        rotZ = Math.sin(t * 24) * 0.025;
      }
    }

    spriteGroupRef.current.position.y = 0.88 * baseScale + bounceY;
    spriteGroupRef.current.scale.set(
      baseScale * scaleX,
      baseScale * scaleY,
      baseScale
    );
    spriteGroupRef.current.rotation.z = rotZ;
  });

  return (
    <group ref={groupRef} position={character.position}>
      {/* Ground Contact Shadow under stick feet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.42 * (character.scale ?? 1), 24]} />
        <meshBasicMaterial color="#090d16" transparent opacity={0.42} />
      </mesh>

      {/* Always-facing Camera Billboard */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        <group ref={spriteGroupRef} position={[0, 0.88, 0]}>
          <mesh>
            <planeGeometry args={[1.38, 1.76]} />
            <meshBasicMaterial
              map={texture}
              transparent
              alphaTest={0.08}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Optional 2D 02:00 AM Clock Prop above head */}
          {clockTexture && (
            <mesh position={[0.05, 1.08, 0.02]}>
              <planeGeometry args={[0.72, 0.72]} />
              <meshBasicMaterial
                map={clockTexture}
                transparent
                alphaTest={0.08}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}
        </group>
      </Billboard>
    </group>
  );
};
