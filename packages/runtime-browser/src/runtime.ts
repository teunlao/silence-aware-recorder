import { createSegmenterStage, Pipeline, type SegmenterOptions, type Stage } from '@saraudio/core';
import { createRuntimeServices } from './context/services';
import {
  snapshotCapabilities,
  supportsMediaRecorderPipeline,
  supportsWorkletPipeline,
} from './environment/capabilities';
import { createMediaRecorderSource } from './sources/media-recorder-source';
import { createWorkletMicrophoneSource } from './sources/worklet-source';
import type {
  BrowserFrameSource,
  BrowserPipelineOptions,
  BrowserRuntime,
  BrowserRuntimeOptions,
  FallbackReason,
  MicrophoneSourceOptions,
  RunOptions,
  RuntimeMode,
  SegmenterFactoryOptions,
} from './types';

const isStage = (value: SegmenterFactoryOptions | Stage): value is Stage =>
  typeof (value as Stage).setup === 'function' && typeof (value as Stage).handle === 'function';

const toSegmenterStage = (value: SegmenterFactoryOptions | Stage | undefined): Stage => {
  if (!value) {
    return createSegmenterStage();
  }
  if (isStage(value)) {
    return value;
  }
  const options: SegmenterOptions = {
    preRollMs: value.preRollMs,
    hangoverMs: value.hangoverMs,
  };
  return createSegmenterStage(options);
};

const resolveMode = (requested: RuntimeMode, notifyFallback: (reason: FallbackReason) => void): RuntimeMode => {
  const snapshot = snapshotCapabilities();

  if (requested === 'worklet') {
    if (supportsWorkletPipeline(snapshot)) {
      return 'worklet';
    }
    notifyFallback('worklet-unsupported');
    if (supportsMediaRecorderPipeline(snapshot)) {
      return 'media-recorder';
    }
    throw new Error('AudioWorklet pipeline is not supported in this environment');
  }

  if (requested === 'media-recorder') {
    if (supportsMediaRecorderPipeline(snapshot)) {
      return 'media-recorder';
    }
    notifyFallback('media-recorder-unsupported');
    throw new Error('MediaRecorder API is not supported in this environment');
  }

  // auto mode
  if (supportsWorkletPipeline(snapshot)) {
    return 'worklet';
  }
  if (supportsMediaRecorderPipeline(snapshot)) {
    notifyFallback('worklet-unsupported');
    return 'media-recorder';
  }
  notifyFallback('media-recorder-unsupported');
  throw new Error('Neither AudioWorklet nor MediaRecorder are supported in this environment');
};

export const createBrowserRuntime = (options?: BrowserRuntimeOptions): BrowserRuntime => {
  const services = createRuntimeServices(options?.services);

  const createPipeline = (pipelineOptions?: BrowserPipelineOptions): Pipeline => {
    const pipeline = new Pipeline({
      now: () => services.clock(),
      createId: () => services.createId(),
    });

    const stages = pipelineOptions?.stages ?? [];
    stages.forEach((stage) => {
      pipeline.use(stage);
    });

    if (pipelineOptions?.segmenter !== false) {
      const segmenterStage = toSegmenterStage(
        pipelineOptions?.segmenter as SegmenterFactoryOptions | Stage | undefined,
      );
      pipeline.use(segmenterStage);
    }

    return pipeline;
  };

  const createSegmenter = (segmenterOptions?: SegmenterFactoryOptions): Stage => toSegmenterStage(segmenterOptions);

  const createMicrophoneSource = (sourceOptions?: MicrophoneSourceOptions): BrowserFrameSource => {
    const mode = resolveMode(sourceOptions?.mode ?? options?.mode ?? 'auto', (reason) => {
      services.logger.warn('Runtime fallback', reason);
      options?.onFallback?.(reason);
    });

    if (mode === 'worklet') {
      try {
        return createWorkletMicrophoneSource({
          constraints: sourceOptions?.constraints,
          ringBufferFrames: options?.worklet?.ringBufferFrames ?? 2048,
          onStream: sourceOptions?.onStream,
          logger: services.logger,
        });
      } catch (error) {
        services.logger.warn('AudioWorklet microphone source not available, falling back to MediaRecorder', error);
        options?.onFallback?.('worklet-unsupported');
        return createMediaRecorderSource({
          constraints: sourceOptions?.constraints,
          frameSize: options?.recorder?.frameSize,
          onStream: sourceOptions?.onStream,
          logger: services.logger,
        });
      }
    }

    return createMediaRecorderSource({
      constraints: sourceOptions?.constraints,
      frameSize: options?.recorder?.frameSize,
      onStream: sourceOptions?.onStream,
      logger: services.logger,
    });
  };

  const run = async ({ source, pipeline, autoFlush = true }: RunOptions): Promise<void> => {
    try {
      await source.start((frame) => {
        pipeline.push(frame);
      });
      if (autoFlush) {
        pipeline.flush();
      }
    } finally {
      await source.stop();
    }
  };

  return {
    services,
    createPipeline,
    createSegmenter,
    createMicrophoneSource,
    run,
  };
};
