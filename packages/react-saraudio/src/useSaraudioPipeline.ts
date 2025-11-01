import type { CoreError, Frame, Pipeline, Segment, Stage, VADScore } from '@saraudio/core';
import type { BrowserRuntime, SegmenterFactoryOptions } from '@saraudio/runtime-browser';
import { buildStages } from '@saraudio/runtime-browser';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSaraudioRuntime } from './context';

export interface UseSaraudioPipelineOptions {
  stages: Stage[];
  segmenter?: SegmenterFactoryOptions | Stage | false;
  retainSegments?: number;
  onSegment?: (segment: Segment) => void;
  onError?: (error: CoreError) => void;
  runtime?: BrowserRuntime;
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

const toSegmenterConfig = (value: UseSaraudioPipelineOptions['segmenter']) => (value === false ? false : (value ?? {}));

export const useSaraudioPipeline = (options: UseSaraudioPipelineOptions): UseSaraudioPipelineResult => {
  const { stages, segmenter, retainSegments, onSegment, onError, runtime: runtimeOverride } = options;
  const runtime = useSaraudioRuntime(runtimeOverride);

  const stageList = stages;
  const segmenterConfig = useMemo(() => toSegmenterConfig(segmenter), [segmenter]);

  const pipeline: Pipeline = useMemo(() => {
    console.log('[pipeline] CREATE', { stageCount: 0 });
    return runtime.createPipeline();
  }, [runtime]);

  const [isSpeech, setIsSpeech] = useState(false);
  const [lastVad, setLastVad] = useState<VADScore | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const collectSegments = shouldCollectSegments(retainSegments);

  useEffect(() => {
    console.log('[pipeline] EFFECT');

    setIsSpeech(false);
    setLastVad(null);
    setSegments([]);

    return () => {
      console.log('[pipeline] DISPOSE');
      pipeline.dispose();
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

    const unsubscribeSegment = pipeline.events.on('segment', (segmentPayload: Segment) => {
      onSegment?.(segmentPayload);
      if (!collectSegments) {
        return;
      }
      setSegments((prev) => {
        const next = [...prev, segmentPayload];
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
    pipeline.flush();
    pipeline.dispose();
  }, [pipeline]);

  const clearSegments = useCallback(() => {
    setSegments([]);
  }, []);

  // Configure stable pipeline whenever stages/segmenter change (delegate resolution to runtime-browser)
  useEffect(() => {
    const resolved = buildStages({ stages: stageList, segmenter: segmenterConfig });
    pipeline.configure({ stages: resolved });
    console.log('[pipeline] CONFIGURE', { stageCount: resolved.length });
  }, [pipeline, stageList, segmenterConfig]);

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
