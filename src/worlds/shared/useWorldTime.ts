import type { DependencyList } from 'react';
import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

/**
 * Drives deterministic world animations at 60 FPS without React tree re-renders.
 * - When `time` is a number (Remotion or scrubbed frame), runs synchronously in `useLayoutEffect`.
 * - When `time` is undefined (live free-cam preview), runs initial frame `0` on mount and updates in `useFrame`.
 */
export function useWorldAnimation(
  time: number | undefined,
  step: (t: number) => void,
  deps: DependencyList = []
) {
  const stepRef = useRef(step);
  stepRef.current = step;

  useLayoutEffect(() => {
    stepRef.current(time ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, ...deps]);

  useFrame(({ clock }) => {
    if (time === undefined) {
      stepRef.current(clock.elapsedTime);
    }
  });
}
