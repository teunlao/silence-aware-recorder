import type { Frame, Stage, StageContext } from '@saraudio/core';
import { int16ToFloat32, rms } from '@saraudio/utils';

export interface EnergyVadOptions {
  thresholdDb?: number;
  floorDb?: number;
  ceilingDb?: number;
  smoothMs?: number;
  minRms?: number;
}

interface VadState {
  hasValue: boolean;
  smoothedDb: number;
  lastTs: number;
}

const createInitialState = (): VadState => ({
  hasValue: false,
  smoothedDb: 0,
  lastTs: 0,
});

export function createEnergyVadStage(options: EnergyVadOptions = {}): Stage {
  const thresholdDb = options.thresholdDb ?? -50;
  const floorDb = options.floorDb ?? -100;
  const ceilingDb = options.ceilingDb ?? 0;
  const smoothMs = Math.max(1, options.smoothMs ?? 50);
  const minRms = options.minRms ?? 1e-4;

  let context: StageContext | null = null;
  let state: VadState = createInitialState();

  const toFloat32 = (pcm: Frame['pcm']): Float32Array => (pcm instanceof Float32Array ? pcm : int16ToFloat32(pcm));

  const updateSmoothedDb = (currentDb: number, tsMs: number): number => {
    if (!state.hasValue) {
      state = { hasValue: true, smoothedDb: currentDb, lastTs: tsMs };
      return currentDb;
    }
    const deltaMs = Math.max(1, tsMs - state.lastTs);
    const weight = Math.min(1, deltaMs / smoothMs);
    const smoothed = state.smoothedDb + (currentDb - state.smoothedDb) * weight;
    state = { hasValue: true, smoothedDb: smoothed, lastTs: tsMs };
    return smoothed;
  };

  return {
    name: 'vad-energy',
    setup(ctx) {
      context = ctx;
      state = createInitialState();
    },
    handle(frame) {
      if (!context) return;
      const float = toFloat32(frame.pcm);
      const energy = rms(float);
      const clamped = Math.max(energy, minRms);
      const currentDb = 20 * Math.log10(clamped);
      const smoothedDb = updateSmoothedDb(currentDb, frame.tsMs);

      const score = Math.min(1, Math.max(0, (smoothedDb - floorDb) / (ceilingDb - floorDb)));
      const speech = smoothedDb >= thresholdDb;

      context.emit('vad', { tsMs: frame.tsMs, score, speech });
    },
    flush() {
      // nothing to flush
    },
    teardown() {
      state = createInitialState();
      context = null;
    },
  };
}
