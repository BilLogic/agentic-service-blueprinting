---
'agentic-service-blueprinting': patch
---

The service-scope and reference-registry tests now pass in a deployment that holds them byte for byte. They check the canvas adapter the agent is actually served, meaning the reference registry's `canvas-adapter` record after any `registerReferenceDocs` replacement, against the live tool specs. They no longer read a file at a fixed repository path. The test comparing the source `references/canvas-adapter.md` with its generated copy still runs here, and skips where there is no `references/` folder. A new case shows that a registered replacement adapter is the one checked against the tools that take `service`.

Visible copy now says "step" wherever it meant a step: the create dialog's count field ("Steps", previously "Columns"), its whole-number message, the step handle's tooltip and accessible name ("Select the … step"), and the two authoring errors about a step missing from a version or two steps sharing a position. "column" and "columns" join the retired copy words, so the reader-facing copy guard fails if either comes back on screen.

`authoringErrors.ts` and its test name the decision that a lane's position is unique within its path, in place of a migration version.
