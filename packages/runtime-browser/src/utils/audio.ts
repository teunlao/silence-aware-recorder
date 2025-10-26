export interface InterleavedAudio {
  data: Float32Array;
  sampleRate: number;
  channels: number;
}

export const audioBufferToInterleavedFloat32 = (buffer: AudioBuffer): InterleavedAudio => {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const output = new Float32Array(length * channels);
  const channelData: Float32Array[] = [];

  for (let channel = 0; channel < channels; channel += 1) {
    channelData.push(buffer.getChannelData(channel));
  }

  for (let i = 0; i < length; i += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      output[i * channels + channel] = channelData[channel][i];
    }
  }

  return {
    data: output,
    sampleRate: buffer.sampleRate,
    channels,
  };
};

export const float32ToInt16 = (data: Float32Array): Int16Array => {
  const output = new Int16Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    const value = Math.max(-1, Math.min(1, data[i]));
    output[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return output;
};
