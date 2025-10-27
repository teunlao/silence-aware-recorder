import type { MeterPayload, Pipeline } from '@saraudio/core';
import { useEffect, useState } from 'react';

export interface UseMeterOptions {
  pipeline: Pipeline;
  onMeter?: (payload: MeterPayload) => void;
}

export interface UseMeterResult {
  rms: number;
  peak: number;
  db: number;
}

const INITIAL_STATE: UseMeterResult = {
  rms: 0,
  peak: 0,
  db: -Infinity,
};

export const useMeter = (options: UseMeterOptions): UseMeterResult => {
  const { pipeline, onMeter } = options;
  const [meterState, setMeterState] = useState<UseMeterResult>(INITIAL_STATE);

  useEffect(() => {
    setMeterState(INITIAL_STATE);

    const unsubscribe = pipeline.events.on('meter', (payload: MeterPayload) => {
      onMeter?.(payload);
      setMeterState({
        rms: payload.rms,
        peak: payload.peak,
        db: payload.db,
      });
    });

    return () => {
      unsubscribe();
    };
  }, [pipeline, onMeter]);

  return meterState;
};
