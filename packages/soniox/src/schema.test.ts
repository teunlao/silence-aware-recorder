import { describe, expect, it } from 'vitest';
import { SonioxOptionsSchema, SonioxOverridesSchema } from './schema';

describe('Soniox schema', () => {
  it('accepts runtime options with getToken()', () => {
    const result = SonioxOptionsSchema.safeParse({
      model: 'stt-rt-v3',
      auth: { getToken: async () => 'token' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts JSON overrides', () => {
    const parsed = SonioxOverridesSchema.parse({
      model: 'stt-rt-v3',
      query: { language: 'en', diarization: true, channels: 1, empty: null },
    });
    expect(parsed.model).toBe('stt-rt-v3');
  });

  it('rejects functions in JSON overrides', () => {
    const result = SonioxOverridesSchema.safeParse({
      model: 'stt-rt-v3',
      something: () => {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects logger in JSON overrides', () => {
    const result = SonioxOverridesSchema.safeParse({
      logger: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects auth.getToken in JSON overrides', () => {
    const result = SonioxOverridesSchema.safeParse({
      auth: { getToken: async () => 'token' },
    });
    expect(result.success).toBe(false);
  });
});
