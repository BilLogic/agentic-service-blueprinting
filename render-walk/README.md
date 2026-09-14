---
summary: The browser render walk — Chromium over the built distribution in no-database mode, every phase, every scenario, every path and every layout the scenario offers, plus the annotation-drag case that draws, drags and captures a mark with real mouse moves, failing on a console error and filing one screenshot per view; what it borrows from the app's markup, how this repository runs it, and how a deployment enrols by running the runner that ships beside them out of its own node_modules.
---

# The browser render walk

**For** anyone whose render walk just went red, and any deployment that wants
the same walk over its own board.
**Answers** what does this open, what does it catch, and how do I run it?

Every other guard in this repository reads a file, a schema or a module graph.
This one opens the application in a browser.

It builds nothing itself. It previews the built distribution, walks the bundled
sample board and fails on any `console` error or page error, naming the address
it appeared on. Each view is screenshotted under a name that states its
address.

## What a view is

Every phase, every scenario inside it, and then, per scenario, every layout
that scenario actually offers:

- **stacked, once per path.** Showing one path at a time is the layout's whole
  claim, so a scenario with three paths is three views. A scenario the app
  gives no path selector is one view, addressed with no `paths` at all.
- **merged, once — and only from two paths up.** Below two there is nothing to
  lay out two ways: the app hides the layout control, and a `merged` address
  for a single-path scenario is byte-identical to its `stacked` one apart from
  `view=`. Walking it would be the same board twice and the same screenshot
  filed under two names.

So the count is *paths per scenario*, summed, plus one for each scenario with
two or more paths — not *scenarios × 2*. The walk prints it at the end of the
run.

## The annotation-drag case

`annotation-drag.spec.ts` runs beside the walk under the same config, so
`npm run check:render-walk` is two cases rather than one.

It is the browser half of `npm run slice:annotation-drag`. That slice runs the
whole annotation-drag flow in jsdom in a few hundred milliseconds, and stubs
exactly three things — layout, the canvas's live CSS-transform camera, and
pointer capture — because jsdom can do none of them. This case is those three,
unstubbed: it opens the first scenario of the first phase, picks the rectangle
from the real toolbar, draws a box across two cells of one lane with real mouse
moves (the sample board's camera is around 0.47, so every client pixel is more
than two board units), drags that box onto a third cell under a real pointer
capture, and asserts the captured cell ids.

The read-back is the capture menu's **own** download — the `Save N marks` item,
whose JSON carries each mark's `overlaps`. Nothing was added to the app to make
it observable. The menu's other item, **Send to the agent**, is absent here
because it is gated on `canWrite` and this preview has no database configured;
that attachment is the slice's read-back, and both go through the same
`captureMarks` over the same cell rects.

The console-error rule below covers this case too, including the
`RENDER_WALK_INJECT_CONSOLE_ERROR` self-test. It screenshots the dragged mark to
`render-walk-output/annotation-drag.png`.

## What it catches, and what it does not

It catches an error in the console, a page that threw, an error boundary, and a
board that came up without lanes, without step headers or with empty cells.
Those are the states where the app is broken and every file-reading guard is
green — the class
[ADR 0017](../docs/adr/0017-large-component-splits-wait-for-an-end-to-end-round.md)
records two of: a renamed at-rule whose whole block the browser dropped, and a
lane chip that set `backgroundColor` to a role key rather than a colour.

It does not catch a wrong colour. Nothing here asserts that a pixel is the
right pixel, and a chip that renders untinted renders. That half is the
screenshots, which CI uploads and a person reads.

Exploratory walks — "does this import look right, does this deploy look
right" — stay with the `render-checker` agent (`agents/render-checker.md`).
This file is the one that runs unattended.

## Running it here

```bash
VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build
npm run check:render-walk
```

The build variables are cleared on purpose. `isSupabaseConfigured()` in
`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` at BUILD time, and Vite bakes
whatever `.env` holds into `dist`. A developer with real values in `.env` who
builds without clearing them gets a preview wired to a live database, and the
walk then measures somebody's rows rather than the bundled sample. The walk
refuses that run: its first assertion is that the app shows the `sample data`
badge.

`npm run check:render-walk` runs `render-walk/run.mjs`, the same runner a
deployment calls out of its `node_modules` — it stages this directory into
`.render-walk-staged/` and hands Playwright the copy, so the enrolled path is
exercised here on every run. It starts its own preview and stops it again
(`reuseExistingServer: false`, so a preview left running from an older build
cannot be mistaken for this one).

## How the port is chosen

The walk asserts against whatever answers on its port, so the port is part of
the subject rather than a detail. It is decided once per run, by the runner,
before Playwright starts:

- **No `RENDER_WALK_PORT`** — 4173 if nothing is listening there and no other
  walk has claimed it, otherwise the next free port above it, up to 4204. So
  your own `npm run preview` on 4173, or a second checkout walking at the same
  moment, moves this run along instead of stopping it: two walks started
  together take 4173 and 4174 and each walks its own `dist`. The run says
  which port it chose before it opens anything, and a machine with all
  thirty-two held is a refusal naming the range.
- **`RENDER_WALK_PORT=4273`** — that port and no other. You named it, so a walk
  elsewhere would not be the walk you asked for: if something is already
  listening there the runner **refuses by name**, tells you how to find out
  whose it is (`lsof -i :4273`), and starts nothing.

```bash
RENDER_WALK_PORT=4273 npm run check:render-walk
```

Either way the walk never reuses a server it did not start. What is already on
a port is somebody else's `dist` — an older build of this tree, or another
tree's altogether — and a green walk over it would be a statement about code
that is not in your working directory. Pointing Playwright at the config by
hand rather than through the runner keeps the fixed 4173, where
`reuseExistingServer: false` plus `--strictPort` makes a held port an abort
that names it and collects no tests.

Output — one screenshot per view, plus
Playwright's own artifacts — lands in `render-walk-output/`, which is
gitignored here and uploaded by CI.

To watch the guard fail, which is the only way to know it works:

```bash
RENDER_WALK_INJECT_CONSOLE_ERROR=1 npm run check:render-walk   # must exit 1
```

That variable makes the spec inject one `console.error` into every page. CI
runs the walk twice for this reason — once with it set, asserting a non-zero
exit, then once for real.

## Enrolling a deployment

These files are a published path, the same kind of promise as
`references/` and `skills/` —
[ADR 0004](../docs/adr/0004-reference-paths-are-a-published-interface.md), and
`CONSUMER_IMPORTS` in `scripts/check-reference-paths.mjs` lists the runner, the
config and both specs so a move here fails this repository's build rather than
yours. There is no `files` field in `package.json`, so nothing filters them out
of the package, and `exports` carries `"./*"`, so they are reachable by path.

From the root of a deployment that installs this package, one command:

```bash
node node_modules/agentic-service-blueprinting/render-walk/run.mjs
```

`npx render-walk` is the same thing through the bin the install links; put
either in your own `package.json` as `check:render-walk` and arguments pass
through (`npm run check:render-walk -- --headed`).

**You need no staging script of your own, and this is not the command earlier
releases gave.** Up to 1.44.9 the instruction was `npx playwright test -c
node_modules/…/render-walk/playwright.config.ts`, and it cannot work: neither
loader will compile a TypeScript file that lives under `node_modules`.
Playwright's transform hook declines any path with a `node_modules` segment, so
Node is handed raw TypeScript and throws `ERR_UNKNOWN_FILE_EXTENSION`; Node's
own type stripping refuses the same file with
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Neither rule is configurable and
both cover the specs as well as the config. So `run.mjs` copies this directory
out of `node_modules` into `.render-walk-staged/` at your root, byte for byte,
and points Playwright at the copy. It is rewritten from the installed package
on every run and read by nothing else, so it cannot drift from the version you
pinned — **add `.render-walk-staged/` to your `.gitignore`**. It is left behind
after the run because Playwright's trace viewer resolves a failing step back to
the spec file it ran.

The runner resolves Playwright out of **your** `node_modules` rather than
through `npx`, so a tree without it is told which version to install instead of
silently downloading some other one. The `webServer` runs `npm run preview` in
your working directory, so the preview serves your `dist`.

The walk's inventory — phases, scenarios, paths — is read off the rendered
page, never imported from `src/data/sampleBlueprint.ts`. Your sample board is
your own, and the walk is over whatever your build shows.

What your side has to provide:

- **`@playwright/test`**, pinned to the same version (`1.62.0` here).
- **The browser**: `npx playwright install chromium` (`--with-deps` on CI).
  Playwright looks for a build number tied to its own version, so the install
  has to be the one your pin asks for.
- **A build made with the Supabase variables cleared**, for the reason above.
- **A `preview` script that takes `--port` and `--strictPort`** — Vite's own
  does, since the config invokes it as
  `npm run preview -- --port <port> --strictPort`. You need no free port of
  your own: the runner finds one, as § How the port is chosen describes.
  `RENDER_WALK_PORT` still names one outright, and a port you name that is
  already held is refused rather than reused.
- **Both halves of your own offline board on the config** — `sample.nav` AND
  `sample.blueprints`. The walk reads its inventory off the rendered page, so
  what it opens is whatever your build shows: nav rows with no registry behind
  them are rows over an empty canvas, and the walk fails on the first board it
  asserts rather than on anything it can name. Both are generated in one run of
  `scripts/generate_fallbacks.py` with `--registry-out` and `--nav-out`, which
  write them as modules of your own that name their types by package name;
  `references/customization.md` § The offline board is two fields has the
  command and the shape.

  **Either form of that second field walks.** `sample.blueprints` takes the
  registry itself or a loader that fetches it
  (`() => import('./data/sampleBlueprints').then((m) => m.SAMPLE_BLUEPRINTS)`),
  and the walk cannot tell them apart: it opens the built preview and reads the
  page, and `DeploymentConfigProvider` renders nothing below it until a loader
  has answered — so by the time there is a cover to click past, the board
  behind it is whole. A no-database build is exactly the build a loader IS
  called in, which is what makes the walk the guard that exercises it. This
  repository's own board is a value, so the run above walks the eager form;
  `references/customization.md` § Eagerly or behind a loader says which to
  supply and why.

A deployment that wants this in its own CI can copy the `render-walk` job out
of `.github/workflows/ci.yml`; nothing in it changes — the job already calls
`npm run check:render-walk`, and this repository's own runs through the same
runner, so the enrolled path is the one CI here exercises.

## What the walk reads off the app

The walk drives the app through markup the app grew for its own reasons — CSS
hooks, annotation anchors, scroll targets, accessible names. None of it was
designed as a test contract, and nothing in the app's source says it is read
from here. It is listed so a rename knows what it breaks:

| What the walk reads | Where the app writes it |
| --- | --- |
| `[data-cover-page]`, and the `header button` inside it | the cover page; the walk clicks that button to get past the overlay |
| `[data-nav-row]` — value is the phase or scenario id | the sidebar's rows |
| `button[aria-controls^="phase-panel-…"]` and `id="phase-panel-<id>"` | the sidebar's phase disclosure and its panel |
| `[data-focus-slide-id="<scenario id>"]` | the canvas artboard for one scenario |
| `[data-blueprint-cell]`, `[data-blueprint-column-header]`, `[data-blueprint-row-header]` | the board grid |
| `aria-label^="Paths shown:"`, and the `aria-controls` it names while open | the path selector trigger and its popover |
| `aria-label="Path display"`, with `Stacked` / `Merged` inside it | the layout control |
| `[data-canvas-annotation-layer]` and `[data-annotation-id]` inside it | the annotation scratch layer and one mark on it — read by the annotation-drag case |
| `aria-label="Rectangle"`, `aria-label="Rectangle — Shapes tools"` | the annotation toolbar's Shapes slot: the face, and the face once the family holds the tool |
| `aria-label="Save or send these marks"`, and the `Save N marks` menu item | the capture menu's trigger and its download item |

Renaming one of these does not fail a type check or a lint rule; it fails this
walk, with a locator that found nothing. If you are the one renaming it, the
fix belongs here in the same change.
