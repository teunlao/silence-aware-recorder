import { defaultOutput } from './outputs';
import type { LogContext, LogEntry, Logger, LoggerOptions, LogLevel } from './types';

const levelPriority: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const { level = 'info', namespace = 'saraudio', output = defaultOutput } = options;

  const minPriority = levelPriority[level];

  const shouldLog = (logLevel: LogLevel): boolean => {
    return levelPriority[logLevel] >= minPriority;
  };

  const log = (logLevel: LogLevel, message: string, context?: LogContext): void => {
    if (!shouldLog(logLevel)) {
      return;
    }

    const resolvedContext = typeof context === 'function' ? context() : context;

    const entry: LogEntry = {
      level: logLevel,
      namespace,
      message,
      context: resolvedContext,
      timestamp: Date.now(),
    };

    output(entry);
  };

  return {
    debug: (msg, ctx) => log('debug', msg, ctx),
    info: (msg, ctx) => log('info', msg, ctx),
    warn: (msg, ctx) => log('warn', msg, ctx),
    error: (msg, ctx) => log('error', msg, ctx),
    child: (childNamespace: string) =>
      createLogger({
        level,
        namespace: `${namespace}:${childNamespace}`,
        output,
      }),
  };
}
