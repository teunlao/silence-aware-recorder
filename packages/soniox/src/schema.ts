import type { Transport, UrlBuilder } from '@saraudio/core';
import { JsonPrimitiveSchema, JsonValueSchema } from '@saraudio/core/json';
import type { Logger } from '@saraudio/utils';
import { z } from 'zod';
import { SONIOX_MODEL_DEFINITIONS, type SonioxModelId } from './models';

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

export const SonioxModelIdSchema = z.custom<SonioxModelId>(
  (value) => typeof value === 'string' && value in SONIOX_MODEL_DEFINITIONS,
);

export const SonioxOptionsSchema = z
  .object({
    auth: ProviderAuthSchema.optional(),
    baseUrl: z.union([z.string().min(1), UrlBuilderSchema]).optional(),
    query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])).optional(),
    headers: z.union([z.record(z.string(), z.string()), HeadersCallbackSchema]).optional(),
    wsProtocols: z.array(z.string()).optional(),
    logger: LoggerSchema.optional(),

    model: SonioxModelIdSchema,
    sampleRate: z.number().positive().optional(),
    channels: z.union([z.literal(1), z.literal(2)]).optional(),
    audioFormat: z.string().optional(),
    languageHints: z.array(z.string()).optional(),
    diarization: z.boolean().optional(),
    endpointDetection: z.boolean().optional(),
    languageIdentification: z.boolean().optional(),
    queueBudgetMs: z.number().positive().optional(),
  })
  .passthrough();

export type SonioxOptions = z.infer<typeof SonioxOptionsSchema>;

export const SonioxOverridesSchema = z
  .object({
    auth: ProviderAuthOverridesSchema.optional(),
    baseUrl: z.string().min(1).optional(),
    query: z.record(z.string(), JsonPrimitiveSchema).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    wsProtocols: z.array(z.string()).optional(),
    logger: z.never().optional(),

    model: SonioxModelIdSchema.optional(),
    sampleRate: z.number().positive().optional(),
    channels: z.union([z.literal(1), z.literal(2)]).optional(),
    audioFormat: z.string().optional(),
    languageHints: z.array(z.string()).optional(),
    diarization: z.boolean().optional(),
    endpointDetection: z.boolean().optional(),
    languageIdentification: z.boolean().optional(),
    queueBudgetMs: z.number().positive().optional(),
  })
  .catchall(JsonValueSchema);

export type SonioxOverrides = z.infer<typeof SonioxOverridesSchema>;

export const DEFAULT_SONIOX_OVERRIDES: SonioxOverrides = {
  model: 'stt-rt-v3',
};
