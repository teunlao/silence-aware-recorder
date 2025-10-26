export class FloatRingBuffer {
  private readonly buffer: Float32Array;

  private writeIndex = 0;

  private readIndex = 0;

  private available = 0;

  constructor(readonly capacity: number) {
    this.buffer = new Float32Array(capacity);
  }

  clear(): void {
    this.writeIndex = 0;
    this.readIndex = 0;
    this.available = 0;
  }

  write(data: Float32Array): number {
    let written = 0;
    for (let i = 0; i < data.length; i += 1) {
      if (this.available === this.capacity) break;
      this.buffer[this.writeIndex] = data[i];
      this.writeIndex = (this.writeIndex + 1) % this.capacity;
      this.available += 1;
      written += 1;
    }
    return written;
  }

  read(dest: Float32Array): number {
    let read = 0;
    for (let i = 0; i < dest.length; i += 1) {
      if (this.available === 0) break;
      dest[i] = this.buffer[this.readIndex];
      this.readIndex = (this.readIndex + 1) % this.capacity;
      this.available -= 1;
      read += 1;
    }
    return read;
  }

  size(): number {
    return this.available;
  }

  toArray(): Float32Array {
    const result = new Float32Array(this.available);
    for (let i = 0; i < this.available; i += 1) {
      const index = (this.readIndex + i) % this.capacity;
      result[i] = this.buffer[index];
    }
    return result;
  }
}
