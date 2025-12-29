import type { TranscriptionProvider } from '@saraudio/core';
import type { SonioxOptions } from './schema';

export type { SonioxOptions } from './schema';

export type SonioxProvider = TranscriptionProvider<SonioxOptions>;
