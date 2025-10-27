export type PCM = Float32Array | Int16Array;

export interface Frame {
  pcm: PCM;
  tsMs: number; // start timestamp of this frame in milliseconds, monotonic
  sampleRate: number; // samples per second
  channels: 1 | 2;
}

export interface VADScore {
  score: number; // 0..1 likelihood of speech
  speech: boolean; // current speech decision
  tsMs: number; // timestamp of this decision
}

export interface Segment {
  id: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  sampleRate: number;
  channels: number;
  pcm?: Int16Array; // optional packed PCM16 of the whole segment (preRoll included)
}

export interface MeterPayload {
  rms: number; // root mean square amplitude (0..1+)
  peak: number; // maximum absolute amplitude in frame (0..1+)
  db: number; // dBFS (decibels relative to full scale), typically -Infinity to 0
  tsMs: number; // timestamp of this measurement
}

export interface CoreError {
  code: string;
  message: string;
  cause?: unknown;
}

export interface Events {
  vad?: VADScore;
  segment?: Segment;
  speechStart?: { tsMs: number };
  speechEnd?: { tsMs: number };
  error?: CoreError;
}

export type CoreEventName = keyof Events;
