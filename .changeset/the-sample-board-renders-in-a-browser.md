---
'agentic-service-blueprinting': patch
---

**The sample board is now opened in a browser on every pull request, and a
console error fails the build.** Every guard in this repository read a file, a
schema or a module graph; none of them rendered anything. ADR 0017 records what
that costs — a renamed CSS at-rule whose whole block the browser dropped
silently, and a lane chip that set `backgroundColor` to a role key rather than
a colour. Both looked right in the source, both passed every check, and both
were broken from the day they shipped.

`npm run check:render-walk` builds nothing and asserts a lot: it previews the
built distribution with no database configured — the bundled sample board — and
walks it exhaustively. Every phase, every scenario, every path one at a time in
the stacked layout, every path together in the merged one. Fourteen views on
this repository's board, each reached by its own address rather than by a
sequence of clicks, each asserted to have arrived with lanes, step headers and
cells carrying content, and each screenshotted.

It fails on any `console` error and any page error, and says which address the
error appeared on. CI runs it twice: once with the walk's
`RENDER_WALK_INJECT_CONSOLE_ERROR` variable set, which puts one error into
every page and must make the walk go red, and then once for real. A walk that reports no console errors looks identical
whether the app is clean or the listener was never wired up.

**What it does not see is a wrong colour.** A chip tinted with a role key
renders untinted, and renders. So the walk files one screenshot per view under
a name that states its address, and CI uploads them: the assertions are the
machine half of this instrument and the screenshots are the human half.

**A deployment can enrol.** `render-walk/` is a published path — the same
promise `references/` and `skills/` carry, listed by `check:reference-paths`,
so a move here fails this repository's build rather than yours. From your own
root:

```bash
npx playwright test \
  -c node_modules/agentic-service-blueprinting/render-walk/playwright.config.ts
```

Nothing is copied and nothing is configured. The preview runs in your working
directory and serves your `dist`, and the walk's inventory of phases, scenarios
and paths is read off the rendered page rather than imported from
`src/data/sampleBlueprint.ts` — your sample board is your own. Two things your
side provides: `@playwright/test` on the same pin, and a build made with the
Supabase variables cleared, because `isSupabaseConfigured()` reads them at
build time and the walk refuses a preview that is not in no-database mode.

The `render-checker` agent is unchanged and stays where it was, for the
exploratory walk a person asks for. This is the one that runs unattended.
