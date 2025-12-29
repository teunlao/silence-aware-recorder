import type { TranscriptionProvider } from '@saraudio/core';
import type { DeepgramOptions } from './schema';

export type { DeepgramOptions } from './schema';

/** Public Deepgram provider contract for SARAUDIO. */
export type DeepgramProvider = TranscriptionProvider<DeepgramOptions>;
