import { float32ToInt16 } from '@saraudio/utils';
import type { Segment } from '../../types';

export class SegmentBuffer {
  private readonly chunks: Float32Array[] = [];

  clear(): void {
    this.chunks.length = 0;
  }

  append(frame: Float32Array): void {
    this.chunks.push(new Float32Array(frame));
  }

  appendRaw(buffer: Float32Array): void {
    this.chunks.push(new Float32Array(buffer));
  }

  isEmpty(): boolean {
    return this.chunks.length === 0;
  }

  buildSegment(params: {
    id: string;
    startMs: number;
    endMs: number;
    sampleRate: number;
    channels: number;
  }): Segment {
    const totalSamples = this.chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const pcmInt16 = new Int16Array(totalSamples);
    let offset = 0;
    for (let i = 0; i < this.chunks.length; i += 1) {
      const converted = float32ToInt16(this.chunks[i]);
      pcmInt16.set(converted, offset);
      offset += converted.length;
    }

    return {
      id: params.id,
      startMs: params.startMs,
      endMs: params.endMs,
      durationMs: Math.max(0, params.endMs - params.startMs),
      sampleRate: params.sampleRate,
      channels: params.channels,
      pcm: pcmInt16,
    };
  }
}

