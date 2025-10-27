import type { Frame, Segment, Stage, StageContext, VADScore } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import type {
  BrowserFrameSource,
  BrowserRuntime,
  MicrophoneSourceOptions,
  SegmenterFactoryOptions,
} from '@saraudio/runtime-browser';
import { noopLogger } from '@saraudio/utils';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { SaraudioProvider } from './context';
import { useSaraudioMicrophone } from './useSaraudioMicrophone';
import { useSaraudioPipeline } from './useSaraudioPipeline';

const createEventStage = (): Stage => {
  let contextRef: StageContext | null = null;
  return {
    setup(context) {
      contextRef = context;
    },
    handle(frame) {
      if (!contextRef) {
        throw new Error('Stage context not initialised');
      }
      const vad: VADScore = {
        score: 0.85,
        speech: true,
        tsMs: frame.tsMs,
      };
      const segment: Segment = {
        id: contextRef.createId(),
        startMs: frame.tsMs,
        endMs: frame.tsMs + 120,
        durationMs: 120,
        sampleRate: frame.sampleRate,
        channels: frame.channels,
      };
      contextRef.emit('speechStart', { tsMs: frame.tsMs });
      contextRef.emit('vad', vad);
      contextRef.emit('segment', segment);
      contextRef.emit('speechEnd', { tsMs: frame.tsMs + 120 });
    },
  };
};

class MockSource implements BrowserFrameSource {
  private listener: ((frame: Frame) => void) | null = null;

  public started = false;

  async start(onFrame: (frame: Frame) => void): Promise<void> {
    this.listener = onFrame;
    this.started = true;
  }

  async stop(): Promise<void> {
    this.listener = null;
    this.started = false;
  }

  emit(frame: Frame): void {
    this.listener?.(frame);
  }
}

const isStage = (value: SegmenterFactoryOptions | Stage | false | undefined): value is Stage =>
  Boolean(value) && typeof (value as Stage).handle === 'function';

class MockBrowserRuntime implements BrowserRuntime {
  public services = {
    clock: () => 0,
    createId: () => Math.random().toString(16).slice(2),
    logger: noopLogger,
  };

  public lastSource: MockSource | null = null;

  createPipeline({
    stages = [],
    segmenter,
  }: {
    stages?: Stage[];
    segmenter?: SegmenterFactoryOptions | Stage | false;
  } = {}) {
    const pipeline = new Pipeline({
      now: () => this.services.clock(),
      createId: () => this.services.createId(),
    });
    stages.forEach((stage) => {
      pipeline.use(stage);
    });
    if (segmenter && isStage(segmenter)) {
      pipeline.use(segmenter);
    }
    return pipeline;
  }

  createSegmenter(): Stage {
    throw new Error('Not implemented in mock');
  }

  createMicrophoneSource(_options?: MicrophoneSourceOptions): BrowserFrameSource {
    const source = new MockSource();
    this.lastSource = source;
    return source;
  }

  async run(): Promise<void> {
    throw new Error('Not implemented in mock');
  }
}

describe('useSaraudioPipeline', () => {
  it('reacts to pipeline events emitted by stages', () => {
    const runtime = new MockBrowserRuntime();
    const stage = createEventStage();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SaraudioProvider runtime={runtime}>{children}</SaraudioProvider>
    );

    const { result } = renderHook(
      () =>
        useSaraudioPipeline({
          stages: [stage],
          retainSegments: 2,
          segmenter: false,
        }),
      { wrapper },
    );

    expect(result.current.pipeline).toBeInstanceOf(Pipeline);
    expect(result.current.isSpeech).toBe(false);
    expect(result.current.lastVad).toBeNull();
    expect(result.current.segments).toHaveLength(0);

    const frame: Frame = {
      pcm: new Float32Array(160),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    act(() => {
      result.current.push(frame);
    });

    expect(result.current.isSpeech).toBe(false);
    expect(result.current.lastVad?.speech).toBe(true);
    expect(result.current.segments).toHaveLength(1);

    act(() => {
      result.current.clearSegments();
    });

    expect(result.current.segments).toHaveLength(0);
  });
});

describe('useSaraudioMicrophone', () => {
  it('starts and stops microphone source via runtime', async () => {
    const runtime = new MockBrowserRuntime();
    const capturedFrames: Frame[] = [];

    const collectorStage: Stage = {
      setup() {
        // no-op
      },
      handle(frame) {
        capturedFrames.push(frame);
      },
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <SaraudioProvider runtime={runtime}>{children}</SaraudioProvider>
    );

    const { result } = renderHook(
      () => {
        const pipelineState = useSaraudioPipeline({
          stages: [collectorStage],
          segmenter: false,
        });
        const microphone = useSaraudioMicrophone({
          pipeline: pipelineState.pipeline,
        });
        return { pipelineState, microphone };
      },
      { wrapper },
    );

    expect(result.current.microphone.status).toBe('idle');

    await act(async () => {
      await result.current.microphone.start();
    });

    expect(runtime.lastSource?.started).toBe(true);
    expect(result.current.microphone.status).toBe('running');

    const frame: Frame = {
      pcm: new Float32Array(320),
      tsMs: 10,
      sampleRate: 16000,
      channels: 1,
    };

    runtime.lastSource?.emit(frame);

    expect(capturedFrames).toHaveLength(1);

    await act(async () => {
      await result.current.microphone.stop();
    });

    expect(result.current.microphone.status).toBe('idle');
    expect(runtime.lastSource?.started).toBe(false);
  });
});
