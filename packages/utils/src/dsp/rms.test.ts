import { describe, expect, it } from 'vitest';
import { rms } from './rms';

describe('rms', () => {
  it('returns 0 for empty array', () => {
    expect(rms(new Float32Array())).toBe(0);
  });

  it('computes sqrt(mean(square)) for values', () => {
    const values = new Float32Array([1, -1, 1, -1]);
    expect(rms(values)).toBeCloseTo(1, 6);
  });

  it('handles non-symmetric values', () => {
    const values = new Float32Array([0.5, 0.5, 0.5, -0.5]);
    expect(rms(values)).toBeCloseTo(Math.sqrt(0.25), 6);
  });
});
