import { createReadStream as fsCreateReadStream } from 'node:fs';
import type { NodeFrameSource, Pcm16FileSourceOptions } from '../types';
import { createPcm16StreamSource } from './pcm16-stream-source';

export const createPcm16FileSource = (options: Pcm16FileSourceOptions): NodeFrameSource => {
  let innerSource: NodeFrameSource | null = null;

  return {
    async start(onFrame) {
      if (innerSource) {
        throw new Error('PCM16 file source already started');
      }
      const create = options.createReadStream ?? fsCreateReadStream;
      const stream = create(options.path);
      innerSource = createPcm16StreamSource({
        stream,
        sampleRate: options.sampleRate,
        channels: options.channels,
        frameSize: options.frameSize,
      });
      try {
        await innerSource.start(onFrame);
      } finally {
        await innerSource.stop();
        innerSource = null;
      }
    },
    async stop() {
      if (!innerSource) {
        return;
      }
      const source = innerSource;
      innerSource = null;
      await source.stop();
    },
  };
};
