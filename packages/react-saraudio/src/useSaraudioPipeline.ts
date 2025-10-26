import type { CoreError, Frame, Pipeline, Segment, Stage, VADScore } from '@saraudio/core';
import type { BrowserRuntime, SegmenterFactoryOptions } from '@saraudio/runtime-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const isStage = (value: SegmenterFactoryOptions | Stage): value is Stage =>
  typeof (value as Stage).handle === 'function' && typeof (value as Stage).setup === 'function';

const toSegmenterConfig = (value: UseSaraudioPipelineOptions['segmenter']): SegmenterFactoryOptions | Stage | false => {
  if (value === false) {
    return false;
  }
  if (!value) {
    return {};
  }
  if (isStage(value)) {
    return value;
  }
  return value;
};

export const useSaraudioPipeline = (options: UseSaraudioPipelineOptions): UseSaraudioPipelineResult => {
  const { stages, segmenter, retainSegments, onSegment, onError, runtime: runtimeOverride } = options;
  const runtime = useSaraudioRuntime(runtimeOverride);

  const stageSnapshotRef = useRef<Stage[]>([]);

  const stageList = useMemo(() => {
    const previous = stageSnapshotRef.current;
    const sameList = previous.length === stages.length && previous.every((stage, index) => stage === stages[index]);
    if (sameList) {
      return previous;
    }
    const next = [...stages];
    stageSnapshotRef.current = next;
    return next;
  }, [stages]);
  const segmenterConfig = useMemo(() => toSegmenterConfig(segmenter), [segmenter]);

  const pipeline = useMemo(() => {
    const instance = runtime.createPipeline({
      stages: stageList,
      segmenter: segmenterConfig === false ? false : segmenterConfig,
    });
    return instance;
  }, [runtime, stageList, segmenterConfig]);

  const lastPipelineRef = useRef<Pipeline | null>(null);
  const wasDisposedRef = useRef(false);
  const [isSpeech, setIsSpeech] = useState(false);
  const [lastVad, setLastVad] = useState<VADScore | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const collectSegments = shouldCollectSegments(retainSegments);

  useEffect(() => {
    const samePipeline = lastPipelineRef.current === pipeline;

    // React StrictMode: reinitialize stages after dispose on remount
    if (samePipeline && wasDisposedRef.current) {
      pipeline.reinitialize();
    }

    lastPipelineRef.current = pipeline;
    wasDisposedRef.current = false;

    setIsSpeech(false);
    setLastVad(null);
    setSegments([]);

    return () => {
      pipeline.dispose();
      wasDisposedRef.current = true;
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
