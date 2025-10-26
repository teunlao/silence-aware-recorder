import type { BrowserFrameSource, RuntimeLogger } from '../types';
import { audioBufferToInterleavedFloat32, float32ToInt16 } from '../utils/audio';

export interface MediaRecorderSourceConfig {
  constraints?: MediaStreamConstraints['audio'] | MediaTrackConstraints;
  timesliceMs: number;
  mimeType?: string;
  audioBitsPerSecond?: number;
  logger: RuntimeLogger;
  onStream?: (stream: MediaStream | null) => void;
}

export const createMediaRecorderSource = (config: MediaRecorderSourceConfig): BrowserFrameSource => {
  let mediaStream: MediaStream | null = null;
  let mediaRecorder: MediaRecorder | null = null;
  let audioContext: AudioContext | null = null;
  let processingChain: Promise<void> = Promise.resolve();
  let isActive = false;
  let startTimestamp = 0;

  const stopStream = () => {
    if (mediaStream) {
      config.onStream?.(null);
      for (const track of mediaStream.getTracks()) {
        track.stop();
      }
    }
    mediaStream = null;
  };

  const disposeRecorder = () => {
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onerror = null;
      if (mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch (error) {
          config.logger.warn('MediaRecorder stop error', error);
        }
      }
    }
    mediaRecorder = null;
  };

  const closeAudioContext = async () => {
    if (audioContext) {
      try {
        await audioContext.close();
      } catch (error) {
        config.logger.warn('AudioContext close error', error);
      }
    }
    audioContext = null;
  };

  const start: BrowserFrameSource['start'] = async (onFrame) => {
    if (isActive) {
      throw new Error('MediaRecorder source already started');
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('mediaDevices.getUserMedia is not available in this environment');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('MediaRecorder API is not available in this environment');
    }

    isActive = true;
    startTimestamp = performance.now();

    const constraints: MediaStreamConstraints = {
      audio: config.constraints ?? true,
      video: false,
    };

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    config.onStream?.(mediaStream);
    audioContext = new AudioContext();
    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType: config.mimeType,
      audioBitsPerSecond: config.audioBitsPerSecond,
    });

    let processedMs = 0;

    mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (!event.data || event.data.size === 0) {
        return;
      }

      processingChain = processingChain
        .then(async () => {
          if (!audioContext) {
            return;
          }

          let buffer: AudioBuffer;
          try {
            const arrayBuffer = await event.data.arrayBuffer();
            buffer = await audioContext.decodeAudioData(arrayBuffer);
          } catch (error) {
            config.logger.warn('Failed to decode MediaRecorder chunk', error);
            return;
          }

          const interleaved = audioBufferToInterleavedFloat32(buffer);
          const pcm = float32ToInt16(interleaved.data);
          const tsMs = startTimestamp + processedMs;
          processedMs += (buffer.length / buffer.sampleRate) * 1000;

          onFrame({
            pcm,
            tsMs,
            sampleRate: interleaved.sampleRate,
            channels: interleaved.channels as 1 | 2,
          });
        })
        .catch((error) => {
          config.logger.error('Error processing MediaRecorder chunk', error);
        });
    };

    mediaRecorder.onerror = (event) => {
      config.logger.error('MediaRecorder error', event);
    };

    mediaRecorder.start(config.timesliceMs);
  };

  const stop: BrowserFrameSource['stop'] = async () => {
    if (!isActive) {
      return;
    }
    isActive = false;

    disposeRecorder();
    stopStream();
    await processingChain.catch((error) => {
      config.logger.error('Error finishing MediaRecorder processing', error);
    });
    await closeAudioContext();
  };

  return {
    start,
    stop,
  };
};
