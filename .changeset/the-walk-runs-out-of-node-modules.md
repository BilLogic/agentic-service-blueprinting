---
'agentic-service-blueprinting': patch
---

**The render walk ships its own runner, and a deployment enrols with one
command that works.** From the root of a tree that installs this package:

```bash
node node_modules/agentic-service-blueprinting/render-walk/run.mjs
```

`npx render-walk` is the same thing through the bin the install links, and
arguments pass through, so a deployment's own `check:render-walk` is that line
and nothing else.

**The command 1.44.9 published could not be run by anybody.** It pointed
Playwright straight at `render-walk/playwright.config.ts` inside
`node_modules`, and neither loader will compile a TypeScript file that lives
there: Playwright's transform hook declines any path carrying a `node_modules`
segment, so Node is handed raw TypeScript and throws
`ERR_UNKNOWN_FILE_EXTENSION`, and Node's own type stripping refuses the same
file with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Neither rule is
configurable, and both cover the specs as much as the config, so no arrangement
of `testDir` or loader flags makes that instruction work. The first deployment
to meet it wrote the staging by hand — a script the package should have shipped
rather than one every adopter re-derives (#752).

`render-walk/run.mjs` is that script, published. It copies the directory it
ships in out of `node_modules` into `.render-walk-staged/` at the root of the
tree being walked, byte for byte and from scratch on every run, and hands
Playwright the copy; the copy is read by nothing else, so it cannot drift from
the version you pinned. Add `.render-walk-staged/` to your `.gitignore`. It
resolves Playwright out of your own `node_modules` rather than through `npx`,
which would download a version this walk is not pinned to and then say nothing
about it, and a tree without Playwright is told which version to install.

The runner is the fourth published path under `render-walk/`, listed in
`CONSUMER_IMPORTS` beside the config and the two specs, so moving it is a
release rather than a refactor. This repository's own
`npm run check:render-walk` goes through it too: the path a deployment runs is
the path CI here exercises. A deployment holding a staging script of its own
can delete it once its pin reaches this version.
