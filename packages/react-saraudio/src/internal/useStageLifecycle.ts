import type { Stage } from '@saraudio/core';
import { useEffect, useMemo, useRef } from 'react';

/**
 * Internal helper: creates a stage once and keeps it stable
 */
export function useStableStage<T extends Stage>(factory: () => T): T {
  const stageRef = useRef<T | null>(null);

  const stage = useMemo(() => {
    if (stageRef.current) {
      return stageRef.current;
    }
    const instance = factory();
    stageRef.current = instance;
    return instance;
  }, [factory]);

  return stage;
}

/**
 * Internal helper: creates a stage once and calls updateConfig when options change
 */
export function useUpdatableStage<O, T extends Stage & { updateConfig(options: O): void }>(
  factory: () => T,
  options: O,
): T {
  const stageRef = useRef<T | null>(null);

  const stage = useMemo(() => {
    if (stageRef.current) {
      return stageRef.current;
    }
    const instance = factory();
    stageRef.current = instance;
    return instance;
  }, [factory]);

  const optionsRef = useRef(options);

  useEffect(() => {
    const prev = optionsRef.current;
    const next = options;

    if (prev !== next) {
      stage.updateConfig(next);
      optionsRef.current = next;
    }
  }, [options, stage]);

  return stage;
}
