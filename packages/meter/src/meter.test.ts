import type { Frame, MeterPayload } from '@saraudio/core';
import { Pipeline } from '@saraudio/core';
import { describe, expect, it } from 'vitest';
import { createAudioMeterStage } from './meter';

const createTestPipeline = () => {
  const meterEvents: MeterPayload[] = [];
  const pipeline = new Pipeline({
    now: () => 0,
    createId: () => 'test-id',
  });

  const meterStage = createAudioMeterStage();
  pipeline.use(meterStage);

  pipeline.events.on('meter', (payload) => {
    meterEvents.push(payload);
  });

  return { pipeline, meterEvents };
};

describe('audio-meter stage', () => {
  it('emits meter event on each frame', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([0.5, 0.5, 0.5]),
      tsMs: 100,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents).toHaveLength(1);
    expect(meterEvents[0]?.tsMs).toBe(100);
  });

  it('calculates RMS correctly for known values', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    // RMS of [0.6, 0.8] = sqrt((0.36 + 0.64) / 2) = sqrt(0.5) = 0.707...
    const frame: Frame = {
      pcm: new Float32Array([0.6, 0.8]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.rms).toBeCloseTo(Math.SQRT1_2, 2);
  });

  it('calculates peak correctly', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([0.5, -0.8, 0.3]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.peak).toBeCloseTo(0.8, 5); // max absolute value
  });

  it('handles zero RMS (returns -Infinity dB)', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([0, 0, 0]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.rms).toBe(0);
    expect(meterEvents[0]?.db).toBe(-Infinity);
  });

  it('handles empty buffer gracefully', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([]),
      tsMs: 100,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents).toHaveLength(1);
    expect(meterEvents[0]?.rms).toBe(0);
    expect(meterEvents[0]?.peak).toBe(0);
    expect(meterEvents[0]?.db).toBe(-Infinity);
    expect(meterEvents[0]?.tsMs).toBe(100);
  });

  it('handles full scale signal', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([1, 1, 1]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.rms).toBeCloseTo(1, 5);
    expect(meterEvents[0]?.peak).toBe(1);
    expect(meterEvents[0]?.db).toBeCloseTo(0, 1); // ≈0 dBFS
  });

  it('handles nearly zero signal', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([1e-8, 1e-8, 1e-8]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.rms).toBeGreaterThan(0);
    expect(meterEvents[0]?.db).toBeLessThan(-140); // Very quiet
    expect(meterEvents[0]?.db).not.toBe(-Infinity); // Because of EPS
  });

  it('guards against NaN in buffer', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Float32Array([0.5, NaN, 0.5]),
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    // Should not throw
    expect(() => pipeline.push(frame)).not.toThrow();

    // Should produce valid metrics (NaN treated as 0)
    expect(meterEvents[0]?.rms).toBeGreaterThan(0);
    expect(meterEvents[0]?.peak).toBe(0.5);
    expect(Number.isFinite(meterEvents[0]?.db) || meterEvents[0]?.db === -Infinity).toBe(true);
  });

  it('works with Int16Array input', () => {
    const { pipeline, meterEvents } = createTestPipeline();

    const frame: Frame = {
      pcm: new Int16Array([16384, -16384]), // ~0.5, -0.5 normalized
      tsMs: 0,
      sampleRate: 16000,
      channels: 1,
    };

    pipeline.push(frame);

    expect(meterEvents[0]?.rms).toBeGreaterThan(0);
    expect(meterEvents[0]?.peak).toBeGreaterThan(0);
  });
});
