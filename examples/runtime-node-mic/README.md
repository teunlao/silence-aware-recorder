# Runtime Node Microphone Example

Interactive CLI that captures microphone audio via `ffmpeg`, pipes it into `@saraudio/runtime-node` with the energy VAD, prints speech events, and saves segments to disk.

## Requirements

- Node.js ≥ 18
- `ffmpeg` installed with microphone access (Homebrew/apt/choco, etc.)
- Operating system permission to record audio from the terminal

## Quick Start

```bash
pnpm install
pnpm --filter @saraudio/example-runtime-node-mic start
```

What happens on launch:

1. On macOS (`avfoundation`) the CLI lists audio devices and asks for an index. Press Enter to keep the default `:0` or if the terminal is not a TTY.
2. `ffmpeg` converts the chosen input into PCM16 / 16 kHz mono and streams it to stdout.
3. `createNodeRuntime()` runs a pipeline with `@saraudio/vad-energy` and the segmenter; the CLI prints `speechStart`, `speechEnd`, `segment` events plus a live VAD bar.
4. Each segment is written to `examples/runtime-node-mic/.segments/segment-<n>.pcm` (git-ignored).

Stop the example with `Ctrl+C` — the script stops `ffmpeg`, flushes trailing audio, and disposes the pipeline.

## Configuring the input

### Environment shortcuts

- `FFMPEG_DEVICE` — quick way to point at a device without rewriting every flag.
  - macOS: `FFMPEG_DEVICE=':2' pnpm …`
  - Linux (ALSA): `FFMPEG_DEVICE='hw:1,0' pnpm …`
  - Windows (dshow): `FFMPEG_DEVICE='Microphone (USB Audio)' pnpm …`

- `FFMPEG_INPUT_ARGS` — JSON array of strings that fully replaces the default ffmpeg input arguments.

```bash
# macOS explicit array
FFMPEG_INPUT_ARGS='["-f","avfoundation","-i",":3"]' pnpm --filter @saraudio/example-runtime-node-mic start

# Linux (ALSA default device)
FFMPEG_INPUT_ARGS='["-f","alsa","-i","default"]' pnpm --filter @saraudio/example-runtime-node-mic start

# Windows (device name from `ffmpeg -list_devices true -f dshow -i dummy`)
FFMPEG_INPUT_ARGS='["-f","dshow","-i","audio=Microphone (Realtek)"]' pnpm --filter @saraudio/example-runtime-node-mic start
```

If the platform is not recognised, the script requires `FFMPEG_INPUT_ARGS` to be provided.

## Tuning VAD behaviour

- `ENERGY_THRESHOLD_DB` — energy threshold in dB (default `-55`). Lower it if the detector is too quiet, raise it if you get segments on background noise.
- `smoothMs`, `preRollMs`, `hangoverMs` are configured inline in `src/index.ts`; tweak them to experiment with latency vs. stability.

## Troubleshooting tips

- List devices manually: `ffmpeg -hide_banner -f avfoundation -list_devices true -i ''` (macOS) or `ffmpeg -hide_banner -list_devices true -f dshow -i dummy` (Windows).
- In non-interactive environments (e.g. launched from IDE) the prompt is skipped — set `FFMPEG_DEVICE` or `FFMPEG_INPUT_ARGS` explicitly.

Segments are raw PCM. Play or convert them with ffmpeg:

```bash
ffplay -f s16le -ar 16000 -ac 1 examples/runtime-node-mic/.segments/segment-1.pcm

ffmpeg -f s16le -ar 16000 -ac 1 -i examples/runtime-node-mic/.segments/segment-1.pcm segment-1.wav
```
