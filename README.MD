# SARAUDIO v3 — Multi-Source Audio Stack for AI Apps

> ⚠️ The repository is undergoing a full reboot for the v3 architecture. The legacy `silence-aware-recorder` package has been archived; all new work happens under the modular `@saraudio/*` namespace.

## Monorepo Layout

- `packages/core` — pipeline engine (Pipeline, EventBus, Segmenter, buffers).
- `packages/utils` — DSP utilities (RMS, hysteresis, PCM helpers).
- `packages/vad-energy` — energy-based VAD stage.
- `packages/runtime-node` — Node/Bun runtime with DI-aware sources and sinks.
- `packages/runtime-browser` — browser runtime (AudioWorklet or MediaRecorder) for getUserMedia pipelines.
- `examples/runtime-node-mic` — interactive ffmpeg → VAD → segment CLI demo.
- `.lab/` — design notes, decisions, research, roadmap (internal, Russian language).

## Quick Start

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
```

### Run the interactive mic example (macOS)

```bash
pnpm --filter @saraudio/example-runtime-node-mic start
```

The CLI lists `avfoundation` devices, lets you pick an input, renders a live VAD bar, and saves PCM segments to `examples/runtime-node-mic/.segments/`.

See [`examples/runtime-node-mic/README.md`](examples/runtime-node-mic/README.md) for full usage, environment variables, and playback tips.

## Current Focus

- Lock down the plugin-based pipeline architecture (SOLID/GRASP/DI) documented in `.lab/designs`.
- Ship the first v3 releases: Node runtime + energy VAD + segmenter.
- Next milestones: browser bindings, React hooks, WASM/native accelerators.

## Legacy Snapshot

The deprecated browser recorder (`SilenceAwareRecorder` class and React hook) lives in `.lab/archive/recorder-legacy-2025-10-26/` for reference only and is not part of public builds.

## Contributing

- Follow the coding standards in `.lab/designs/coding-standards-2025-10-26.md`.
- Workflow rule: after every code change run `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Project discussions, roadmap, and research live in `.lab/`.

SARAUDIO aims to become the go-to audio stack for AI-driven applications: multi-source input, pluggable processing (VAD, diarization, agent loops), and runtimes that span Node, browser, WASM, and native backends.
