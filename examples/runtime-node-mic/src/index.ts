import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Segment } from '@saraudio/core';
import { createEnergyVadStage } from '@saraudio/vad-energy';
import { createNodeRuntime } from '@saraudio/runtime-node';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const FRAME_SIZE = 160; // 10 ms

const __dirname = dirname(fileURLToPath(import.meta.url));
const segmentsDir = resolve(__dirname, '../segments');
mkdirSync(segmentsDir, { recursive: true });

const parseInputArgs = (): string[] => {
  const rawJson = process.env.FFMPEG_INPUT_ARGS;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
        return parsed;
      }
      console.warn('FFMPEG_INPUT_ARGS must be a JSON array of strings. Using default values.');
    } catch (error) {
      console.warn('Failed to parse FFMPEG_INPUT_ARGS. Using default values.', error);
    }
  }

  const platform = process.platform;
  if (platform === 'darwin') {
    const device = process.env.FFMPEG_DEVICE ?? ':0';
    return ['-f', 'avfoundation', '-i', device];
  }
  if (platform === 'linux') {
    const device = process.env.FFMPEG_DEVICE ?? 'default';
    return ['-f', 'alsa', '-i', device];
  }
  if (platform === 'win32') {
    const device = process.env.FFMPEG_DEVICE;
    if (!device) {
      throw new Error('For Windows, specify FFMPEG_DEVICE environment variable, e.g. audio="Microphone (USB)"');
    }
    return ['-f', 'dshow', '-i', `audio=${device}`];
  }
  throw new Error(`Unknown platform ${platform}. Set FFMPEG_INPUT_ARGS manually.`);
};

const createFfmpegProcess = () => {
  const inputArgs = parseInputArgs();
  const commonArgs = ['-ac', String(CHANNELS), '-ar', String(SAMPLE_RATE), '-f', 's16le', '-'];
  const args = [...inputArgs, ...commonArgs];
  const ffmpeg = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  ffmpeg.on('error', (error) => {
    console.error('Failed to start ffmpeg:', error);
    process.exit(1);
  });

  return ffmpeg;
};

const writeSegmentToFile = (segment: Segment, index: number): void => {
  if (!segment.pcm) return;
  const buffer = Buffer.from(segment.pcm.buffer, segment.pcm.byteOffset, segment.pcm.byteLength);
  const filePath = resolve(segmentsDir, `segment-${index}.pcm`);
  writeFileSync(filePath, buffer);
  console.log(`segment saved → ${filePath}`);
};

const main = async () => {
  console.log('Starting ffmpeg… Press Ctrl+C to stop.');

  const ffmpeg = createFfmpegProcess();
  const runtime = createNodeRuntime();
  const pipeline = runtime.createPipeline({
    stages: [createEnergyVadStage({ thresholdDb: -46, smoothMs: 20 })],
    segmenter: { preRollMs: 150, hangoverMs: 220 },
  });

  let segmentIndex = 0;

  pipeline.events.on('speechStart', ({ tsMs }) => {
    console.log(`speechStart @ ${tsMs.toFixed(0)} ms`);
  });

  pipeline.events.on('speechEnd', ({ tsMs }) => {
    console.log(`speechEnd @ ${tsMs.toFixed(0)} ms`);
  });

  pipeline.events.on('segment', (segment) => {
    segmentIndex += 1;
    const { startMs, endMs, durationMs } = segment;
    console.log(`segment #${segmentIndex} ${startMs.toFixed(0)} → ${endMs.toFixed(0)} (duration ${durationMs.toFixed(0)} ms)`);
    writeSegmentToFile(segment, segmentIndex);
  });

  const source = runtime.createPcm16StreamSource({
    stream: ffmpeg.stdout,
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    frameSize: FRAME_SIZE,
  });

  const stop = async () => {
    console.log('\nStopping…');
    ffmpeg.kill('SIGINT');
    pipeline.flush();
    pipeline.dispose();
  };

  process.once('SIGINT', () => {
    void stop().finally(() => {
      process.exit(0);
    });
  });

  process.once('SIGTERM', () => {
    void stop().finally(() => {
      process.exit(0);
    });
  });

  ffmpeg.on('exit', async (code, signal) => {
    console.log(`ffmpeg exited (code=${code ?? 'null'} signal=${signal ?? 'null'})`);
    pipeline.flush();
    pipeline.dispose();
  });

  await runtime.run({ source, pipeline, autoFlush: true });
};

main().catch((error) => {
  console.error('Failed to start example:', error);
  process.exit(1);
});
