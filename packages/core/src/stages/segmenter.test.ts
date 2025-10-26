import { describe, expect, it } from 'vitest';
import { Pipeline } from '../pipeline';
import type { Frame, VADScore } from '../types';
import { createSegmenterStage } from './segmenter';

const createPipelineWithSegmenter = (options?: Parameters<typeof createSegmenterStage>[0]) => {
  const timeline: Array<{ event: string; payload: unknown }> = [];
  let currentTime = 0;
  let idCounter = 0;

  const pipeline = new Pipeline({
    now: () => currentTime,
    createId: () => {
      idCounter += 1;
      return `segment-${idCounter}`;
    },
  });

  pipeline.events.on('speechStart', (payload) => timeline.push({ event: 'speechStart', payload }));
  pipeline.events.on('speechEnd', (payload) => timeline.push({ event: 'speechEnd', payload }));
  pipeline.events.on('segment', (payload) => timeline.push({ event: 'segment', payload }));

  const segmenter = createSegmenterStage({ preRollMs: 100, hangoverMs: 100, ...options });
  pipeline.use(segmenter);

  const pushFrame = (value: number, tsMs: number) => {
    currentTime = tsMs;
    const frame: Frame = {
      pcm: new Float32Array([value]),
      tsMs,
      sampleRate: 16000,
      channels: 1,
    };
    pipeline.push(frame);
  };

  const emitVad = (speech: boolean, tsMs: number) => {
    const score: VADScore = { tsMs, score: speech ? 1 : 0, speech };
    pipeline.events.emit('vad', score);
  };

  const advanceTime = (ts: number): void => {
    currentTime = ts;
  };

  return { timeline, pushFrame, emitVad, pipeline, advanceTime };
};

describe('segmenter stage', () => {
  it('emits speech and segment events respecting preRoll and hangover', () => {
    const { timeline, pushFrame, emitVad, pipeline } = createPipelineWithSegmenter();

    pushFrame(0, 0);
    pushFrame(0, 10);

    emitVad(true, 20);
    pushFrame(0.5, 20);
    pushFrame(0.4, 30);

    pushFrame(0.3, 40);
    pushFrame(0.2, 50);

    emitVad(false, 60);
    pushFrame(0.1, 60);
    pushFrame(0, 120);
    pushFrame(0, 180);

    pipeline.flush();

    const speechStartEvents = timeline.filter((item) => item.event === 'speechStart');
    const speechEndEvents = timeline.filter((item) => item.event === 'speechEnd');
    const segmentEvents = timeline.filter((item) => item.event === 'segment');

    expect(speechStartEvents).toHaveLength(1);
    expect(speechStartEvents[0]?.payload).toEqual({ tsMs: 20 });

    expect(speechEndEvents).toHaveLength(1);
    expect(speechEndEvents[0]?.payload).toEqual({ tsMs: 180 });

    expect(segmentEvents).toHaveLength(1);
    const segment = segmentEvents[0]?.payload as { startMs: number; endMs: number; pcm: Int16Array };
    expect(segment.startMs).toBe(20);
    expect(segment.endMs).toBe(180);
    expect(segment.pcm.length).toBeGreaterThan(0);
  });

  it('suppresses rapid vad flips within hangover window and finalizes on flush', () => {
    const { timeline, pushFrame, emitVad, pipeline, advanceTime } = createPipelineWithSegmenter({ hangoverMs: 150 });

    // Warmup silence
    pushFrame(0, 0);
    pushFrame(0, 20);

    // Speech detected
    emitVad(true, 30);
    pushFrame(0.5, 30);

    // Brief silence shorter than hangover should not close segment
    emitVad(false, 60);
    pushFrame(0, 60);

    // Speech resumes before hangover expires
    emitVad(true, 80);
    pushFrame(0.6, 80);

    // Actual silence long enough to finish
    emitVad(false, 110);
    pushFrame(0, 110);
    pushFrame(0, 200);

    advanceTime(260);
    pipeline.flush();

    const speechStartEvents = timeline.filter((item) => item.event === 'speechStart');
    const speechEndEvents = timeline.filter((item) => item.event === 'speechEnd');

    expect(speechStartEvents).toHaveLength(1);
    expect(speechEndEvents).toHaveLength(1);
    expect((speechEndEvents[0]?.payload as { tsMs: number }).tsMs).toBe(110);

    const segmentEvents = timeline.filter((item) => item.event === 'segment');
    expect(segmentEvents).toHaveLength(1);
    const segment = segmentEvents[0]?.payload as { startMs: number; endMs: number };
    expect(segment.startMs).toBe(30);
    expect(segment.endMs).toBe(110);
  });
});
