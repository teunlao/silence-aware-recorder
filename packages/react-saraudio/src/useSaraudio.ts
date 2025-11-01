import type { Pipeline, Segment } from '@saraudio/core';
import type { BrowserRuntime, MicrophoneSourceOptions, RuntimeMode } from '@saraudio/runtime-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSaraudioFallbackReason, useSaraudioRuntime } from './context';
import { useMeter } from './useMeter';
import { useSaraudioMicrophone } from './useSaraudioMicrophone';
import { useSaraudioPipeline } from './useSaraudioPipeline';

function shallowEqual(a: VadOptions, b: VadOptions): boolean {
  const keysA = Object.keys(a) as (keyof VadOptions)[];
  const keysB = Object.keys(b) as (keyof VadOptions)[];
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export interface VadOptions {
  thresholdDb?: number;
  smoothMs?: number;
  floorDb?: number;
  ceilingDb?: number;
}

export interface UseSaraudioOptions {
  vad?: boolean | VadOptions;
  meter?: boolean;
  segmenter?: { preRollMs?: number; hangoverMs?: number };
  constraints?: MicrophoneSourceOptions['constraints'];
  mode?: RuntimeMode;
  runtime?: BrowserRuntime;
  autoStart?: boolean;
}

export interface UseSaraudioResult {
  status: 'idle' | 'acquiring' | 'running' | 'stopping' | 'error';
  error: Error | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  vad: { isSpeech: boolean; score: number } | null;
  levels: { rms: number; peak: number; db: number } | null;
  segments: readonly Segment[];
  clearSegments: () => void;
  fallbackReason: string | null;
  pipeline: Pipeline;
}

/**
 * Simple DX: All-in-one hook for SARAUDIO.
 * Manages runtime, pipeline, stages, and microphone automatically.
 *
 * **Plugin dependencies**: VAD and Meter stages are loaded dynamically from optional peer dependencies.
 * If a plugin is not installed, an error will be returned with installation instructions:
 * - VAD: `pnpm add @saraudio/vad-energy`
 * - Meter: `pnpm add @saraudio/meter`
 *
 * @example
 * ```tsx
 * const { status, start, stop, vad, levels } = useSaraudio({
 *   vad: { thresholdDb: -50, smoothMs: 30 },
 *   meter: true,
 *   constraints: { channelCount: 1, sampleRate: 16000 }
 * });
 * ```
 */
export function useSaraudio(options: UseSaraudioOptions = {}): UseSaraudioResult {
  const {
    vad: vadOptions,
    meter: meterEnabled,
    segmenter,
    constraints,
    mode,
    runtime: runtimeOverride,
    autoStart,
  } = options;

  const contextRuntime = useSaraudioRuntime(runtimeOverride);
  const fallbackReason = useSaraudioFallbackReason();
  const hookIdRef = useRef(`hs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [vadStage, setVadStage] = useState<ReturnType<
    typeof import('@saraudio/vad-energy').createEnergyVadStage
  > | null>(null);
  const [meterStage, setMeterStage] = useState<ReturnType<
    typeof import('@saraudio/meter').createAudioMeterStage
  > | null>(null);

  const vadEnabled = !!vadOptions;
  const vadTriedRef = useRef(false);
  const meterTriedRef = useRef(false);
  const vadImportSeqRef = useRef(0);
  const meterImportSeqRef = useRef(0);

  // Create/destroy VAD stage when enabled/disabled (NOT on config changes)
  // biome-ignore lint/correctness/useExhaustiveDependencies: vadOptions intentionally omitted, config updates via separate hot-update effect
  useEffect(() => {
    console.log('[vad] EFFECT', { hookId: hookIdRef.current, vadEnabled, tried: vadTriedRef.current });
    if (typeof window === 'undefined') return;

    if (vadEnabled) {
      if (!vadTriedRef.current) {
        vadTriedRef.current = true;
        vadImportSeqRef.current += 1;
        const seq = vadImportSeqRef.current;
        console.log('[vad] CREATING', { hookId: hookIdRef.current, seq });

        import('@saraudio/vad-energy')
          .then((module) => {
            const late = seq !== vadImportSeqRef.current;
            console.log('[vad] IMPORT_RESOLVED', { hookId: hookIdRef.current, seq, late });
            const { createEnergyVadStage } = module;
            const vadConfig = vadOptions === true ? {} : vadOptions;
            console.log('[vad] CREATED', { hookId: hookIdRef.current, seq, late });
            setVadStage(createEnergyVadStage(vadConfig));
          })
          .catch(() => {
            console.log('[vad] IMPORT_FAILED', { hookId: hookIdRef.current, seq: vadImportSeqRef.current });
            setLoadError(
              (prev) => prev ?? new Error('VAD plugin not found. Install it: pnpm add @saraudio/vad-energy'),
            );
            setVadStage(null);
          });
      }
    } else {
      setVadStage(null);
      vadTriedRef.current = false;
    }
  }, [vadEnabled]);

  // Create/destroy Meter stage when enabled/disabled
  useEffect(() => {
    console.log('[meter] EFFECT', { hookId: hookIdRef.current, meterEnabled, tried: meterTriedRef.current });
    if (typeof window === 'undefined') return;

    if (meterEnabled) {
      if (!meterTriedRef.current) {
        meterTriedRef.current = true;
        meterImportSeqRef.current += 1;
        const seq = meterImportSeqRef.current;
        console.log('[meter] CREATING', { hookId: hookIdRef.current, seq });

        import('@saraudio/meter')
          .then((module) => {
            const late = seq !== meterImportSeqRef.current;
            console.log('[meter] IMPORT_RESOLVED', { hookId: hookIdRef.current, seq, late });
            const { createAudioMeterStage } = module;
            console.log('[meter] CREATED', { hookId: hookIdRef.current, seq, late });
            setMeterStage(createAudioMeterStage());
          })
          .catch(() => {
            console.log('[meter] IMPORT_FAILED', { hookId: hookIdRef.current, seq });
            setLoadError((prev) => prev ?? new Error('Meter plugin not found. Install it: pnpm add @saraudio/meter'));
            setMeterStage(null);
          });
      }
    } else {
      setMeterStage(null);
      meterTriedRef.current = false;
    }
  }, [meterEnabled]);

  const vadConfig = useMemo(() => {
    if (!vadOptions || vadOptions === true) return {};
    return vadOptions;
  }, [vadOptions]);

  const prevVadConfigRef = useRef<VadOptions>(vadConfig);

  // Hot-update VAD config when options change (without recreating stage)
  useEffect(() => {
    if (!vadStage) return;
    if ('updateConfig' in vadStage && typeof vadStage.updateConfig === 'function') {
      // Only call updateConfig if values actually changed (shallow-equal check)
      // Skip first call since stage is already created with initial config
      if (!shallowEqual(prevVadConfigRef.current, vadConfig)) {
        vadStage.updateConfig(vadConfig);
        prevVadConfigRef.current = vadConfig;
      }
    }
  }, [vadStage, vadConfig]);

  const stages = useMemo(() => {
    const result = [];
    if (vadStage) result.push(vadStage);
    if (meterStage) result.push(meterStage);
    console.log('[stages] MEMO', { count: result.length, hasVad: !!vadStage, hasMeter: !!meterStage });
    return result;
  }, [vadStage, meterStage]);

  // Create pipeline
  const { pipeline, isSpeech, lastVad, segments, clearSegments } = useSaraudioPipeline({
    stages,
    segmenter,
    retainSegments: 10,
    runtime: contextRuntime,
  });

  // Get meter levels
  const meterLevels = useMeter({ pipeline });

  // Microphone control
  const {
    status,
    error: micError,
    start: micStart,
    stop: micStop,
  } = useSaraudioMicrophone({
    pipeline,
    runtime: contextRuntime,
    constraints,
    mode,
    // Start is safe anytime; pipeline buffers until configured
    autoStart: Boolean(autoStart),
  });

  // Wrap start to wait until stages are ready if needed
  // Combine errors
  const error = loadError || micError;

  // VAD state
  const vad = lastVad ? { isSpeech, score: lastVad.score } : null;

  // Meter state
  const levels = meterEnabled ? meterLevels : null;

  return {
    status,
    error,
    start: micStart,
    stop: micStop,
    vad,
    levels,
    segments,
    clearSegments,
    fallbackReason,
    pipeline,
  };
}
