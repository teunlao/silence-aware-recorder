import type { BrowserFrameSource, RuntimeLogger } from '../types';
import { float32ToInt16 } from '../utils/audio';

export interface MediaRecorderSourceConfig {
  constraints?: MediaStreamConstraints['audio'] | MediaTrackConstraints;
  frameSize?: number;
  logger: RuntimeLogger;
  onStream?: (stream: MediaStream | null) => void;
}

export const createMediaRecorderSource = (config: MediaRecorderSourceConfig): BrowserFrameSource => {
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let sinkNode: GainNode | null = null;
  let isActive = false;
  let startTimestamp = 0;
  let basePlaybackTime: number | null = null;
  let frameCount = 0;

  const stopStream = () => {
    if (mediaStream) {
      config.onStream?.(null);
      for (const track of mediaStream.getTracks()) {
        track.stop();
      }
    }
    mediaStream = null;
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

    isActive = true;
    startTimestamp = performance.now();
    basePlaybackTime = null;

    const constraints: MediaStreamConstraints = {
      audio: config.constraints ?? true,
      video: false,
    };

    config.logger.info('[browser-source] requesting media stream', constraints);

    mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    config.logger.info('[browser-source] media stream acquired', {
      trackSettings: mediaStream.getAudioTracks()[0]?.getSettings() ?? null,
      trackLabel: mediaStream.getAudioTracks()[0]?.label ?? 'unknown',
    });

    config.onStream?.(mediaStream);
    audioContext = new AudioContext();
    sourceNode = audioContext.createMediaStreamSource(mediaStream);

    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (resumeError) {
        config.logger.warn('[browser-source] AudioContext resume failed', resumeError);
      }
    }

    const channels = sourceNode.channelCount;
    const frameSize = Math.max(256, config.frameSize ?? 1024);
    processorNode = audioContext.createScriptProcessor(frameSize, channels, channels);
    sinkNode = audioContext.createGain();
    sinkNode.gain.value = 0;

    config.logger.info('[browser-source] processor started', {
      sampleRate: audioContext.sampleRate,
      channels,
      frameSize,
    });

    processorNode.onaudioprocess = (event) => {
      if (!isActive) {
        return;
      }

      const input = event.inputBuffer;
      const frameLength = input.length;
      const channelCount = input.numberOfChannels;
      const context = audioContext;
      if (!context) {
        return;
      }
      const interleaved = new Float32Array(frameLength * channelCount);
      const channelData: Float32Array[] = [];

      for (let channel = 0; channel < channelCount; channel += 1) {
        channelData.push(input.getChannelData(channel));
      }

      for (let sample = 0; sample < frameLength; sample += 1) {
        for (let channel = 0; channel < channelCount; channel += 1) {
          interleaved[sample * channelCount + channel] = channelData[channel]?.[sample] ?? 0;
        }
      }

      const pcm = float32ToInt16(interleaved);
      const playbackTime = event.playbackTime;
      if (basePlaybackTime === null) {
        basePlaybackTime = playbackTime;
        config.logger.info('[browser-source] first frame baseline set', { playbackTime });
      }
      const relativeSeconds = playbackTime - (basePlaybackTime ?? playbackTime);
      const tsMs = startTimestamp + relativeSeconds * 1000;

      frameCount += 1;
      if (frameCount <= 10 || frameCount % 50 === 0) {
        config.logger.info('[browser-source] frame captured', {
          frameCount,
          frameLength,
          channelCount,
          sampleRate: context.sampleRate,
          tsMs,
          firstSample: pcm[0] ?? 0,
        });
      }

      onFrame({
        pcm,
        tsMs,
        sampleRate: context.sampleRate,
        channels: (channelCount === 1 ? 1 : 2) as 1 | 2,
      });
    };

    sourceNode.connect(processorNode);
    processorNode.connect(sinkNode);
    sinkNode.connect(audioContext.destination);
  };

  const stop: BrowserFrameSource['stop'] = async () => {
    if (!isActive) {
      return;
    }
    isActive = false;

    config.logger.info('[browser-source] stopping processor');

    if (processorNode) {
      processorNode.onaudioprocess = null;
      processorNode.disconnect();
    }
    if (sourceNode) {
      sourceNode.disconnect();
    }
    if (sinkNode) {
      sinkNode.disconnect();
      sinkNode = null;
    }
    processorNode = null;
    sourceNode = null;
    stopStream();
    await closeAudioContext();
    basePlaybackTime = null;
    frameCount = 0;

    config.logger.info('[browser-source] processor stopped');
  };

  return {
    start,
    stop,
  };
};
