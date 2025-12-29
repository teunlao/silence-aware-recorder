import type { Transport, UrlBuilder } from '@saraudio/core';
import { JsonPrimitiveSchema, JsonValueSchema } from '@saraudio/core/json';
import type { Logger } from '@saraudio/utils';
import { z } from 'zod';
import { DEEPGRAM_MODEL_DEFINITIONS, type DeepgramModelId } from './models';

const DEEPGRAM_FIELD_DESCRIPTIONS = {
  auth: {
    group:
      'Authentication for Deepgram. Provide either an API key (project key) or a token (JWT/OAuth). For streaming WebSocket, auth is sent via WS subprotocols.',
    getToken:
      'Async callback that returns a Deepgram credential. Use for short-lived tokens (e.g. ephemeral JWT) that you refresh per session. Takes precedence over token/apiKey.',
    token:
      'Bearer token / JWT / OAuth access token. For WebSocket, the SDK sends it as WS subprotocols (bearer + token when it looks like a JWT; otherwise token + value). For HTTP, it is sent as `Authorization: Bearer ...`.',
    apiKey:
      'Deepgram API key (project key). For WebSocket, the SDK sends it as WS subprotocols (token + key). For HTTP, it is sent as `Authorization: Token ...`.',
  },
  baseUrl:
    'Override Deepgram endpoint URL. Default streaming endpoint: wss://api.deepgram.com/v1/listen. Use this for custom endpoints (EU/dedicated) or to switch between WSS/HTTPS listen endpoints.',
  query:
    'Extra query parameters appended to the request URL. Values are stringified; null/undefined are omitted. Prefer the typed fields below when possible (they map to official Deepgram parameters).',
  headers:
    'Additional HTTP headers for batch (HTTP) requests. Not used for WebSocket in browsers (custom WS headers are not supported); streaming auth uses WS subprotocols.',
  wsProtocols:
    'Additional WebSocket subprotocols. Auth subprotocols are injected automatically; extra values are appended (rare).',

  model:
    'Deepgram model id (required). You can list available models with `GET /v1/models`. Use `version` to pin a specific model version if needed.',
  language:
    'Language code (BCP-47). For multilingual models you can use `multi`. When `language` is set, Deepgram will ignore other languages.',
  detectLanguage:
    'Enable language detection (primarily supported on batch/selected endpoints). For streaming, prefer `language=multi` on multilingual models.',
  interimResults:
    'Return interim (partial) Results while speech is ongoing. Recommended for realtime UI and required for some segmentation features (e.g. UtteranceEnd).',
  endpointingMs:
    'Endpointing: automatically finalize after silence. Set a positive threshold in milliseconds (e.g. 300) or set `false` to disable.',
  utteranceEndMs:
    'Delay in milliseconds used to emit `UtteranceEnd` events (streaming). Use together with `interim_results=true` for utterance boundary events.',
  vadEvents: 'Enable VAD events (e.g. `SpeechStarted`) in streaming responses.',
  punctuate: 'Add punctuation and capitalization to transcripts.',
  profanityFilter: 'Filter profanity in transcripts.',
  smartFormat: 'Smart formatting: normalize dates, times, phone numbers, currency, etc. (model/endpoint dependent).',
  numerals: 'Convert spoken numbers to numerals (e.g. “one” → “1”).',
  measurements: 'Normalize measurement units (batch/model dependent).',
  paragraphs: 'Group output into paragraphs (primarily batch endpoints).',
  utterances:
    'Return utterance segmentation output (primarily batch endpoints). For streaming utterances, use `utterance_end_ms`.',
  diarize: 'Enable speaker diarization (speaker labels per word).',
  diarization: 'Alias for `diarize` (kept for compatibility).',
  multichannel:
    'Enable multichannel mode (separate transcripts per audio channel). Set true when sending multi-channel audio.',
  channels:
    'Number of audio channels (1 = mono, 2 = stereo). Must match the actual audio stream. If `multichannel` is true, channels defaults to 2 unless set explicitly.',
  sampleRate:
    'Audio sample rate in Hz. Required for raw audio (`encoding` specified). For container formats, Deepgram can infer this from container headers.',
  encoding:
    'Audio encoding name (Deepgram `encoding` parameter), e.g. linear16/opus/flac/mulaw/etc. For raw audio you must set the correct encoding and sampleRate.',
  version: 'Optional model version pin (as returned by `GET /v1/models`).',
  keywords:
    'Keyword boosting. Accepts a list of strings, a list of {term, boost} objects, or a record of term→boost. Boost values typically default to 1 when omitted.',
  search:
    'Search terms to scan for in transcripts. Deepgram can return match information when this is provided (endpoint/model dependent).',
  replace:
    'Text replacement rules applied by Deepgram. Provide either an array of {search, replace} rules or an object mapping `search` → `replace`.',
  keepaliveMs:
    'Client keepalive interval for streaming (milliseconds). Sends Deepgram KeepAlive messages to reduce idle disconnects. Note: Deepgram may still close the connection if it receives no audio for ~10s.',
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
    getToken: TokenProviderSchema.describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.getToken).optional(),
    token: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.token).optional(),
    apiKey: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.apiKey).optional(),
  })
  .strict()
  .describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.group);

const ProviderAuthOverridesSchema = z
  .object({
    token: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.token).optional(),
    apiKey: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.apiKey).optional(),
  })
  .strict()
  .describe(DEEPGRAM_FIELD_DESCRIPTIONS.auth.group);

export const DeepgramModelIdSchema = z.custom<DeepgramModelId>(
  (value) => typeof value === 'string' && value in DEEPGRAM_MODEL_DEFINITIONS,
);

const KeywordInputSchema = z.union([
  z.string(),
  z
    .object({
      term: z.string(),
      boost: z.number().optional(),
    })
    .strict(),
]);

const ReplaceRuleSchema = z
  .object({
    search: z.string(),
    replace: z.string(),
  })
  .strict();

const ReplaceInputSchema = z.union([z.array(ReplaceRuleSchema), z.record(z.string(), z.string())]);

export const DeepgramOptionsSchema = z
  .object({
    auth: ProviderAuthSchema.optional(),
    baseUrl: z
      .union([z.string().min(1), UrlBuilderSchema])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.baseUrl)
      .optional(),
    query: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]))
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.query)
      .optional(),
    headers: z
      .union([z.record(z.string(), z.string()), HeadersCallbackSchema])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.headers)
      .optional(),
    wsProtocols: z.array(z.string()).describe(DEEPGRAM_FIELD_DESCRIPTIONS.wsProtocols).optional(),
    logger: LoggerSchema.optional(),

    model: DeepgramModelIdSchema.describe(DEEPGRAM_FIELD_DESCRIPTIONS.model),
    language: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.language).optional(),
    detectLanguage: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.detectLanguage).optional(),
    interimResults: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.interimResults).optional(),
    endpointingMs: z
      .union([z.number().positive(), z.literal(false)])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.endpointingMs)
      .optional(),
    utteranceEndMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.utteranceEndMs).optional(),
    vadEvents: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.vadEvents).optional(),
    punctuate: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.punctuate).optional(),
    profanityFilter: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.profanityFilter).optional(),
    smartFormat: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.smartFormat).optional(),
    numerals: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.numerals).optional(),
    measurements: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.measurements).optional(),
    paragraphs: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.paragraphs).optional(),
    utterances: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.utterances).optional(),
    diarize: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.diarize).optional(),
    diarization: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.diarization).optional(),
    multichannel: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.multichannel).optional(),
    channels: z
      .union([z.literal(1), z.literal(2)])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.channels)
      .optional(),
    sampleRate: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.sampleRate).optional(),
    encoding: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.encoding).optional(),
    version: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.version).optional(),
    keywords: z
      .union([z.array(KeywordInputSchema), z.record(z.string(), z.number())])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.keywords)
      .optional(),
    search: z.array(z.string()).describe(DEEPGRAM_FIELD_DESCRIPTIONS.search).optional(),
    replace: ReplaceInputSchema.describe(DEEPGRAM_FIELD_DESCRIPTIONS.replace).optional(),
    keepaliveMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.keepaliveMs).optional(),
    queueBudgetMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.queueBudgetMs).optional(),
  })
  .passthrough();

export type DeepgramOptions = z.infer<typeof DeepgramOptionsSchema>;

export const DeepgramOverridesSchema = z
  .object({
    auth: ProviderAuthOverridesSchema.optional(),
    baseUrl: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.baseUrl).optional(),
    query: z.record(z.string(), JsonPrimitiveSchema).describe(DEEPGRAM_FIELD_DESCRIPTIONS.query).optional(),
    headers: z.record(z.string(), z.string()).describe(DEEPGRAM_FIELD_DESCRIPTIONS.headers).optional(),
    wsProtocols: z.array(z.string()).describe(DEEPGRAM_FIELD_DESCRIPTIONS.wsProtocols).optional(),
    logger: z.never().optional(),

    model: DeepgramModelIdSchema.describe(DEEPGRAM_FIELD_DESCRIPTIONS.model).optional(),
    language: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.language).optional(),
    detectLanguage: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.detectLanguage).optional(),
    interimResults: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.interimResults).optional(),
    endpointingMs: z
      .union([z.number().positive(), z.literal(false)])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.endpointingMs)
      .optional(),
    utteranceEndMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.utteranceEndMs).optional(),
    vadEvents: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.vadEvents).optional(),
    punctuate: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.punctuate).optional(),
    profanityFilter: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.profanityFilter).optional(),
    smartFormat: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.smartFormat).optional(),
    numerals: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.numerals).optional(),
    measurements: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.measurements).optional(),
    paragraphs: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.paragraphs).optional(),
    utterances: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.utterances).optional(),
    diarize: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.diarize).optional(),
    diarization: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.diarization).optional(),
    multichannel: z.boolean().describe(DEEPGRAM_FIELD_DESCRIPTIONS.multichannel).optional(),
    channels: z
      .union([z.literal(1), z.literal(2)])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.channels)
      .optional(),
    sampleRate: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.sampleRate).optional(),
    encoding: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.encoding).optional(),
    version: z.string().min(1).describe(DEEPGRAM_FIELD_DESCRIPTIONS.version).optional(),
    keywords: z
      .union([z.array(KeywordInputSchema), z.record(z.string(), z.number())])
      .describe(DEEPGRAM_FIELD_DESCRIPTIONS.keywords)
      .optional(),
    search: z.array(z.string()).describe(DEEPGRAM_FIELD_DESCRIPTIONS.search).optional(),
    replace: ReplaceInputSchema.describe(DEEPGRAM_FIELD_DESCRIPTIONS.replace).optional(),
    keepaliveMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.keepaliveMs).optional(),
    queueBudgetMs: z.number().positive().describe(DEEPGRAM_FIELD_DESCRIPTIONS.queueBudgetMs).optional(),
  })
  .catchall(JsonValueSchema);

export type DeepgramOverrides = z.infer<typeof DeepgramOverridesSchema>;

export const DEFAULT_DEEPGRAM_OVERRIDES: DeepgramOverrides = {
  model: 'nova-3',
};
