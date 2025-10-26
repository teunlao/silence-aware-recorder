import type { CoreError, Frame, PipelineDependencies, Segment, Stage, VADScore } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSaraudioContext } from './context';

interface ResolvedDependencies extends PipelineDependencies {
  descriptor: string;
}

const createDefaultDependencies = (): PipelineDependencies => {
  const now =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? () => performance.now()
      : () => Date.now();

  const createId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? () => crypto.randomUUID()
      : () => Math.random().toString(16).slice(2);

  return { now, createId };
};

export interface UseSaraudioPipelineOptions {
  stages: Stage[];
  dependencies?: Partial<PipelineDependencies>;
  retainSegments?: number;
  onSegment?: (segment: Segment) => void;
  onError?: (error: CoreError) => void;
}

export interface UseSaraudioPipelineResult {
  pipeline: Pipeline;
  push(frame: Frame): void;
  flush(): void;
  dispose(): void;
  isSpeech: boolean;
  lastVad: VADScore | null;
  segments: readonly Segment[];
  clearSegments(): void;
}

const shouldCollectSegments = (retainSegments?: number): boolean => Boolean(retainSegments && retainSegments > 0);

export const useSaraudioPipeline = (options: UseSaraudioPipelineOptions): UseSaraudioPipelineResult => {
  const { stages, dependencies, retainSegments, onSegment, onError } = options;
  const providerValue = useSaraudioContext();
  const defaultDeps = useMemo(() => createDefaultDependencies(), []);
  const overrideNow = dependencies?.now;
  const overrideCreateId = dependencies?.createId;

  const resolvedDeps: ResolvedDependencies = useMemo(() => {
    const now = overrideNow ?? providerValue.now ?? defaultDeps.now;
    const createId = overrideCreateId ?? providerValue.createId ?? defaultDeps.createId;
    return {
      now,
      createId,
      descriptor: `${now.toString()}::${createId.toString()}`,
    };
  }, [overrideNow, overrideCreateId, providerValue.now, providerValue.createId, defaultDeps]);

  const stageList = useMemo(() => [...stages], [stages]);

  const pipeline = useMemo(() => {
    const instance = new Pipeline({ now: resolvedDeps.now, createId: resolvedDeps.createId });
    stageList.forEach((stage) => {
      instance.use(stage);
    });
    return instance;
  }, [stageList, resolvedDeps]);

  const disposedRef = useRef(false);
  const [isSpeech, setIsSpeech] = useState(false);
  const [lastVad, setLastVad] = useState<VADScore | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const collectSegments = shouldCollectSegments(retainSegments);

  useEffect(() => {
    disposedRef.current = false;
    return () => {
      if (!disposedRef.current) {
        pipeline.dispose();
        disposedRef.current = true;
      }
    };
  }, [pipeline]);

  useEffect(() => {
    const unsubscribeVad = pipeline.events.on('vad', (payload: VADScore) => {
      setLastVad(payload);
    });

    const unsubscribeSpeechStart = pipeline.events.on('speechStart', () => {
      setIsSpeech(true);
    });

    const unsubscribeSpeechEnd = pipeline.events.on('speechEnd', () => {
      setIsSpeech(false);
    });

    const unsubscribeSegment = pipeline.events.on('segment', (segment: Segment) => {
      onSegment?.(segment);
      if (!collectSegments) {
        return;
      }
      setSegments((prev) => {
        const next = [...prev, segment];
        if (retainSegments && next.length > retainSegments) {
          next.splice(0, next.length - retainSegments);
        }
        return next;
      });
    });

    const unsubscribeError = pipeline.events.on('error', (error: CoreError) => {
      onError?.(error);
    });

    return () => {
      unsubscribeVad();
      unsubscribeSpeechStart();
      unsubscribeSpeechEnd();
      unsubscribeSegment();
      unsubscribeError();
    };
  }, [pipeline, collectSegments, retainSegments, onSegment, onError]);

  const push = useCallback(
    (frame: Frame) => {
      pipeline.push(frame);
    },
    [pipeline],
  );

  const flush = useCallback(() => {
    pipeline.flush();
  }, [pipeline]);

  const dispose = useCallback(() => {
    if (disposedRef.current) {
      return;
    }
    pipeline.flush();
    pipeline.dispose();
    disposedRef.current = true;
  }, [pipeline]);

  const clearSegments = useCallback(() => {
    setSegments([]);
  }, []);

  return {
    pipeline,
    push,
    flush,
    dispose,
    isSpeech,
    lastVad,
    segments,
    clearSegments,
  };
};
