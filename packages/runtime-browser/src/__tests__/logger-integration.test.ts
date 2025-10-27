import { createLogger, noopLogger } from '@saraudio/utils';
import { describe, expect, it, vi } from 'vitest';
import { createRuntimeServices } from '../context/services';

describe('Logger integration', () => {
  it('uses noopLogger in production by default', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const services = createRuntimeServices();

    // Should be noopLogger
    expect(services.logger).toBe(noopLogger);

    process.env.NODE_ENV = originalEnv;
  });

  it('uses debug logger in development by default', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const services = createRuntimeServices();

    // Dev logger should be a real logger instance, not noop
    expect(services.logger).not.toBe(noopLogger);
    expect(typeof services.logger.debug).toBe('function');
    expect(typeof services.logger.child).toBe('function');

    process.env.NODE_ENV = originalEnv;
  });

  it('accepts custom logger via overrides', () => {
    const customLogger = createLogger({
      level: 'error',
      namespace: 'custom',
    });

    const services = createRuntimeServices({ logger: customLogger });

    expect(services.logger).toBe(customLogger);
  });

  it('logger supports lazy context evaluation', () => {
    const output = vi.fn();
    const logger = createLogger({
      level: 'warn',
      output,
    });

    const expensiveComputation = vi.fn(() => ({ foo: 'bar' }));

    // Debug is below threshold - factory should NOT be called
    logger.debug('debug msg', expensiveComputation);
    expect(expensiveComputation).not.toHaveBeenCalled();

    // Warn is at threshold - factory SHOULD be called
    logger.warn('warn msg', expensiveComputation);
    expect(expensiveComputation).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'warn',
        message: 'warn msg',
        context: { foo: 'bar' },
      }),
    );
  });
});
