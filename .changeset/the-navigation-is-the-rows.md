---
'agentic-service-blueprinting': minor
---

The navigation is the rows: the bundled sample no longer merges into a
connected deployment's tabs.

**Content on screen today will disappear, and some sentences will change.**
If your deployment has a database and any of your phase or scenario ids came
from this kit's sample, part of your navigation is not yours. Two things were
happening on every render:

- **Your summaries were being overwritten.** The merge tested the sample's
  summary FIRST and yours only if the sample had none, so wherever an id
  collided the tab described this kit's own service in this kit's words —
  even when your summary was perfectly good. Your `scenarios.layout` lost the
  same way for any scenario the sample registers a blueprint for. After this
  release your rows read exactly as your database holds them.
- **Scenarios you deleted were coming back.** A scenario the sample ships,
  under a phase you kept, was appended to the nav whether or not your database
  still had it. Those tabs are gone. Since `resolveBlueprintForScenario`
  stopped filling holes from the sample they had nothing behind them anyway:
  a tab that opened onto an empty board is exactly the one this removes.

Nothing of yours is deleted. Your rows are untouched; everything that
disappears is content that was never in your database. A tab that vanishes is
a scenario you do not have, and a summary that changes is the one you wrote.

**What to do about it.** Open the nav once after upgrading. Where a tab is
gone and you want it, author the scenario — it is a row like any other. Where
a summary now reads differently, that is your `phases.summary` or
`scenarios.summary` speaking for the first time; fill in the blank ones you
find.

**What changed.** `src/lib/mergeSlidesWithFallback.ts` is removed, and
`EditorContext` reads the fetched slides straight through. The whole-nav
fallback is unchanged: a read with no rows at all — no database configured, or
the first fetch still in flight — still shows the deployment's `sample.nav`,
whole and unmixed, which is what a fresh clone's onboarding depends on.
