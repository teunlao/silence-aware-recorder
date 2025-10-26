import type { Frame, Pipeline, Stage } from '@saraudio/core';

export type RuntimeMode = 'worklet' | 'media-recorder' | 'auto';

export type FallbackReason = 'worklet-unsupported' | 'media-recorder-unsupported' | 'display-audio-unsupported';

export interface RuntimeLogger {
  info: (...messages: ReadonlyArray<unknown>) => void;
  warn: (...messages: ReadonlyArray<unknown>) => void;
  error: (...messages: ReadonlyArray<unknown>) => void;
}

export interface RuntimeServices {
  clock: () => number;
  createId: () => string;
  logger: RuntimeLogger;
}

export interface RuntimeServiceOverrides extends Partial<RuntimeServices> {}

export interface BrowserRuntimeOptions {
  mode?: RuntimeMode;
  services?: RuntimeServiceOverrides;
  worklet?: {
    ringBufferFrames?: number;
  };
  recorder?: {
    timesliceMs?: number;
    mimeType?: string;
    audioBitsPerSecond?: number;
  };
  onFallback?: (reason: FallbackReason) => void;
}

export interface SegmenterFactoryOptions {
  preRollMs?: number;
  hangoverMs?: number;
}

export interface BrowserPipelineOptions {
  stages?: Stage[];
  segmenter?: SegmenterFactoryOptions | Stage | false;
}

export interface BrowserFrameSource {
  start(onFrame: (frame: Frame) => void): Promise<void>;
  stop(): Promise<void>;
}

export interface MicrophoneSourceOptions {
  constraints?: MediaTrackConstraints | MediaStreamConstraints['audio'];
  mode?: RuntimeMode;
  onStream?: (stream: MediaStream | null) => void;
}

export interface RunOptions {
  source: BrowserFrameSource;
  pipeline: Pipeline;
  autoFlush?: boolean;
}

export interface BrowserRuntime {
  readonly services: RuntimeServices;
  createPipeline(options?: BrowserPipelineOptions): Pipeline;
  createSegmenter(options?: SegmenterFactoryOptions): Stage;
  createMicrophoneSource(options?: MicrophoneSourceOptions): BrowserFrameSource;
  run(options: RunOptions): Promise<void>;
}
