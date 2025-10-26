# Runtime Node Microphone Example

CLI example that streams audio from microphone via `ffmpeg` into `@saraudio/runtime-node` and outputs speech segmentation events.

## Requirements

- Node.js 18+
- Installed `ffmpeg` with microphone access (Homebrew/apt/choco)
- OS permission for audio capture

## Running

```bash
pnpm install
pnpm --filter @saraudio/example-runtime-node-mic start
```

By default, the script tries to use `ffmpeg` with macOS preset (`-f avfoundation -i :0`).

### Custom Devices

Override `FFMPEG_INPUT_ARGS` variable to specify custom input:

```bash
# macOS (default microphone)
FFMPEG_INPUT_ARGS="-f avfoundation -i :0" pnpm --filter @saraudio/example-runtime-node-mic start

# Linux (ALSA)
FFMPEG_INPUT_ARGS="-f alsa -i default" pnpm --filter @saraudio/example-runtime-node-mic start

# Windows (replace with device name from ffmpeg -list_devices)
FFMPEG_INPUT_ARGS='-f dshow -i audio="Microphone (Realtek...)"' pnpm --filter @saraudio/example-runtime-node-mic start
```

### What the Script Does

- Starts `ffmpeg`, receives PCM16/16 kHz from stdout
- Pipes the stream into `createNodeRuntime()` with `@saraudio/vad-energy` and segmenter
- Logs `speechStart`, `speechEnd`, `segment` events
- Saves each segment to `./segments/segment-<n>.pcm`

Stop with `Ctrl+C`. The script gracefully terminates `ffmpeg` and flushes the final segment with trailing silence.
