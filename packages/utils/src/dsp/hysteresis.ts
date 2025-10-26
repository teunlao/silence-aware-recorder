export interface HysteresisOptions {
  enterThreshold: number;
  exitThreshold: number;
  holdMs?: number;
}

export interface HysteresisState {
  value: boolean;
  lastSwitchMs: number;
}

export function createHysteresis(options: HysteresisOptions) {
  const holdMs = options.holdMs ?? 0;
  const state: HysteresisState = { value: false, lastSwitchMs: 0 };

  return (sample: number, tsMs: number): boolean => {
    if (state.value) {
      const shouldHold = holdMs > 0 && tsMs - state.lastSwitchMs < holdMs;
      if (sample <= options.exitThreshold && !shouldHold) {
        state.value = false;
        state.lastSwitchMs = tsMs;
      }
    } else if (sample >= options.enterThreshold) {
      state.value = true;
      state.lastSwitchMs = tsMs;
    }
    return state.value;
  };
}
