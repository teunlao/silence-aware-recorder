import { describe, expect, it } from 'vitest';
import { DeepgramOptionsSchema, DeepgramOverridesSchema } from './schema';

describe('Deepgram schema', () => {
  it('accepts runtime options with getToken()', () => {
    const result = DeepgramOptionsSchema.safeParse({
      model: 'nova-3',
      auth: { getToken: async () => 'token' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unsupported model ids', () => {
    const result = DeepgramOptionsSchema.safeParse({
      model: 'not-a-real-model',
    });
    expect(result.success).toBe(false);
  });

  it('accepts JSON overrides', () => {
    const parsed = DeepgramOverridesSchema.parse({
      model: 'nova-3',
      query: { language: 'en', punctuate: true, channels: 1, empty: null },
    });
    expect(parsed.model).toBe('nova-3');
  });

  it('rejects functions in JSON overrides', () => {
    const result = DeepgramOverridesSchema.safeParse({
      model: 'nova-3',
      something: () => {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects logger in JSON overrides', () => {
    const result = DeepgramOverridesSchema.safeParse({
      logger: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects auth.getToken in JSON overrides', () => {
    const result = DeepgramOverridesSchema.safeParse({
      auth: { getToken: async () => 'token' },
    });
    expect(result.success).toBe(false);
  });
});
