import { vi } from 'vitest';

vi.stubGlobal('navigator', {
  mediaDevices: {
    getUserMedia: vi.fn(),
  },
});

if (typeof crypto === 'undefined') {
  vi.stubGlobal('crypto', {
    randomUUID: () => Math.random().toString(16).slice(2),
  });
}
