import { createSegmenterStage, type Frame, Pipeline } from '@saraudio/core';
import { describe, expect, it } from 'vitest';
import { createEnergyVadStage } from '../energy-vad-stage';

const createIntegrationScenario = () => {
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
  pipeline.events.on('vad', (payload) => timeline.push({ event: 'vad', payload }));

  pipeline
    .use(createEnergyVadStage({ thresholdDb: -45, smoothMs: 5 }))
    .use(createSegmenterStage({ preRollMs: 40, hangoverMs: 40 }));

  const pushFrame = (value: number, tsMs: number) => {
    currentTime = tsMs;
    const pcm = new Float32Array(160).fill(value);
    const frame: Frame = {
      pcm,
      tsMs,
      sampleRate: 16000,
      channels: 1,
    };
    pipeline.push(frame);
  };

  const flush = (tsMs: number) => {
    currentTime = tsMs;
    pipeline.flush();
  };

  return { timeline, pushFrame, flush };
};

describe('energy VAD integration', () => {
  it('drives segmenter to emit segment events from energy-based speech detection', () => {
    const { timeline, pushFrame, flush } = createIntegrationScenario();

    pushFrame(0, 0);
    pushFrame(0, 10);

    pushFrame(0.02, 20);
    pushFrame(0.02, 30);
    pushFrame(0.015, 40);

    pushFrame(0, 60);
    pushFrame(0, 70);
    pushFrame(0, 80);
    pushFrame(0, 90);
    pushFrame(0, 100);

    flush(150);

    const speechStart = timeline.filter((item) => item.event === 'speechStart');
    const speechEnd = timeline.filter((item) => item.event === 'speechEnd');
    const segments = timeline.filter((item) => item.event === 'segment');

    expect(speechStart).toHaveLength(1);
    expect(speechStart[0]?.payload).toEqual({ tsMs: 20 });

    expect(speechEnd).toHaveLength(1);
    expect(speechEnd[0]?.payload).toEqual({ tsMs: 100 });

    expect(segments).toHaveLength(1);
    const segment = segments[0]?.payload as { startMs: number; endMs: number; pcm: Int16Array };
    expect(segment.startMs).toBe(20);
    expect(segment.endMs).toBe(100);
    expect(segment.pcm.length).toBeGreaterThan(0);

    const vadEvents = timeline.filter((item) => item.event === 'vad');
    expect(vadEvents.some((entry) => (entry.payload as { speech: boolean }).speech)).toBe(true);
    expect(vadEvents.some((entry) => !(entry.payload as { speech: boolean }).speech)).toBe(true);
  });
});
