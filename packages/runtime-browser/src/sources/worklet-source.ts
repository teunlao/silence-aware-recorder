import type { BrowserFrameSource, RuntimeLogger } from '../types';

export interface WorkletSourceConfig {
  constraints?: MediaStreamConstraints['audio'] | MediaTrackConstraints;
  ringBufferFrames: number;
  logger: RuntimeLogger;
  onStream?: (stream: MediaStream | null) => void;
}

export const createWorkletMicrophoneSource = (_config: WorkletSourceConfig): BrowserFrameSource => {
  throw new Error('AudioWorklet microphone source is not implemented yet');
};
