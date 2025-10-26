# Logger

Unified logging system for SARAUDIO packages.

## Principles

- **Abstraction**: No direct `console.*` usage in library code
- **Levels**: `debug` | `info` | `warn` | `error` | `silent`
- **Namespaces**: Hierarchical (`saraudio:pipeline:vad-energy`)
- **Environment-aware**: Guards for non-browser environments
- **Tree-shakeable**: `noopLogger` for production builds
- **Dependency Injection**: Logger passed through context/dependencies

## Basic Usage

```typescript
import { createLogger } from '@saraudio/utils';

const logger = createLogger({
  level: 'info',
  namespace: 'my-module',
});

logger.debug('Debug message');
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message');
```

## Lazy Context Evaluation

Use function factories to avoid expensive computations when log level is disabled:

```typescript
// ❌ BAD: Expensive computation runs even if debug is disabled
logger.debug('Frame processed', {
  rms: computeRMS(buffer),      // Always computed
  energy: computeEnergy(buffer), // Always computed
});

// ✅ GOOD: Computation only runs if debug level is enabled
logger.debug('Frame processed', () => ({
  rms: computeRMS(buffer),      // Only if shouldLog('debug')
  energy: computeEnergy(buffer), // Only if shouldLog('debug')
}));
```

Critical for hot-path code (VAD, AudioWorklet) where frames arrive every 30ms.

## Error Logging Convention

When logging errors, include both the error object and optional error code:

```typescript
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', {
    error,
    code: (error as any).code,
  });
}
```

This convention allows external systems to aggregate errors by code without coupling the logger to metrics.

## Child Loggers

Create namespaced child loggers using the `.child()` method:

```typescript
const parentLogger = createLogger({ namespace: 'saraudio' });
const childLogger = parentLogger.child('pipeline');

childLogger.info('Started'); // [saraudio:pipeline] Started

// Supports deep nesting:
const vadLogger = childLogger.child('vad-energy');
vadLogger.debug('Frame'); // [saraudio:pipeline:vad-energy] Frame
```

Child loggers automatically inherit `level` and `output` from parent through closure.

## Custom Output

Provide custom output function for non-console destinations:

```typescript
import { createLogger, type LogEntry } from '@saraudio/utils';

const logger = createLogger({
  output: (entry: LogEntry) => {
    // Send to custom destination
    myLoggingService.log(entry);
  },
});
```

## Production Builds

Use `noopLogger` for zero-overhead logging in production:

```typescript
import { noopLogger } from '@saraudio/utils';

const logger = import.meta.env.PROD ? noopLogger : createLogger({ level: 'debug' });
```

Tree-shaking will eliminate all logger code in production builds.

## Level Filtering

Levels are ordered by priority:

```
debug(0) < info(1) < warn(2) < error(3) < silent(4)
```

Setting `level: 'warn'` will only output `warn` and `error` messages.
