export function float32ToInt16(source: Float32Array, target?: Int16Array): Int16Array {
  const output = target ?? new Int16Array(source.length);
  const length = output.length;
  for (let i = 0; i < length; i += 1) {
    const x = Math.max(-1, Math.min(1, source[i] ?? 0));
    output[i] = x < 0 ? x * 0x8000 : x * 0x7fff;
  }
  return output;
}

export function int16ToFloat32(source: Int16Array, target?: Float32Array): Float32Array {
  const output = target ?? new Float32Array(source.length);
  const length = output.length;
  for (let i = 0; i < length; i += 1) {
    output[i] = (source[i] ?? 0) / 0x8000;
  }
  return output;
}
