#!/usr/bin/env node
/**
 * THE RENDER WALK, RUN FROM WHEREVER IT IS INSTALLED.
 *
 * The walk is the config and the specs beside this file: Chromium over a
 * preview of the built distribution, every phase, every scenario, every path
 * and every layout the scenario offers, plus the annotation-drag case, failing
 * on any console error with one screenshot per view. Nothing here decides what
 * is opened or what is asserted, and nothing here builds. This file answers one
 * question only — how a tree that INSTALLED this package runs those files —
 * and `render-walk/README.md` is the walk itself.
 *
 * ── WHY POINTING PLAYWRIGHT AT THE INSTALLED FILES DOES NOT WORK ───────────
 *
 * The instruction this package published until this release was the obvious one:
 *
 *   npx playwright test -c node_modules/agentic-service-blueprinting/render-walk/playwright.config.ts
 *
 * It fails, and it fails for a reason neither side can configure away. Both
 * loaders that could compile that file refuse it for the same fact about where
 * it sits. Playwright's transform hook answers `shouldTransform` false for any
 * path carrying a `node_modules` segment, so Node is handed raw TypeScript and
 * throws `ERR_UNKNOWN_FILE_EXTENSION`; Node's own type stripping refuses the
 * same file explicitly, with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. The
 * rule is in both, neither exposes a switch for it, and it holds for the specs
 * exactly as it holds for the config — so there is no arrangement of
 * `testDir`, `testIgnore` or loader flags under which the published path runs
 * in place. That instruction was published for a release and no deployment
 * could follow it; the deployment that met it first wrote this staging
 * by hand, which is a script the package should have shipped rather than a
 * workaround every adopter re-derives.
 *
 * So the published directory is STAGED OUT of `node_modules` first, byte for
 * byte, and Playwright is pointed at the copy. That is a copy and it is not
 * drift: it is written from the installed package on every run, from scratch,
 * and read by nothing else — so it cannot be edited into something other than
 * what the pinned version ships. The day either loader compiles a published
 * TypeScript file in place, this file is one `rm` and a one-line release note.
 *
 * ── THE TWO ROOTS, AND WHICH IS WHICH ──────────────────────────────────────
 *
 * No check in this package resolves the tree it judges from its own location;
 * every one of them reads `process.cwd()` (`scripts/sweep.mjs`). This is not a
 * check and it has two roots rather than one, so it is worth being exact about
 * them:
 *
 *   The SOURCE is this file's own directory — the published directory it ships
 *   inside. That is the one thing a runner is right to resolve from where it
 *   is: it is copying its own package's files, and the version it copies has
 *   to be the version the caller installed, not one a cwd happened to have.
 *
 *   The RUN is `process.cwd()`, like everything else here. The staged copy
 *   lands there, the preview `webServer` starts there and serves THAT tree's
 *   `dist`, and `render-walk-output/` is written there. A deployment walks its
 *   own board with the specs its pin ships, which is the whole arrangement.
 *
 * In this repository the two are the same tree, and `npm run check:render-walk`
 * goes through this file for that reason: the path a deployment runs is then
 * the path CI runs, and a break in it is ours before it is anybody's.
 *
 * ── AND WHY NOT `npx playwright` ───────────────────────────────────────────
 *
 * `npx` with nothing installed does not fail — it DOWNLOADS, silently, some
 * version of Playwright that is not the one this walk is pinned to, and the
 * run that follows means nothing. So the CLI is resolved out of the running
 * tree's own `node_modules`, and a tree without it gets the version to install
 * in a sentence instead.
 *
 * Arguments are passed through, so `-- --headed`, `--debug` and a spec name all
 * still reach Playwright, and so do the environment variables the README
 * documents (`RENDER_WALK_PORT`, `RENDER_WALK_INJECT_CONSOLE_ERROR`).
 *
 * Run: node node_modules/agentic-service-blueprinting/render-walk/run.mjs
 *      (or, by the bin the package installs: npx render-walk)
 * Here: npm run check:render-walk
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, realpathSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The published directory this file ships in: the config, the specs, this. */
export const PUBLISHED = fileURLToPath(new URL('.', import.meta.url))

/**
 * Where the copy goes, under the tree being walked. Gitignored, rewritten
 * every run, and named so nobody mistakes it for a directory they author — a
 * leading dot and the word `staged` in the name.
 */
export const STAGED = '.render-walk-staged'

/** What the package pins, named to a tree that has no Playwright to run. */
const PINNED_PLAYWRIGHT =
  createRequire(import.meta.url)('../package.json').devDependencies?.['@playwright/test'] ?? 'latest'

/**
 * The published directory, copied under `root`, from scratch.
 *
 * FROM SCRATCH is the load-bearing half. A spec left behind by an older pin is
 * a file the walk would collect and nothing would have written — the stale
 * subject this whole walk exists to catch one layer down, reproduced in its own
 * working directory.
 */
export function stage(root) {
  const staged = join(root, STAGED)
  rmSync(staged, { recursive: true, force: true })
  cpSync(PUBLISHED, staged, { recursive: true })
  return staged
}

/**
 * Playwright's own CLI, as the tree at `root` installed it — or null.
 *
 * `playwright` is asked for by `package.json` rather than by `cli.js`, because
 * the CLI is a bin and its package exports do not name it; a package's own
 * manifest is the one path every package exports. It is looked for beside
 * `@playwright/test` as well as at the root, since a strict store leaves it
 * reachable only from the package that depends on it.
 */
export function playwrightCli(root) {
  const fromRoot = createRequire(join(root, 'package.json'))
  for (const resolveFrom of [
    () => fromRoot.resolve('playwright/package.json'),
    () =>
      createRequire(fromRoot.resolve('@playwright/test/package.json')).resolve(
        'playwright/package.json',
      ),
  ]) {
    try {
      return join(dirname(resolveFrom()), 'cli.js')
    } catch {
      continue
    }
  }
  return null
}

function main() {
  const root = process.cwd()

  const cli = playwrightCli(root)
  if (cli === null || !existsSync(cli)) {
    console.error(
      `The render walk needs Playwright, and ${root} has none installed.\n` +
        `Add it at the version this package pins, then re-run:\n\n` +
        `  npm i -D @playwright/test@${PINNED_PLAYWRIGHT}\n` +
        `  npx playwright install chromium\n`,
    )
    process.exit(1)
  }

  stage(root)

  const result = spawnSync(
    process.execPath,
    [cli, 'test', '-c', join(STAGED, 'playwright.config.ts'), ...process.argv.slice(2)],
    { cwd: root, stdio: 'inherit' },
  )
  // The staged copy is left in place on the way out: Playwright's trace viewer
  // resolves a failing step back to the spec it ran, and a reader opening the
  // uploaded trace needs the file to still be there.
  if (result.error) throw result.error
  process.exit(result.status ?? 1)
}

/**
 * Run when this file is the program — under whichever name started it.
 *
 * `process.argv[1]` is the path the shell used, and npm links a bin as a
 * SYMLINK: started as `npx render-walk` it is `node_modules/.bin/render-walk`,
 * while `import.meta.url` is always the file behind the link. Comparing the
 * two unresolved leaves the bin doing nothing whatever and exiting 0 — a walk
 * that reports success without opening a browser, which is the worst failure
 * this file could have. So the argument is followed through the link first.
 */
const startedAs = (() => {
  try {
    return realpathSync(process.argv[1] ?? '')
  } catch {
    return ''
  }
})()
if (startedAs === fileURLToPath(import.meta.url)) main()
