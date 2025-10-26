import type { Frame, Segment, Stage, StageContext, VADScore } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { SaraudioProvider } from './context';
import { useSaraudioPipeline } from './useSaraudioPipeline';

const createTestStage = (): Stage => {
  let contextRef: StageContext | null = null;
  return {
    setup(context: StageContext) {
      contextRef = context;
    },
    handle(frame: Frame) {
      if (!contextRef) {
        throw new Error('Stage context not initialised');
      }
      const vad: VADScore = {
        score: 0.75,
        speech: true,
        tsMs: frame.tsMs,
      };
      const segment: Segment = {
        id: contextRef.createId(),
        startMs: frame.tsMs,
        endMs: frame.tsMs + 100,
        durationMs: 100,
        sampleRate: frame.sampleRate,
        channels: frame.channels,
      };
      contextRef.emit('speechStart', { tsMs: frame.tsMs });
      contextRef.emit('vad', vad);
      contextRef.emit('segment', segment);
      contextRef.emit('speechEnd', { tsMs: frame.tsMs + 100 });
    },
  };
};

describe('useSaraudioPipeline', () => {
  it('creates a pipeline that reacts to pushed frames', () => {
    const stage = createTestStage();
    const wrapper = ({ children }: { children: ReactNode }) => <SaraudioProvider>{children}</SaraudioProvider>;

    const { result } = renderHook(
      () =>
        useSaraudioPipeline({
          stages: [stage],
          retainSegments: 2,
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
    expect(result.current.lastVad).not.toBeNull();
    expect(result.current.lastVad?.speech).toBe(true);
    expect(result.current.segments).toHaveLength(1);

    act(() => {
      result.current.clearSegments();
    });

    expect(result.current.segments).toHaveLength(0);
  });
});
