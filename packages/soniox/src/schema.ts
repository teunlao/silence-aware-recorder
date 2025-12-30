import type { Transport, UrlBuilder } from '@saraudio/core';
import { JsonPrimitiveSchema, JsonValueSchema } from '@saraudio/core/json';
import type { Logger } from '@saraudio/utils';
import { z } from 'zod';
import { SONIOX_MODEL_DEFINITIONS, type SonioxModelId } from './models';

const SONIOX_FIELD_DESCRIPTIONS = {
  auth: {
    group:
      'Authentication for Soniox. Provide either a short-lived token (recommended for client apps) or a long-lived API key.',
    getToken:
      'Async callback that returns a short-lived Soniox credential (e.g. a temporary API key created via Soniox Auth API). Takes precedence over token/apiKey.',
    token:
      'Short-lived token / temporary API key. Sent as `api_key` in the realtime WebSocket init message (and used for REST as a Bearer token when applicable). Overrides apiKey.',
    apiKey:
      'Long-lived Soniox API key. Sent as `api_key` in the realtime WebSocket init message (and used for REST as a Bearer token).',
  },
  baseUrl:
    'Override Soniox endpoints. Use a WSS URL for realtime (default: wss://stt-rt.soniox.com/transcribe-websocket) or an HTTPS URL for REST (default: https://api.soniox.com/v1). If the value starts with `ws`, it overrides the realtime endpoint; if it starts with `http`, it overrides the REST base.',
  query:
    'Extra query parameters appended to the realtime WebSocket URL. Values are stringified; null/undefined are omitted. Most Soniox realtime options are sent in the init JSON, not as URL params.',
  headers:
    'Additional HTTP headers to include in REST requests (batch/file flows). Not used for WebSocket in browsers (custom WS headers are not supported).',
  wsProtocols: 'Additional WebSocket subprotocols. Most Soniox integrations do not need this.',

  model:
    'Soniox model id to use for transcription (e.g. `stt-rt-v3`). You can list available models via Soniox REST `GET /v1/models`.',
  sampleRate:
    'Audio sample rate in Hz. Required for raw audio formats; for containerized audio (`audioFormat: "auto"`) Soniox can infer this from container headers.',
  channels:
    'Number of audio channels (1 = mono, 2 = stereo). Sent as `num_channels` in the realtime init message and must match the actual audio stream.',
  audioFormat:
    'Audio format for Soniox realtime (`audio_format`). Use `auto` for containerized audio (wav/mp3/webm/etc). For raw PCM/codecs (e.g. pcm_s16le) you must provide sampleRate and channels.',
  languageHints:
    'Optional list of ISO language codes to bias recognition. This is a hint/prioritization (not a hard restriction).',
  languageHintsStrict:
    'When true, Soniox relies more on language_hints to restrict the recognized language (best-effort; see Soniox language restrictions docs).',
  translation:
    'Optional realtime/batch translation configuration. One-way: { type: "one_way", targetLanguage }. Two-way: { type: "two_way", languageA, languageB }.',
  diarization: 'Enable speaker diarization (adds speaker labels to tokens; Soniox supports up to ~15 speakers).',
  endpointDetection:
    'Enable endpoint detection (end-of-utterance). When triggered, Soniox finalizes accumulated tokens and emits an `<end>` marker.',
  languageIdentification:
    'Enable language identification for multilingual audio. Tokens may include detected language metadata.',
  queueBudgetMs:
    'Client-side backpressure budget (milliseconds of audio buffered before dropping oldest frames). Lower values reduce latency; higher values reduce drops but increase latency. Clamped to a safe range by the SDK.',
} as const;

type TokenProvider = () => Promise<string>;

type HeadersCallback = (ctx: { transport: Transport }) => Record<string, string> | Promise<Record<string, string>>;

const TokenProviderSchema = z.custom<TokenProvider>((value) => typeof value === 'function');

const UrlBuilderSchema = z.custom<UrlBuilder>((value) => typeof value === 'function');

const HeadersCallbackSchema = z.custom<HeadersCallback>((value) => typeof value === 'function');

const LoggerSchema = z.custom<Logger>((value) => !!value && typeof value === 'object');

const ProviderAuthSchema = z
  .object({
    getToken: TokenProviderSchema.describe(SONIOX_FIELD_DESCRIPTIONS.auth.getToken).optional(),
    token: z.string().min(1).describe(SONIOX_FIELD_DESCRIPTIONS.auth.token).optional(),
    apiKey: z.string().min(1).describe(SONIOX_FIELD_DESCRIPTIONS.auth.apiKey).optional(),
  })
  .strict()
  .describe(SONIOX_FIELD_DESCRIPTIONS.auth.group);

const ProviderAuthOverridesSchema = z
  .object({
    token: z.string().min(1).describe(SONIOX_FIELD_DESCRIPTIONS.auth.token).optional(),
    apiKey: z.string().min(1).describe(SONIOX_FIELD_DESCRIPTIONS.auth.apiKey).optional(),
  })
  .strict()
  .describe(SONIOX_FIELD_DESCRIPTIONS.auth.group);

export const SonioxModelIdSchema = z.custom<SonioxModelId>(
  (value) => typeof value === 'string' && value in SONIOX_MODEL_DEFINITIONS,
);

export const SonioxOptionsSchema = z
  .object({
    auth: ProviderAuthSchema.optional(),
    baseUrl: z
      .union([z.string().min(1), UrlBuilderSchema])
      .describe(SONIOX_FIELD_DESCRIPTIONS.baseUrl)
      .optional(),
    query: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]))
      .describe(SONIOX_FIELD_DESCRIPTIONS.query)
      .optional(),
    headers: z
      .union([z.record(z.string(), z.string()), HeadersCallbackSchema])
      .describe(SONIOX_FIELD_DESCRIPTIONS.headers)
      .optional(),
    wsProtocols: z.array(z.string()).describe(SONIOX_FIELD_DESCRIPTIONS.wsProtocols).optional(),
    logger: LoggerSchema.optional(),

    model: SonioxModelIdSchema.describe(SONIOX_FIELD_DESCRIPTIONS.model),
    sampleRate: z.number().positive().describe(SONIOX_FIELD_DESCRIPTIONS.sampleRate).optional(),
    channels: z
      .union([z.literal(1), z.literal(2)])
      .describe(SONIOX_FIELD_DESCRIPTIONS.channels)
      .optional(),
    audioFormat: z.string().describe(SONIOX_FIELD_DESCRIPTIONS.audioFormat).optional(),
    languageHints: z.array(z.string()).describe(SONIOX_FIELD_DESCRIPTIONS.languageHints).optional(),
    languageHintsStrict: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.languageHintsStrict).optional(),
    translation: z
      .union([
        z
          .object({
            type: z.literal('one_way'),
            targetLanguage: z.string().min(1),
          })
          .strict(),
        z
          .object({
            type: z.literal('two_way'),
            languageA: z.string().min(1),
            languageB: z.string().min(1),
          })
          .strict(),
      ])
      .describe(SONIOX_FIELD_DESCRIPTIONS.translation)
      .optional(),
    diarization: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.diarization).optional(),
    endpointDetection: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.endpointDetection).optional(),
    languageIdentification: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.languageIdentification).optional(),
    queueBudgetMs: z.number().positive().describe(SONIOX_FIELD_DESCRIPTIONS.queueBudgetMs).optional(),
  })
  .passthrough();

export type SonioxOptions = z.infer<typeof SonioxOptionsSchema>;

export const SonioxOverridesSchema = z
  .object({
    auth: ProviderAuthOverridesSchema.optional(),
    baseUrl: z.string().min(1).describe(SONIOX_FIELD_DESCRIPTIONS.baseUrl).optional(),
    query: z.record(z.string(), JsonPrimitiveSchema).describe(SONIOX_FIELD_DESCRIPTIONS.query).optional(),
    headers: z.record(z.string(), z.string()).describe(SONIOX_FIELD_DESCRIPTIONS.headers).optional(),
    wsProtocols: z.array(z.string()).describe(SONIOX_FIELD_DESCRIPTIONS.wsProtocols).optional(),
    logger: z.never().optional(),

    model: SonioxModelIdSchema.describe(SONIOX_FIELD_DESCRIPTIONS.model).optional(),
    sampleRate: z.number().positive().describe(SONIOX_FIELD_DESCRIPTIONS.sampleRate).optional(),
    channels: z
      .union([z.literal(1), z.literal(2)])
      .describe(SONIOX_FIELD_DESCRIPTIONS.channels)
      .optional(),
    audioFormat: z.string().describe(SONIOX_FIELD_DESCRIPTIONS.audioFormat).optional(),
    languageHints: z.array(z.string()).describe(SONIOX_FIELD_DESCRIPTIONS.languageHints).optional(),
    languageHintsStrict: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.languageHintsStrict).optional(),
    translation: z
      .union([
        z
          .object({
            type: z.literal('one_way'),
            targetLanguage: z.string().min(1),
          })
          .strict(),
        z
          .object({
            type: z.literal('two_way'),
            languageA: z.string().min(1),
            languageB: z.string().min(1),
          })
          .strict(),
      ])
      .describe(SONIOX_FIELD_DESCRIPTIONS.translation)
      .optional(),
    diarization: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.diarization).optional(),
    endpointDetection: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.endpointDetection).optional(),
    languageIdentification: z.boolean().describe(SONIOX_FIELD_DESCRIPTIONS.languageIdentification).optional(),
    queueBudgetMs: z.number().positive().describe(SONIOX_FIELD_DESCRIPTIONS.queueBudgetMs).optional(),
  })
  .catchall(JsonValueSchema);

export type SonioxOverrides = z.infer<typeof SonioxOverridesSchema>;

export const DEFAULT_SONIOX_OVERRIDES: SonioxOverrides = {
  model: 'stt-rt-v3',
};
