export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export type LogContext = Record<string, unknown> | (() => Record<string, unknown>);

export interface LogEntry {
  level: LogLevel;
  namespace: string;
  message: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(namespace: string): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  namespace?: string;
  output?: (entry: LogEntry) => void;
}
