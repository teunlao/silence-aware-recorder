export const float32ToInt16 = (data: Float32Array): Int16Array => {
  const output = new Int16Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    const value = Math.max(-1, Math.min(1, data[i]));
    output[i] = value < 0 ? value * 0x8000 : value * 0x7fff;
  }
  return output;
};
