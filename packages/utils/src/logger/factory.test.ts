import { describe, expect, it, vi } from 'vitest';
import { createLogger } from './factory';
import type { LogEntry } from './types';

describe('createLogger', () => {
  it('creates logger with default options', () => {
    const output = vi.fn();
    const logger = createLogger({ output });

    logger.info('test message');

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        namespace: 'saraudio',
        message: 'test message',
        context: undefined,
      }),
    );
  });

  it('filters messages by level', () => {
    const output = vi.fn();
    const logger = createLogger({ level: 'warn', output });

    logger.debug('debug msg');
    logger.info('info msg');
    logger.warn('warn msg');
    logger.error('error msg');

    expect(output).toHaveBeenCalledTimes(2);
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ level: 'warn' }));
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });

  it('supports lazy context evaluation', () => {
    const output = vi.fn();
    const logger = createLogger({ level: 'warn', output });

    const contextFactory = vi.fn(() => ({ expensive: 'computation' }));

    // Debug is below threshold, factory should NOT be called
    logger.debug('debug msg', contextFactory);
    expect(contextFactory).not.toHaveBeenCalled();

    // Warn is at threshold, factory SHOULD be called
    logger.warn('warn msg', contextFactory);
    expect(contextFactory).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'warn msg',
        context: { expensive: 'computation' },
      }),
    );
  });

  it('supports static context objects', () => {
    const output = vi.fn();
    const logger = createLogger({ output });

    logger.info('test', { foo: 'bar' });

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { foo: 'bar' },
      }),
    );
  });

  it('includes timestamp in log entry', () => {
    const output = vi.fn();
    const logger = createLogger({ output });

    const before = Date.now();
    logger.info('test');
    const after = Date.now();

    const call = output.mock.calls[0]?.[0] as LogEntry;
    expect(call.timestamp).toBeGreaterThanOrEqual(before);
    expect(call.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('Logger.child', () => {
  it('creates child logger with namespaced namespace', () => {
    const output = vi.fn();
    const parent = createLogger({ namespace: 'saraudio', output });
    const child = parent.child('vad');

    child.info('test');

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'saraudio:vad',
      }),
    );
  });

  it('supports nested child loggers', () => {
    const output = vi.fn();
    const root = createLogger({ namespace: 'saraudio', output });
    const child1 = root.child('pipeline');
    const child2 = child1.child('vad-energy');

    child2.info('test');

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'saraudio:pipeline:vad-energy',
      }),
    );
  });

  it('inherits log level from parent', () => {
    const output = vi.fn();
    const parent = createLogger({ level: 'error', output });
    const child = parent.child('test');

    child.debug('debug');
    child.info('info');
    child.warn('warn');
    child.error('error');

    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith(expect.objectContaining({ level: 'error' }));
  });

  it('inherits output function from parent', () => {
    const output = vi.fn();
    const parent = createLogger({ output });
    const child = parent.child('test');

    child.info('from child');

    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'from child',
      }),
    );
  });
});
