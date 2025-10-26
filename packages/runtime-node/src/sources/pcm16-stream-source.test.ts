import { describe, expect, it } from 'vitest';
import { Readable } from 'node:stream';
import { createPcm16StreamSource } from './pcm16-stream-source';

const toBuffer = (values: ReadonlyArray<number>): Buffer => {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => {
    buffer.writeInt16LE(value, index * 2);
  });
  return buffer;
};

describe('createPcm16StreamSource', () => {
  it('chunks PCM data into frames with padding for tail', async () => {
    const sampleRate = 16000;
    const channels = 1;
    const frameSize = 4;
    const values = [100, 200, 300, 400, 500, 600, 700];
    const stream = Readable.from([toBuffer(values.slice(0, 5)), toBuffer(values.slice(5))], {
      objectMode: false,
    });

    const source = createPcm16StreamSource({ stream, sampleRate, channels, frameSize });
    const frames: number[][] = [];

    await source.start((frame) => {
      frames.push(Array.from(frame.pcm));
    });
    await source.stop();

    expect(frames).toHaveLength(2);
    expect(frames[0]).toEqual([100, 200, 300, 400]);
    expect(frames[1]).toEqual([500, 600, 700, 0]);
  });
});
