# For AI Agents

**Project:** SARAUDIO - Multi-source audio stack for AI apps.

**Read `.lab/` first** - context, vision, decisions.

**Coding:** `.lab/designs/coding-standards-2025-10-26.md` - NO `any`, minimize `as`.

**Workflow:** `.lab/designs/development-workflow-2025-10-26.md` - after EVERY change: typecheck → lint → test.

**Tests:** Unit tests `.test.ts` next to the file. Integration tests and fixtures in `__tests__/`.

---

## Commands

### Package-specific commands
Run checks for a specific package:
```bash
pnpm --filter @saraudio/runtime-browser typecheck
pnpm --filter @saraudio/runtime-browser lint
pnpm --filter @saraudio/runtime-browser lint:fix
pnpm --filter @saraudio/runtime-browser test
```

### Workspace-wide commands
Run checks for ALL packages:
```bash
pnpm typecheck  # TypeScript check all packages
pnpm lint       # Biome lint all packages
pnpm lint:fix   # Biome auto-fix all packages
pnpm test       # Vitest run all packages
```

### Development flow
After EVERY code change:
1. **Typecheck**: `pnpm --filter @saraudio/PACKAGE typecheck`
2. **Lint**: `pnpm --filter @saraudio/PACKAGE lint`
3. **Test**: `pnpm --filter @saraudio/PACKAGE test`

Example:
```bash
# After editing packages/runtime-browser/src/runtime.ts
pnpm --filter @saraudio/runtime-browser typecheck
pnpm --filter @saraudio/runtime-browser lint
pnpm --filter @saraudio/runtime-browser test
```

### Available packages
- `@saraudio/core` - Pipeline, stages, events
- `@saraudio/utils` - Logger, DSP utils (rms, int16/float32)
- `@saraudio/vad-energy` - Energy-based VAD stage
- `@saraudio/runtime-browser` - Browser runtime (MediaRecorder, AudioWorklet)
