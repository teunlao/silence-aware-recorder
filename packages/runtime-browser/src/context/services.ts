import { createLogger, noopLogger } from '@saraudio/utils';
import type { RuntimeServiceOverrides, RuntimeServices } from '../types';

const defaultClock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const defaultCreateId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(16).slice(2);

const createDefaultLogger = () => {
  // In production or when NODE_ENV is not set, use noopLogger
  const isDev =
    typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production' && process.env?.NODE_ENV !== undefined;

  if (!isDev) {
    return noopLogger;
  }

  return createLogger({
    level: 'debug',
    namespace: 'saraudio:runtime',
  });
};

export const createRuntimeServices = (overrides?: RuntimeServiceOverrides): RuntimeServices => {
  const logger = overrides?.logger ?? createDefaultLogger();
  const clock = overrides?.clock ?? defaultClock;
  const createId = overrides?.createId ?? defaultCreateId;

  return {
    logger,
    clock,
    createId,
  };
};
