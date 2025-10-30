# SARAUDIO v3 — Multi-Source Audio Stack

> ⚠️ The repository is undergoing a full reboot for the v3 architecture. The legacy `silence-aware-recorder` package has been archived; all new work happens under the modular `@saraudio/*` namespace.

## Monorepo Layout

- `packages/core` — pipeline engine
- `packages/utils` — DSP utilities
- `packages/vad-energy` — energy-based VAD stage
- `packages/runtime-node` — Node/Bun runtime
- `packages/runtime-browser` — browser runtime
- `examples/runtime-node-mic` — interactive CLI demo

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

> ⚠️ **Alpha Development Branch**: This is the v3 development branch with breaking changes and experimental features. For stable npm releases, see the `main` branch. Not production-ready.
