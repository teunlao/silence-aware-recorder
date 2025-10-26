import { describe, expect, it } from 'vitest';
import { createHysteresis } from './hysteresis';

describe('createHysteresis', () => {
  it('switches on above enter threshold and off below exit threshold', () => {
    const hysteresis = createHysteresis({ enterThreshold: 0.6, exitThreshold: 0.4 });
    expect(hysteresis(0.5, 0)).toBe(false);
    expect(hysteresis(0.7, 10)).toBe(true);
    expect(hysteresis(0.5, 20)).toBe(true);
    expect(hysteresis(0.3, 30)).toBe(false);
  });

  it('holds state for specified duration', () => {
    const hysteresis = createHysteresis({ enterThreshold: 0.5, exitThreshold: 0.3, holdMs: 100 });
    hysteresis(0.6, 0); // enters
    expect(hysteresis(0.2, 50)).toBe(true); // still on due to hold
    expect(hysteresis(0.2, 120)).toBe(false); // hold expired
  });
});

