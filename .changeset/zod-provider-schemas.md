---
'@saraudio/core': minor
'@saraudio/deepgram': minor
'@saraudio/soniox': minor
---

feat: zod-first provider schemas + JSON overrides

- Add `@saraudio/core/json` helpers for JSON-only config payloads.
- Export `@saraudio/deepgram/schema` and `@saraudio/soniox/schema` for runtime options + JSON-safe overrides.
- Validate provider options via Zod at provider entry points.
