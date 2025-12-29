import { defineProvider } from '@saraudio/core';
import type { Logger } from '@saraudio/utils';
import { normalizeChannels } from '@saraudio/utils';
import { resolveConfig } from './config';
import { SUPPORTED_FORMATS } from './models';
import { DeepgramOptionsSchema } from './schema';
import { transcribeHTTP } from './transport-http';
import { createWsStream } from './transport-ws';
import type { DeepgramOptions, DeepgramProvider } from './types';

export function deepgram(options: DeepgramOptions): DeepgramProvider {
  const validated = DeepgramOptionsSchema.parse(options);
  const logger: Logger | undefined = validated.logger ? validated.logger.child('provider-deepgram') : undefined;
  let config = resolveConfig(validated);
  const listeners = new Set<(opts: DeepgramOptions) => void>();

  return defineProvider({
    id: 'deepgram',
    capabilities: {
      partials: 'mutable',
      words: true,
      diarization: 'word',
      language: 'final',
      segments: true,
      forceEndpoint: false,
      multichannel: true,
      translation: 'none',
      transports: { http: true, websocket: true },
    },
    get tokenProvider() {
      return config.raw.auth?.getToken;
    },
    getPreferredFormat() {
      return { sampleRate: config.sampleRate, channels: config.channels, encoding: 'pcm16' } as const;
    },
    getSupportedFormats() {
      return SUPPORTED_FORMATS;
    },
    negotiateFormat(candidate) {
      const sampleRate = candidate.sampleRate ?? config.sampleRate;
      const channels = normalizeChannels(candidate.channels ?? config.channels);
      return { sampleRate, channels, encoding: 'pcm16' } as const;
    },
    async update(next) {
      const validatedNext = DeepgramOptionsSchema.parse(next);
      config = resolveConfig(validatedNext);
      listeners.forEach((l) => l(validatedNext));
    },
    onUpdate(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // WebSocket live stream
    stream() {
      return createWsStream(config, logger);
    },
    // HTTP batch transcription
    async transcribe(audio, batchOptions, signal) {
      return await transcribeHTTP(config.raw, audio, batchOptions, signal, logger);
    },
  });
}
