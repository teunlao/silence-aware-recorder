import type { Frame, VADScore } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import { describe, expect, it } from 'vitest';
import { createEnergyVadStage } from './energy-vad-stage';

const createTestPipeline = (options?: Parameters<typeof createEnergyVadStage>[0]) => {
  const timeline: VADScore[] = [];
  let currentTime = 0;
  const pipeline = new Pipeline({
    now: () => currentTime,
    createId: () => 'segment-id',
  });
  pipeline.events.on('vad', (score) => {
    timeline.push(score);
  });

  pipeline.use(createEnergyVadStage({ thresholdDb: -40, ...options }));

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

  return { timeline, push };
};

describe('energy VAD stage', () => {
  it('emits speech scores based on energy threshold', () => {
    const { timeline, push } = createTestPipeline();

    push(0, 0);
    push(0.1, 10);
    push(0.2, 20);
    push(0.6, 30);
    push(0.7, 40);
    push(0.05, 50);

    const speechValues = timeline.map((entry) => entry.speech);
    expect(speechValues.some((value) => value === true)).toBe(true);
    expect(speechValues.some((value) => value === false)).toBe(true);
  });

  it('requires sustained energy when smoothing window is large', () => {
    const { timeline, push } = createTestPipeline({ thresholdDb: -35, smoothMs: 200 });

    push(0, 0);
    push(0.8, 10);
    push(0, 20);

    const speechValues = timeline.map((entry) => entry.speech);
    expect(speechValues).toEqual([false, false, false]);
  });

  it('clamps score to [0,1] respecting floor and ceiling', () => {
    const { timeline, push } = createTestPipeline({ floorDb: -30, ceilingDb: -10, smoothMs: 10 });

    push(0, 0);
    push(1, 10);
    push(4, 20);

    const scores = timeline.map((entry) => entry.score);
    expect(scores[0]).toBe(0);
    expect(scores[1]).toBeGreaterThan(0);
    expect(scores[2]).toBe(1);
    expect(timeline[2]?.speech).toBe(true);
  });

  it('updates threshold without recreating stage', () => {
    const pipeline = new Pipeline({
      now: () => 0,
      createId: () => 'test-id',
    });

    const vadStage = createEnergyVadStage({ thresholdDb: -40, smoothMs: 10 });
    pipeline.use(vadStage);

    const events: VADScore[] = [];
    pipeline.events.on('vad', (score) => events.push(score));

    // Frame with moderate energy
    const frame: Frame = {
      pcm: new Float32Array(1024).fill(0.05), // ~-26dB
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);
    expect(events[0]?.speech).toBe(true); // Above -40dB threshold

    events.length = 0;

    // Update threshold to -20dB (higher)
    vadStage.updateConfig({ thresholdDb: -20 });

    pipeline.push({ ...frame, tsMs: 50 });
    expect(events[0]?.speech).toBe(false); // Below -20dB threshold
  });

  it('updates multiple config parameters at once', () => {
    const pipeline = new Pipeline({
      now: () => 0,
      createId: () => 'test-id',
    });

    const vadStage = createEnergyVadStage({ thresholdDb: -40, smoothMs: 100 });
    pipeline.use(vadStage);

    const events: VADScore[] = [];
    pipeline.events.on('vad', (score) => events.push(score));

    vadStage.updateConfig({ thresholdDb: -30, smoothMs: 10 });

    const frame: Frame = {
      pcm: new Float32Array(1024).fill(0.03), // ~-30dB
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);
    expect(events.length).toBeGreaterThan(0);
  });
});
