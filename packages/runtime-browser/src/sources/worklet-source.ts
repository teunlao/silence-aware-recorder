import type { Logger } from '@saraudio/utils';
import type { BrowserFrameSource } from '../types';

export interface WorkletSourceConfig {
  constraints?: MediaStreamConstraints['audio'] | MediaTrackConstraints;
  ringBufferFrames: number;
  logger: Logger;
  onStream?: (stream: MediaStream | null) => void;
}

export const createWorkletMicrophoneSource = (_config: WorkletSourceConfig): BrowserFrameSource => {
  throw new Error('AudioWorklet microphone source is not implemented yet');
};
