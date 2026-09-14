#!/usr/bin/env node
/**
 * Every place under `src/` that writes a table directly, found by walking.
 *
 * Two rules ask a question of this same set, and until #354 only one of them
 * asked it at all:
 *
 *   - `src/lib/writeBoundaryContract.test.ts` asks WHO writes. A write outside
 *     the mutation layer skips the ledger, and the app's only undo is as
 *     complete as the writes that reach it.
 *   - `scripts/tests/the-surface-is-the-writers.test.mjs` asks WHAT they write.
 *     A table written under the caller's own privileges and absent from
 *     `PANEL_WRITE_SURFACE` is a grant and an UPDATE policy that nothing ever
 *     asks the database for.
 *
 * ONE SCANNER, so the two cannot disagree about what a write is. The sibling
 * rule next door — `scripts/tests/who-writes-what.test.mjs` — states the reason
 * in its own header: a second parser of the same subject is a second reader to
 * drift from the first, and drift is precisely what both of these rules exist
 * to catch.
 *
 * **The walk starts at the application's root, deliberately.** A guard that
 * scans a list of named roots covers only the directories that existed the day
 * it was written. Starting at the root and naming the exceptions inverts that:
 * a new directory is covered the moment it appears, and a new writer has to
 * argue for itself.
 *
 * WHERE THAT ROOT IS, this file does not decide, and it no longer walks. It
 * used to be this repository's own `src`, spelled once here so no consumer had
 * to — which is the right shape and was the wrong fact: a deployment installs
 * this repository as a package and reads the application out of
 * `node_modules/agentic-service-blueprinting/src`, keeping no `src` of its own.
 * A walk pointed at the `src` that is not there finds no file, reports no
 * write, and every rule built on it passes — `PANEL_WRITE_SURFACE` matches an
 * empty set of writers, `check:seed-load` asks the database about nothing, and
 * the green line is identical to the one a healthy run prints. So the files
 * come from the `app` subject of `scripts/sweep.mjs`, which resolves the
 * application's layers, refuses a tree that has none, AND REFUSES A WALK THAT
 * FINDS NO FILE — the three answers this file used to give itself.
 *
 * A PATH IS `src/…`, the way a finding prints it wherever the application
 * physically is, which is what the sweep hands back and what every consumer of
 * this scan reports.
 *
 * Two shapes look like writes and are not, and both are asserted by the tests
 * that use this rather than left to the pattern's good behaviour:
 *
 *   - **Reads.** The hooks are full of `.from(…).select(…)`, which is where
 *     reads belong. Only the four write verbs count.
 *   - **Storage.** `client.storage.from(BUCKET)` takes a bucket identifier,
 *     not a quoted table name, so an upload cannot trip this.
 */
import { fileURLToPath } from 'node:url'

import { sweep } from './sweep.mjs'

/** The tree this scan runs in — the deployment's root, or this repository's. */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))

/**
 * The application's `.ts` and `.tsx` under `repoRoot`, test files excluded,
 * as the sweep that lists them — its `files` and `read` are what a consumer
 * walks and opens.
 *
 * A function rather than a constant, because the answer is a question about a
 * disk that may have no application at all, and the sweep refuses that case by
 * name. A constant would have had to answer it at import time, on every import,
 * including the ones that never read a file.
 *
 * A TEST FILE IS NOT A WRITER. Its `.from('slides').update(…)` is a fixture
 * proving the scan sees the shape, and a scan that read its own evidence would
 * report every guard in the suite as an offender.
 */
export function appSources(repoRoot = REPO_ROOT) {
  return sweep({
    subject: 'app',
    root: repoRoot,
    where: (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path),
    what: '.ts or .tsx source',
  })
}

/**
 * `.from('table')` followed by a write verb: table in group 1, verb in group 2.
 *
 * The window is generous because the verb is rarely adjacent — a formatted
 * chain puts `.update({…})` several lines and a whole payload after the
 * `.from`. The quoted table name is what keeps this off storage.
 *
 * Global, and shared: `String#match` and `String#matchAll` both leave
 * `lastIndex` where they found it, so passing this constant around is safe in a
 * way a `RegExp#test` loop over it would not be.
 */
export const TABLE_WRITE =
  /\.from\(\s*'([a-z_]+)'\s*\)[\s\S]{0,200}?\.(update|insert|upsert|delete)\s*\(/g

/**
 * `{ path, line, table, verb }` for every direct table write in `swept`.
 *
 * `path` is the `src/…` path a finding prints, and `line` is 1-based, so a
 * failure can name the offending call the way an editor does.
 * `src/lib/sliceMutations.ts` reads the same whether that `src` is this
 * repository's or the package's.
 *
 * A SET WITH NO WRITERS IN IT SATISFIES EVERY RULE OVER IT AT ONCE: nothing is
 * undeclared, nothing is unexempted, nothing writes a table it may not. That is
 * the one answer this scan must never return quietly, and the sweep refuses it
 * before this function is reached — an application with no `.ts` or `.tsx` in
 * it is a walk with no subject.
 *
 * @param {{ files: string[], read: (path: string) => string | null }} [swept]
 */
export function directTableWrites(swept = appSources()) {
  const writes = []
  for (const path of swept.files) {
    // A file the listing named and the tree no longer has is skipped, which is
    // the sweep's own rule and the reason `read` answers null rather than
    // throwing; every other failure throws there.
    const source = swept.read(path)
    if (source === null) continue
    for (const match of source.matchAll(TABLE_WRITE)) {
      writes.push({
        path,
        line: source.slice(0, match.index).split('\n').length,
        table: match[1],
        verb: match[2],
      })
    }
  }
  return writes
}

/** The distinct table names, sorted — what the write surface is compared to. */
export function writtenTableNames(writes) {
  return [...new Set(writes.map((write) => write.table))].sort()
}

/**
 * The privileges each client verb actually needs from the database.
 *
 * `upsert` is `insert … on conflict do update`, so it needs both; asking for
 * one of them would be asking half the question, and the half it skipped is
 * the one that fails on a Tuesday.
 */
export const VERB_PRIVILEGES = {
  update: ['UPDATE'],
  insert: ['INSERT'],
  upsert: ['INSERT', 'UPDATE'],
  delete: ['DELETE'],
}

/**
 * `table -> sorted SQL privileges`, taken from the writers themselves.
 *
 * This is the half of the write surface nobody has to keep by hand. The scan
 * had to read the verb to find the table at all: `.from('evidence')` is not a
 * write until something in the next two hundred characters says `.delete(`. So
 * the verb is already in hand, and a list of verbs kept beside the code rather
 * than taken from it is the shape of the defect this replaces.
 */
export function writtenVerbsByTable(writes) {
  const byTable = new Map()
  for (const write of writes) {
    if (!byTable.has(write.table)) byTable.set(write.table, new Set())
    for (const privilege of VERB_PRIVILEGES[write.verb]) byTable.get(write.table).add(privilege)
  }
  return new Map([...byTable].map(([table, verbs]) => [table, [...verbs].sort()]))
}
