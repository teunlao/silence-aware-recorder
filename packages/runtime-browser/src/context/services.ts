import type { RuntimeLogger, RuntimeServiceOverrides, RuntimeServices } from '../types';

const createDefaultLogger = (): RuntimeLogger => ({
  info: (...messages) => console.info('[saraudio]', ...messages),
  warn: (...messages) => console.warn('[saraudio]', ...messages),
  error: (...messages) => console.error('[saraudio]', ...messages),
});

const defaultClock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

const defaultCreateId = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(16).slice(2);

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
