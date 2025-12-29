---
"@saraudio/deepgram": patch
"@saraudio/soniox": patch
---

Fix provider option forwarding so the SDK behavior matches the documented APIs.

- Deepgram: map typed options to official Listen v1 query params (incl. multi-value `keywords`, `search`, `replace`).
- Soniox: pass `wsProtocols` to the realtime WebSocket and forward batch options + custom headers in REST flows.

<!-- meta: agent=codex -->
<!-- signed: codex -->
