import type { TranscriptResult } from '@saraudio/core';
import type { Logger } from '@saraudio/utils';
import { mergeHeaders, normalizeHeaders } from '@saraudio/utils';
import type { SonioxResolvedConfig } from './config';
import { sonioxTranscribeFile } from './files';
import type { SonioxHttpCreateTranscriptionRequest } from './SonioxHttpTranscriptionModel';

// Minimal batch transcription via Soniox REST API.
// Strategy: upload chunk → create job → poll → fetch transcript (batch flow).

export async function transcribeHTTP(
  resolved: SonioxResolvedConfig,
  audio: Blob | ArrayBuffer | Uint8Array,
  _options?: { language?: string; diarization?: boolean },
  _signal?: AbortSignal,
  logger?: Logger,
): Promise<TranscriptResult> {
  const provided =
    typeof resolved.raw.headers === 'function'
      ? await resolved.raw.headers({ transport: 'http' })
      : resolved.raw.headers;
  const headers = provided ? mergeHeaders({}, normalizeHeaders(provided)) : undefined;

  const translation: SonioxHttpCreateTranscriptionRequest['translation'] | undefined = resolved.raw.translation
    ? resolved.raw.translation.type === 'one_way'
      ? { type: 'one_way', target_language: resolved.raw.translation.targetLanguage }
      : {
          type: 'two_way',
          language_a: resolved.raw.translation.languageA,
          language_b: resolved.raw.translation.languageB,
        }
    : undefined;

  return await sonioxTranscribeFile(
    resolved,
    audio,
    {
      model: resolved.raw.model,
      language_hints: resolved.raw.languageHints,
      language_hints_strict: resolved.raw.languageHintsStrict,
      enable_speaker_diarization: resolved.raw.diarization,
      enable_language_identification: resolved.raw.languageIdentification,
      translation,
    },
    headers,
    logger,
  );
}
