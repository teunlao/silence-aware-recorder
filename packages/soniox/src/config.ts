import { clamp, normalizeChannels } from '@saraudio/utils';
import type { SonioxOptions } from './types';

export const DEFAULT_WS_URL = 'wss://stt-rt.soniox.com/transcribe-websocket';
export const DEFAULT_HTTP_BASE = 'https://api.soniox.com/v1';
export const DEFAULT_SAMPLE_RATE = 16_000;
export const DEFAULT_CHANNELS: 1 | 2 = 1;
export const DEFAULT_QUEUE_BUDGET_MS = 200;
export const QUEUE_MIN_MS = 100;
export const QUEUE_MAX_MS = 500;
// Soniox requires a keepalive message at least once every 20s when idle.
export const DEFAULT_WS_KEEPALIVE_MS = 15_000;
export const KEEPALIVE_MIN_MS = 1_000;
export const KEEPALIVE_MAX_MS = 18_000;

export interface SonioxResolvedConfig {
  raw: SonioxOptions;
  wsUrl: string;
  httpBase: string;
  sampleRate: number;
  channels: 1 | 2;
  audioFormat: string;
  queueBudgetMs: number;
  wsKeepaliveMs: number;
}

// clamp/normalizeChannels из @saraudio/utils

export function resolveConfig(options: SonioxOptions): SonioxResolvedConfig {
  const sampleRate = options.sampleRate ?? DEFAULT_SAMPLE_RATE;
  const channels = normalizeChannels(options.channels ?? DEFAULT_CHANNELS);
  const audioFormat = options.audioFormat ?? 'pcm_s16le';
  const queueBudgetMs = clamp(options.queueBudgetMs ?? DEFAULT_QUEUE_BUDGET_MS, QUEUE_MIN_MS, QUEUE_MAX_MS);
  const wsKeepaliveMs = clamp(options.wsKeepaliveMs ?? DEFAULT_WS_KEEPALIVE_MS, KEEPALIVE_MIN_MS, KEEPALIVE_MAX_MS);
  // Если задан baseUrl строкой, позволим ей переопределить дефолты транспорта, иначе оставим дефолты.
  const base = options.baseUrl;
  const wsUrl = typeof base === 'string' && base.startsWith('ws') ? base : DEFAULT_WS_URL;
  const httpBase =
    typeof base === 'string' && base.startsWith('http') && !base.startsWith('ws') ? base : DEFAULT_HTTP_BASE;
  return {
    raw: options,
    wsUrl,
    httpBase,
    sampleRate,
    channels,
    audioFormat,
    queueBudgetMs,
    wsKeepaliveMs,
  } satisfies SonioxResolvedConfig;
}
