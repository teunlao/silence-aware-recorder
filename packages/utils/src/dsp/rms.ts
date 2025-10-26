export function rms(values: Float32Array): number {
  if (values.length === 0) return 0;
  let sumSquares = 0;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    sumSquares += v * v;
  }
  return Math.sqrt(sumSquares / values.length);
}
