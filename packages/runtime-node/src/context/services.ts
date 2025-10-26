import { randomUUID } from 'node:crypto';
import type { RuntimeLogger, RuntimeOptions, RuntimeServices } from '../types';

const createDefaultLogger = (): RuntimeLogger => ({
  info: (...messages) => console.info(...messages),
  warn: (...messages) => console.warn(...messages),
  error: (...messages) => console.error(...messages),
});

const defaultClock = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const defaultCreateId = () => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  const random = Math.random().toString(16).slice(2);
  return `segment-${random}`;
};

export const createRuntimeServices = (options?: RuntimeOptions): RuntimeServices => {
  const overrides = options?.services ?? {};

  const logger = overrides.logger ?? createDefaultLogger();
  const clock = overrides.clock ?? defaultClock;
  const createId = overrides.createId ?? defaultCreateId;

  return {
    logger,
    clock,
    createId,
  };
};
