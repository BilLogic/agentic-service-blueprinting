/**
 * THE RUNNER THE ENROLMENT COMMAND NAMES.
 *
 * `render-walk/run.mjs` exists because neither Playwright nor Node will
 * compile a TypeScript file that lives under `node_modules`, so a deployment
 * cannot point Playwright at the published config in place; the runner copies
 * the published directory out first and hands Playwright the copy. Its own
 * header carries that account. What is worth holding here is the two
 * properties the copy has to have, and the one thing it does instead of `npx`.
 *
 * The walk itself is not driven from here — it needs a build, a preview and a
 * browser, and `npm run check:render-walk` is that, in CI and locally, through
 * this same file. What IS driven from here is the runner started under another
 * name, because that failure is silent: a bin npm linked is a symlink, and a
 * runner that does not recognise itself through one exits 0 having walked
 * nothing.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { PUBLISHED, STAGED, playwrightCli, stage } from '../../render-walk/run.mjs'

const ROOT = new URL('../..', import.meta.url).pathname

/** A throwaway tree standing in for the root a deployment runs the walk from. */
const consumer = () => mkdtempSync(join(tmpdir(), 'render-walk-'))

test('the published directory is staged under the tree being walked, byte for byte', () => {
  const root = consumer()
  const staged = stage(root)

  assert.equal(staged, join(root, STAGED))
  // Every published file, with the bytes the install shipped — the config and
  // the specs above all, since those are what Playwright reads.
  for (const name of readdirSync(PUBLISHED)) {
    assert.deepEqual(
      readFileSync(join(staged, name)),
      readFileSync(join(PUBLISHED, name)),
      `${name} was not staged byte for byte`,
    )
  }
})

test('a file an older pin left behind is gone, not collected', () => {
  const root = consumer()
  mkdirSync(join(root, STAGED), { recursive: true })
  writeFileSync(join(root, STAGED, 'retired.spec.ts'), 'test("from an older pin", () => {})')

  const staged = stage(root)

  assert.equal(readdirSync(staged).includes('retired.spec.ts'), false)
})

test('Playwright is resolved out of the tree being walked, and its absence is answerable', () => {
  // This repository installs it, so the CLI is the file the bin points at.
  const cli = playwrightCli(ROOT)
  assert.equal(
    cli,
    join(dirname(new URL(import.meta.resolve('playwright/package.json')).pathname), 'cli.js'),
  )

  // A tree with no Playwright answers null rather than handing `npx` a name to
  // download some other version under.
  assert.equal(playwrightCli(consumer()), null)
})

test('started through the symlink npm links the bin as, it still runs', () => {
  // The failure this holds off is a green run that opened no browser: a `main`
  // guard comparing `process.argv[1]` to this file unresolved sees two
  // different paths under `npx render-walk` and does nothing at all.
  const root = consumer()
  const link = join(root, 'render-walk')
  symlinkSync(join(PUBLISHED, 'run.mjs'), link)

  // In a tree with no Playwright, which is the cheapest thing the runner has
  // to say — and it says it only if it ran.
  const started = spawnSync(process.execPath, [link], { cwd: root, encoding: 'utf8' })

  assert.equal(started.status, 1)
  assert.match(started.stderr, /needs Playwright/)
})
