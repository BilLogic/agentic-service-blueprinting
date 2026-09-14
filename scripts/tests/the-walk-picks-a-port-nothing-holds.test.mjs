/**
 * THE PORT THE WALK PREVIEWS ON IS ONE NOBODY ELSE HOLDS.
 *
 * The walk asserts against whatever answers on its port, so a port somebody
 * else holds is a subject somebody else built. The runner therefore decides
 * the port before it starts Playwright — the default if it is free, the next
 * free one above it otherwise — and a port the CALLER named that is held is
 * refused by name rather than walked.
 *
 * What is held here is the two ways that goes wrong. A chooser that only asks
 * the operating system whether a port is free hands the same port to two walks
 * launched together, because neither has bound it yet; one of them then loses
 * `--strictPort` and reports a preview that would not start, which reads as a
 * broken application. And a refusal that arrives after Playwright has started
 * is a red run with tests in it, where the honest answer is no run at all.
 *
 * The walk itself is not driven from here — it needs a build, a preview and a
 * browser, and `npm run check:render-walk` is that.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { join } from 'node:path'

import {
  DEFAULT_PORT,
  PORT_WINDOW,
  choosePort,
  claimPath,
  claimPort,
  portIsFree,
} from '../../render-walk/run.mjs'

const ROOT = new URL('../..', import.meta.url).pathname

/** A listener on a free port, closed when the test that opened it is done. */
async function listening(host = '127.0.0.1') {
  const server = createServer()
  await new Promise((resolve) => server.listen(0, host, resolve))
  return { port: server.address().port, close: () => new Promise((r) => server.close(r)) }
}

/**
 * A free port with no claim on it.
 *
 * The operating system hands out an ephemeral port that an earlier test in
 * this same process may already have claimed, and a claim written by THIS
 * process is a live one — correctly, since a claim is about a run and these
 * tests are one run. So the claim is cleared first: what is under test is the
 * arbitration between runs, not the ports a kernel happens to recycle.
 */
async function unclaimed() {
  const { port, close } = await listening()
  await close()
  rmSync(claimPath(port), { force: true })
  return port
}

/** A pid that belonged to a process and does not any more. */
function pidOfSomethingFinished() {
  const finished = spawnSync(process.execPath, ['-e', ''])
  return finished.pid
}

test('a port something is listening on is never the port the walk picks', async () => {
  const held = await listening()
  try {
    assert.equal(await portIsFree(held.port), false)
    assert.equal(await choosePort(held.port, 4) > held.port, true)
  } finally {
    await held.close()
  }
})

test('a port held on the other address family is held, not free', async () => {
  // The bind test this replaced said FREE here, on macOS: a server on the IPv6
  // wildcard leaves `127.0.0.1` bindable, so the preview would come up on one
  // family while `localhost` — the walk's own baseURL — resolved to the
  // stranger on the other. That is a green walk over somebody else's build,
  // which is the one outcome this whole arrangement exists to prevent.
  const held = await listening('::')
  try {
    assert.equal(await portIsFree(held.port), false)
  } finally {
    await held.close()
  }
})

test('a port another live walk has claimed is not picked either', async () => {
  // The window between a free port and a bound one: this run holds the claim
  // and nothing is listening, and the next walk along has to see that.
  const port = await unclaimed()

  assert.equal(await portIsFree(port), true)
  assert.equal(claimPort(port), true)
  assert.equal(claimPort(port), false, 'the same port was handed out twice')
  assert.equal(await choosePort(port, 4) > port, true)
})

test('a claim left behind by a run that is gone is taken over, not believed', async () => {
  const port = await unclaimed()
  const claim = claimPath(port)
  writeFileSync(claim, String(pidOfSomethingFinished()))

  // Otherwise a killed walk would make a port unwalkable until somebody
  // thought to look in the temporary directory.
  assert.equal(claimPort(port), true)
  assert.equal(existsSync(claim), true)
})

test('the window is a bound, and running out of it is an answer rather than a scan', async () => {
  assert.equal(await choosePort(65534, PORT_WINDOW) !== null, true)
  // Nothing above 65535 to try, so there is nowhere left rather than a wrap.
  assert.equal(await choosePort(65536, PORT_WINDOW), null)
})

test('a port the caller named and somebody else holds is refused, and no test runs', async () => {
  const held = await listening()
  try {
    const refused = spawnSync(process.execPath, [join(ROOT, 'render-walk', 'run.mjs')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, RENDER_WALK_PORT: String(held.port) },
    })

    assert.equal(refused.status, 1)
    assert.match(refused.stderr, new RegExp(`port ${held.port}`))
    // The point of refusing before Playwright starts: a walk with nowhere to
    // preview reports nothing about the application, so it collects nothing.
    assert.doesNotMatch(refused.stdout, /Running \d+ test/)
  } finally {
    await held.close()
  }
})

test('a port the caller named and another walk has claimed is refused too', async () => {
  // Nothing is listening yet — the other walk is still starting Playwright up
  // — so the port would test free. Naming a port is not a way past that: two
  // previews on one port is one preview and one `--strictPort` failure.
  const port = await unclaimed()
  assert.equal(claimPort(port), true)

  const refused = spawnSync(process.execPath, [join(ROOT, 'render-walk', 'run.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, RENDER_WALK_PORT: String(port) },
  })

  assert.equal(refused.status, 1)
  assert.match(refused.stderr, new RegExp(`port ${port}`))
  assert.match(refused.stderr, /another render walk/)
  assert.doesNotMatch(refused.stdout, /Running \d+ test/)
})

test('the config falls back to the port the runner defaults to', () => {
  // Two published files spell this number: the runner, which chooses, and the
  // config, for the one path the runner is not on. A test asserting the
  // constant against itself could not notice the config drifting off it, so
  // the config's own literal is what is read.
  const config = readFileSync(join(ROOT, 'render-walk', 'playwright.config.ts'), 'utf8')
  const fallback = config.match(/RENDER_WALK_PORT \|\| (\d+)/)

  assert.notEqual(fallback, null, 'the config no longer falls back to a literal port')
  assert.equal(Number(fallback[1]), DEFAULT_PORT)
})
