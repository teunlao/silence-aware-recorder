import type { LogEntry, Logger } from './types';

export function defaultOutput(entry: LogEntry): void {
  if (typeof console === 'undefined') {
    return;
  }

  const prefix = `[${entry.namespace}]`;
  const args = entry.context ? [prefix, entry.message, entry.context] : [prefix, entry.message];

  switch (entry.level) {
    case 'debug':
      if (typeof console.debug === 'function') {
        console.debug(...args);
      } else {
        console.log(...args);
      }
      break;
    case 'info':
      console.info(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => noopLogger,
};
