---
'agentic-service-blueprinting': minor
---

The reference specifiers and the storage prefix become declared forks.

Two things could never be the same in this kit and in an app built from it: where
the agent's reference documents are resolved from, and the prefix on every
localStorage key. Each is now a small module of its own —
`src/lib/agent/tools/referenceDocs.ts` and `src/lib/storageNamespace.ts` — so the
large files above them stop diverging over it. `read.ts` keeps its drift throw and
its reader and knows nothing about resolution; every storage key is emitted by
`storageKey(name)` and is byte-for-byte what it was, so nothing stored in a
browser needs migrating.

The extras array that adds a deployment's own reference document is a third leaf,
`referenceNamesExtra.ts`, rather than living in `referenceDocs.ts`: the eval
harnesses bundle `specs.ts` with rolldown rather than Vite, so there is no `?raw`
loader on that path and one import would have broken `agent:harness`.
