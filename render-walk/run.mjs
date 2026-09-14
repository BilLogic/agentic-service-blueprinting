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
 * ── AND WHY THE PORT IS CHOSEN HERE ────────────────────────────────────────
 *
 * The walk previews on a port and asserts against what answers there, so the
 * port is part of the subject. A fixed one makes the walk a thing only one
 * tree on a machine may run: a second checkout walking at the same time, or a
 * preview somebody left up, holds 4173, and the run that finds it held has
 * nothing honest to do but abort — a red that reads like a regression in the
 * application and is a fact about somebody else's shell.
 *
 * So the port is decided per run, here, before Playwright is started: the
 * default if it is free, and the next free one above it otherwise. Two walks
 * started in the same second get 4173 and 4174 and each walks its own build.
 * `RENDER_WALK_PORT` still names a port outright, and is then the ONE fixed
 * port left in the arrangement — so a held one is refused by name here rather
 * than walked, because the caller asked for that port and not for another.
 *
 * The choice is passed on as `RENDER_WALK_PORT` itself, which is the config's
 * own override and the only thing it reads; nothing new crosses the seam.
 *
 * Run: node node_modules/agentic-service-blueprinting/render-walk/run.mjs
 *      (or, by the bin the package installs: npx render-walk)
 * Here: npm run check:render-walk
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
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

/** The port the walk previews on when nothing else holds it. */
export const DEFAULT_PORT = 4173

/**
 * How many ports up from the default one run will try before it gives up.
 *
 * A bound rather than a scan: a machine where thirty-two consecutive ports are
 * all held is not a machine with a busy preview on it, and a walk that keeps
 * climbing would eventually settle on a port belonging to something else's
 * arrangement. Thirty-two is more concurrent walks than a checkout will ever
 * have and few enough that exhausting them is worth saying out loud.
 */
export const PORT_WINDOW = 32

/**
 * Whether `port` can be listened on right now.
 *
 * Binding is the question asked rather than connecting, because the thing that
 * matters is whether the PREVIEW will come up — a socket held by a process
 * that accepts nothing fails the walk exactly as a stale preview does, and a
 * connection test would call that port free. `127.0.0.1` is where the preview
 * binds and where the walk's `baseURL` points, so it is where the question is
 * asked.
 */
export function portIsFree(port) {
  return new Promise((resolve) => {
    const probe = createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, '127.0.0.1')
  })
}

/** Where a run says, machine-wide, that a port is spoken for. */
const claimPath = (port) => join(tmpdir(), `render-walk-port-${port}`)

/** Whether the run that wrote a claim is still running. */
function claimIsLive(path) {
  let pid
  try {
    pid = Number(readFileSync(path, 'utf8'))
  } catch {
    return false
  }
  if (!Number.isInteger(pid) || pid < 1) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // Alive and owned by somebody else is still alive.
    return error.code === 'EPERM'
  }
}

/**
 * Take this run's claim on `port`, or answer false because another run holds it.
 *
 * FREE IS NOT YET TAKEN, and the gap is the whole reason this exists. Between
 * the bind test above and the moment Vite binds for real there are a couple of
 * seconds of Playwright starting up, and two walks launched together spend
 * them both believing 4173 is theirs. Then one of them loses `--strictPort`
 * and reports a preview that would not start. The claim closes that window:
 * `wx` is one atomic create, so exactly one of the two runs gets it.
 *
 * A claim is removed on the way out, and one left behind by a run that was
 * killed is taken over rather than believed — the pid in it is a process that
 * no longer exists, and a file in the temporary directory must never be able
 * to make a port permanently unwalkable.
 */
export function claimPort(port) {
  const path = claimPath(port)
  const write = () => writeFileSync(path, String(process.pid), { flag: 'wx' })
  try {
    write()
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    if (claimIsLive(path)) return false
    try {
      unlinkSync(path)
      write()
    } catch {
      // Another run took over the same stale claim first. It holds the port.
      return false
    }
  }
  process.on('exit', () => {
    try {
      unlinkSync(path)
    } catch {
      // Already gone, or never ours to remove.
    }
  })
  return true
}

/**
 * The port this run will preview on: the first inside the window that nothing
 * is listening on and no other run has claimed — or null if the window is used
 * up, which is a refusal rather than a thirty-third try.
 */
export async function choosePort(from = DEFAULT_PORT, window = PORT_WINDOW) {
  for (let port = from; port < from + window && port <= 65535; port += 1) {
    if ((await portIsFree(port)) && claimPort(port)) return port
  }
  return null
}

/** Whether `asked` spells a port, as opposed to a typo the config will refuse. */
const isPort = (asked) => Number.isInteger(asked) && asked >= 1 && asked <= 65535

/**
 * The port to hand Playwright, or null after saying why there is none.
 *
 * The two answers are the two honest outcomes. A port nobody holds means a
 * walk over THIS tree's build. A port the caller named and somebody else holds
 * means a refusal that says which port and how to find out whose it is —
 * never a reuse, because what is on the other end is somebody else's dist and
 * a green walk over it would be a lie about this working tree.
 *
 * Whether `RENDER_WALK_PORT` is a number at all is the config's refusal and
 * not this one's: it is the file that reads the variable, and one place to say
 * "that is not a port" is enough. This one answers only whether the port is
 * free.
 */
export async function portForThisRun(asked = process.env.RENDER_WALK_PORT) {
  if (asked !== undefined && asked !== '') {
    const port = Number(asked)
    if (isPort(port) && !(await portIsFree(port))) {
      console.error(
        `The render walk was asked for port ${port} — RENDER_WALK_PORT — and something is ` +
          `already listening there.\n` +
          `It will not walk a preview it did not start: what is on that port serves some other ` +
          `build, and a walk over it says nothing about this tree.\n\n` +
          `  lsof -i :${port}    # names what is holding it\n\n` +
          `Stop that, or leave RENDER_WALK_PORT unset and the walk will find a free port itself.\n`,
      )
      return null
    }
    // Including a port that is not a port: the config refuses that, by name.
    return asked
  }

  const chosen = await choosePort()
  if (chosen === null) {
    console.error(
      `The render walk found no free port between ${DEFAULT_PORT} and ` +
        `${DEFAULT_PORT + PORT_WINDOW - 1}, so it has nowhere to preview this build.\n` +
        `Stop whatever is holding them — \`lsof -i :${DEFAULT_PORT}\` names the first — or name ` +
        `a port yourself:\n\n` +
        `  RENDER_WALK_PORT=5273 npm run check:render-walk\n`,
    )
    return null
  }
  return String(chosen)
}

async function main() {
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

  // Before anything is staged or started: a run with no port to preview on is
  // a run that must not reach the specs at all, since a walk that collected
  // its tests and then failed to start a server reads as a broken application.
  const port = await portForThisRun()
  if (port === null) process.exit(1)
  process.env.RENDER_WALK_PORT = port
  // Said out loud because nothing downstream says it: Playwright does not
  // surface the preview's own banner, and a person reading a trace or a
  // `--headed` run is looking at an address they did not pick.
  console.log(`render-walk: previewing on http://localhost:${port}`)

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
if (startedAs === fileURLToPath(import.meta.url)) await main()
