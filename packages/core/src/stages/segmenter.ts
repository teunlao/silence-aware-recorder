import { FloatRingBuffer, int16ToFloat32 } from '@saraudio/utils';
import type { Stage, StageContext } from '../pipeline';
import type { Frame, VADScore } from '../types';
import { SegmentBuffer } from './support/segment-buffer';

export interface SegmenterOptions {
  preRollMs?: number;
  hangoverMs?: number;
}

interface SegmentState {
  active: boolean;
  id: string;
  startMs: number;
  pendingSilenceSince: number | null;
}

const createInitialState = (): SegmentState => ({
  active: false,
  id: '',
  startMs: 0,
  pendingSilenceSince: null,
});

export function createSegmenterStage(options: SegmenterOptions = {}): Stage {
  const preRollMs = options.preRollMs ?? 250;
  const hangoverMs = options.hangoverMs ?? 400;

  let context: StageContext | null = null;
  let unsubscribeVad: (() => void) | null = null;

  let sampleRate = 0;
  let channels = 0;
  let preRoll: FloatRingBuffer | null = null;
  const segmentBuffer = new SegmentBuffer();
  let state: SegmentState = createInitialState();

  const ensurePreRoll = (frame: Frame): void => {
    if (preRoll) return;
    sampleRate = frame.sampleRate;
    channels = frame.channels;
    const samplesPerMs = (sampleRate * channels) / 1000;
    const capacity = Math.max(1, Math.ceil(samplesPerMs * preRollMs));
    preRoll = new FloatRingBuffer(capacity);
  };

  const toFloat32 = (pcm: Frame['pcm']): Float32Array => (pcm instanceof Float32Array ? pcm : int16ToFloat32(pcm));

  const beginSegment = (tsMs: number): void => {
    if (!context) return;
    const id = context.createId();
    state = {
      active: true,
      id,
      startMs: tsMs,
      pendingSilenceSince: null,
    };
    segmentBuffer.clear();
    if (preRoll) {
      const snapshot = preRoll.toArray();
      if (snapshot.length > 0) segmentBuffer.appendRaw(snapshot);
    }
    context.emit('speechStart', { tsMs });
  };

  const finishSegment = (endMs: number): void => {
    if (!context || !state.active) return;
    const { id, startMs } = state;
    const segment = segmentBuffer.buildSegment({
      id,
      startMs,
      endMs,
      sampleRate,
      channels,
    });
    context.emit('speechEnd', { tsMs: endMs });
    context.emit('segment', segment);
    state = createInitialState();
    segmentBuffer.clear();
  };

  const handleVad = (score: VADScore): void => {
    if (!context) return;
    if (score.speech) {
      state.pendingSilenceSince = null;
      if (!state.active) beginSegment(score.tsMs);
    } else if (state.active && state.pendingSilenceSince === null) {
      state.pendingSilenceSince = score.tsMs;
    }
  };

  return {
    name: 'segmenter',
    setup(ctx) {
      context = ctx;
      unsubscribeVad = ctx.on('vad', handleVad);
    },
    handle(frame) {
      ensurePreRoll(frame);
      if (!preRoll) return;
      const float = toFloat32(frame.pcm);
      preRoll.write(float);
      if (!state.active) return;
      segmentBuffer.append(float);
      if (state.pendingSilenceSince !== null) {
        const elapsed = frame.tsMs - state.pendingSilenceSince;
        if (elapsed >= hangoverMs) finishSegment(frame.tsMs);
      }
    },
    flush() {
      if (!context || !state.active) return;
      const end = state.pendingSilenceSince ?? context.now();
      finishSegment(end);
    },
    teardown() {
      unsubscribeVad?.();
      unsubscribeVad = null;
      preRoll = null;
      segmentBuffer.clear();
      state = createInitialState();
      context = null;
    },
  };
}
