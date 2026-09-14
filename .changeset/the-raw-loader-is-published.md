---
'agentic-service-blueprinting': patch
---

**A consumer bundling the tool definitions is handed the `?raw` loader rather
than writing one.** `src/lib/agent/tools/specs.ts` reaches the rulebook —
a definition carries its `run` beside its schema, and `referenceDocs.ts`
imports eighteen markdown documents as text the way Vite reads them — so a
plain Node bundle of the tool surface stopped on the first document it met:
`[UNLOADABLE_DEPENDENCY] Could not load …/check-fee-visibility.md?raw`. A
deployment's eval harness met that as a hard stop and answered it with a copy
of this repo's ten-line plugin.

The loader is now `scripts/vite-imports.mjs`, published as the
`./vite-imports` subpath, and `references/customization.md` § Bundling the
agent's tool definitions is the documented route. This repo's own harness
imports the same module by package name, so the loader a consumer is handed is
the one every harness run here proves. The import form stays in the app,
because the documents are the app's content and their paths are a published
interface a second reader would drift from (#759).
