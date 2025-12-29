import type { Transport, UrlBuilder } from '@saraudio/core';
import { JsonPrimitiveSchema, JsonValueSchema } from '@saraudio/core/json';
import type { Logger } from '@saraudio/utils';
import { z } from 'zod';
import { DEEPGRAM_MODEL_DEFINITIONS, type DeepgramModelId } from './models';

type TokenProvider = () => Promise<string>;

type HeadersCallback = (ctx: { transport: Transport }) => Record<string, string> | Promise<Record<string, string>>;

const TokenProviderSchema = z.custom<TokenProvider>((value) => typeof value === 'function');

const UrlBuilderSchema = z.custom<UrlBuilder>((value) => typeof value === 'function');

const HeadersCallbackSchema = z.custom<HeadersCallback>((value) => typeof value === 'function');

const LoggerSchema = z.custom<Logger>((value) => !!value && typeof value === 'object');

const ProviderAuthSchema = z
  .object({
    getToken: TokenProviderSchema.optional(),
    token: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
  })
  .strict();

const ProviderAuthOverridesSchema = z
  .object({
    token: z.string().min(1).optional(),
    apiKey: z.string().min(1).optional(),
  })
  .strict();

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
    baseUrl: z.union([z.string().min(1), UrlBuilderSchema]).optional(),
    query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])).optional(),
    headers: z.union([z.record(z.string(), z.string()), HeadersCallbackSchema]).optional(),
    wsProtocols: z.array(z.string()).optional(),
    logger: LoggerSchema.optional(),

    model: DeepgramModelIdSchema,
    language: z.string().min(1).optional(),
    detectLanguage: z.boolean().optional(),
    interimResults: z.boolean().optional(),
    endpointingMs: z.union([z.number().positive(), z.literal(false)]).optional(),
    utteranceEndMs: z.number().positive().optional(),
    vadEvents: z.boolean().optional(),
    punctuate: z.boolean().optional(),
    profanityFilter: z.boolean().optional(),
    smartFormat: z.boolean().optional(),
    numerals: z.boolean().optional(),
    measurements: z.boolean().optional(),
    paragraphs: z.boolean().optional(),
    utterances: z.boolean().optional(),
    diarize: z.boolean().optional(),
    diarization: z.boolean().optional(),
    multichannel: z.boolean().optional(),
    channels: z.union([z.literal(1), z.literal(2)]).optional(),
    sampleRate: z.number().positive().optional(),
    encoding: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    keywords: z.union([z.array(KeywordInputSchema), z.record(z.string(), z.number())]).optional(),
    search: z.array(z.string()).optional(),
    replace: ReplaceInputSchema.optional(),
    keepaliveMs: z.number().positive().optional(),
    queueBudgetMs: z.number().positive().optional(),
  })
  .passthrough();

export type DeepgramOptions = z.infer<typeof DeepgramOptionsSchema>;

export const DeepgramOverridesSchema = z
  .object({
    auth: ProviderAuthOverridesSchema.optional(),
    baseUrl: z.string().min(1).optional(),
    query: z.record(z.string(), JsonPrimitiveSchema).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    wsProtocols: z.array(z.string()).optional(),
    logger: z.never().optional(),

    model: DeepgramModelIdSchema.optional(),
    language: z.string().min(1).optional(),
    detectLanguage: z.boolean().optional(),
    interimResults: z.boolean().optional(),
    endpointingMs: z.union([z.number().positive(), z.literal(false)]).optional(),
    utteranceEndMs: z.number().positive().optional(),
    vadEvents: z.boolean().optional(),
    punctuate: z.boolean().optional(),
    profanityFilter: z.boolean().optional(),
    smartFormat: z.boolean().optional(),
    numerals: z.boolean().optional(),
    measurements: z.boolean().optional(),
    paragraphs: z.boolean().optional(),
    utterances: z.boolean().optional(),
    diarize: z.boolean().optional(),
    diarization: z.boolean().optional(),
    multichannel: z.boolean().optional(),
    channels: z.union([z.literal(1), z.literal(2)]).optional(),
    sampleRate: z.number().positive().optional(),
    encoding: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    keywords: z.union([z.array(KeywordInputSchema), z.record(z.string(), z.number())]).optional(),
    search: z.array(z.string()).optional(),
    replace: ReplaceInputSchema.optional(),
    keepaliveMs: z.number().positive().optional(),
    queueBudgetMs: z.number().positive().optional(),
  })
  .catchall(JsonValueSchema);

export type DeepgramOverrides = z.infer<typeof DeepgramOverridesSchema>;

export const DEFAULT_DEEPGRAM_OVERRIDES: DeepgramOverrides = {
  model: 'nova-3',
};
