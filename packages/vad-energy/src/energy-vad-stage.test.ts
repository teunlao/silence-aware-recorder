import type { Frame } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import { describe, expect, it } from 'vitest';
import { createEnergyVadStage } from './energy-vad-stage';

const createTestPipeline = () => {
  const timeline: Array<{ tsMs: number; speech: boolean }> = [];
  let currentTime = 0;
  const pipeline = new Pipeline({
    now: () => currentTime,
    createId: () => 'segment-id',
  });
  pipeline.events.on('vad', (score) => {
    timeline.push({ tsMs: score.tsMs, speech: score.speech });
  });

  pipeline.use(createEnergyVadStage({ thresholdDb: -40 }));

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
});
