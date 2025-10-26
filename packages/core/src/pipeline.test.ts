import { describe, expect, it } from 'vitest';
import { Pipeline, type Stage, type StageContext } from './pipeline';
import type { Frame } from './types';

interface TestEvent {
  type: string;
  payload?: unknown;
  tsMs?: number;
  speech?: boolean;
}

const createMockVadStage = (events: TestEvent[]): Stage => {
  let context: StageContext | null = null;
  return {
    name: 'mock-vad',
    setup(ctx) {
      context = ctx;
    },
    handle(frame) {
      if (!context) return;
      const speech = frame.pcm[0] >= 0.4;
      context.emit('vad', { tsMs: frame.tsMs, score: speech ? 1 : 0, speech });
      events.push({ type: 'vad-handle', tsMs: frame.tsMs, speech });
    },
  };
};

const createMockSegmenterStage = (events: TestEvent[]): Stage => ({
  name: 'mock-segmenter',
  setup(ctx) {
    ctx.on('vad', (score) => {
      events.push({ type: 'vad-event', payload: score });
    });
  },
  handle(frame) {
    events.push({ type: 'segmenter-handle', tsMs: frame.tsMs });
  },
});

const buildPipeline = () => {
  const events: TestEvent[] = [];
  let currentTime = 0;
  const pipeline = new Pipeline({
    now: () => currentTime,
    createId: () => 'segment-1',
  });
  pipeline.use(createMockVadStage(events));
  pipeline.use(createMockSegmenterStage(events));

  const push = (value: number, tsMs: number) => {
    currentTime = tsMs;
    const frame: Frame = {
      pcm: new Float32Array([value]),
      tsMs,
      sampleRate: 16000,
      channels: 1,
    };
    pipeline.push(frame);
  };

  return { events, pipeline, push };
};

describe('Pipeline', () => {
  it('routes frames through stages and emits events', () => {
    const { events, pipeline, push } = buildPipeline();
    push(0.1, 0);
    push(0.5, 10);

    pipeline.flush();

    const handled = events.filter((e) => e.type === 'segmenter-handle').length;
    const vadEvents = events.filter((e) => e.type === 'vad-event').length;

    expect(handled).toBeGreaterThan(0);
    expect(vadEvents).toBeGreaterThan(0);
  });
});
