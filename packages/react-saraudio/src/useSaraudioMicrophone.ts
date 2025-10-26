import type { Frame, Pipeline } from '@saraudio/core';
import type {
  BrowserFrameSource,
  BrowserRuntime,
  MicrophoneSourceOptions,
  RuntimeMode,
} from '@saraudio/runtime-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSaraudioRuntime } from './context';

type Status = 'idle' | 'acquiring' | 'running' | 'stopping' | 'error';

const toError = (value: unknown): Error => {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
};

export interface UseSaraudioMicrophoneOptions {
  pipeline: Pipeline;
  runtime?: BrowserRuntime;
  constraints?: MicrophoneSourceOptions['constraints'];
  mode?: RuntimeMode;
  autoStart?: boolean;
  onStart?: () => void;
  onStop?: () => void;
  onError?: (error: Error) => void;
  onStream?: (stream: MediaStream | null) => void;
  onFrame?: (frame: Frame) => void;
}

export interface UseSaraudioMicrophoneResult {
  status: Status;
  error: Error | null;
  start(): Promise<void>;
  stop(): Promise<void>;
  source: BrowserFrameSource | null;
}

export const useSaraudioMicrophone = (options: UseSaraudioMicrophoneOptions): UseSaraudioMicrophoneResult => {
  const {
    pipeline,
    runtime: runtimeOverride,
    constraints,
    mode,
    autoStart,
    onStart,
    onStop,
    onError,
    onStream,
    onFrame,
  } = options;

  const runtime = useSaraudioRuntime(runtimeOverride);
  const pipelineRef = useRef(pipeline);
  const statusRef = useRef<Status>('idle');
  const sourceRef = useRef<BrowserFrameSource | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [source, setSource] = useState<BrowserFrameSource | null>(null);

  const updateStatus = useCallback((next: Status) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  useEffect(() => {
    pipelineRef.current = pipeline;
  }, [pipeline]);

  const frameHandler = useMemo(() => {
    return (frame: Frame) => {
      pipelineRef.current.push(frame);
      onFrame?.(frame);
    };
  }, [onFrame]);

  const startRef = useRef<(() => Promise<void>) | null>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  const start = useCallback(async () => {
    if (statusRef.current === 'acquiring' || statusRef.current === 'running') {
      return;
    }

    setError(null);
    updateStatus('acquiring');

    try {
      const sourceInstance = runtime.createMicrophoneSource({
        constraints,
        mode,
        onStream,
      });
      setSource(sourceInstance);
      sourceRef.current = sourceInstance;

      await sourceInstance.start(frameHandler);

      updateStatus('running');
      onStart?.();
    } catch (unknownError) {
      const resolved = toError(unknownError);
      setError(resolved);
      updateStatus('error');
      setSource(null);
      sourceRef.current = null;
      onStream?.(null);
      onError?.(resolved);
      throw resolved;
    }
  }, [constraints, frameHandler, mode, onError, onStart, onStream, runtime, updateStatus]);

  const stop = useCallback(async () => {
    const activeSource = sourceRef.current;
    if (!activeSource || statusRef.current === 'stopping') {
      return;
    }

    updateStatus('stopping');

    try {
      await activeSource.stop();
      pipelineRef.current.flush();
      updateStatus('idle');
      onStop?.();
    } catch (unknownError) {
      const resolved = toError(unknownError);
      setError(resolved);
      updateStatus('error');
      onError?.(resolved);
      throw resolved;
    } finally {
      setSource(null);
      sourceRef.current = null;
      onStream?.(null);
    }
  }, [onError, onStop, onStream, updateStatus]);

  useEffect(() => {
    startRef.current = start;
  }, [start]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  useEffect(() => {
    if (!autoStart) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await startRef.current?.();
      } catch (errorDuringStart) {
        if (!cancelled) {
          setError(toError(errorDuringStart));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
      void stopRef.current?.();
    };
  }, [autoStart]);

  useEffect(() => {
    return () => {
      void stopRef.current?.();
    };
  }, []);

  return {
    status,
    error,
    start,
    stop,
    source,
  };
};
