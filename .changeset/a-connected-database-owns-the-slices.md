---
'agentic-service-blueprinting': patch
---

The bundled demo slices stop reaching a deployment that has a database. A connected database is the whole truth — the ruling the board and the editor's navigation already follow — and the slice hooks were the one reader still outside it.

The leak was on the error path, not the empty one. `useSupabaseQuery` calls a hook's fallback in two places: the no-database branch, where the bundled sample is the point, and the error branch, where it is not. Four surfaces render `fallback ?? []` — the slices sidebar, the tab strip, a cell's "In slices" footer and the mobile shell — so a deployment whose slices read failed or timed out was shown three of this template's demo slices as its own, with nothing on screen saying otherwise. `useSlices` and `useSlice` now ask `isBundledSampleActive()`, the same question the board and the nav ask, and return `null` rather than an empty list: a failed read is not entitled to say a workspace has no slices.

Gated, not made configurable. A `sample.slices` field would make this an opt-out — every adopter would have to write an empty list or leak — and the state a deployment wants here is not "my own slices before my data arrives" but "nothing that is not mine". `sample.nav` is configurable AND gated for that reason; if a deployment ever wants its own bundled slices, the field can be added on top of this gate without moving it.

Three other importers of `data/sliceFallbacks.ts` were checked and left alone. `lib/agent/tools/sampleRead.ts` is reached only through the agent loop's sample-trial dispatch, which runs when the Supabase client is `null` — and the client is null exactly when the project is unconfigured, so that path already asks this question under another name. `lib/backend/adapters/fixture.ts` has no caller in the app at all; it is the conformance suite's fixture backend, and gating it would delete the slice cases it exists to run. `lib/sliceCells.test.ts` is a test.

**Upgrading a deployment:** nothing to do, and nothing to configure. A deployment with `VITE_SUPABASE_*` set now shows no slices when a slices read fails, where it previously showed this template's demo slices; with no database configured the bundled sample still serves both the list and each slice exactly as before. A deployment that emptied `data/sliceFallbacks.ts` in its own fork to stop the leak can stop doing so.
