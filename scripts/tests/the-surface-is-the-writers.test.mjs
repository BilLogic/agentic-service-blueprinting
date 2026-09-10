#!/usr/bin/env node
/**
 * `PANEL_WRITE_SURFACE`, checked against the WRITERS rather than against itself.
 *
 * The surface is a declaration: these are the tables and columns the authoring
 * UI writes directly, under the caller's own privileges, and therefore the ones
 * `check:seed-load` asks a real database whether a signed-in author may reach.
 * Nothing enforced it. It was hand-kept, it drifted, and the drift was not one
 * line — `cells`, `cell_touchpoints`, `evidence`, `audit_findings`, `slices`
 * and `slides` were all written by the app and named nowhere on it. Six of the
 * fourteen tables the app writes were missing, which makes the answer "the list
 * is not being maintained", not "somebody forgot a line".
 *
 * A declaration with a hole in it is worse than none. A reader consulting it to
 * answer "may the app change this table?" gets the wrong answer, and every
 * check built on it inherits the hole in silence — `check:seed-load` asked the
 * database about eight tables and reported that "every column the panels write
 * is reachable", which was true of the eight and false of the app.
 *
 * So the list stops being the source. The source is `src/`:
 *
 *   1. every table written directly is on the surface, or is named in
 *      `OUTSIDE_THE_SURFACE` with the reason it is not;
 *   2. every entry on the surface is still written by something — an entry
 *      nothing writes is a question asked of the database about a table the app
 *      forgot, and it fails here instead of passing forever;
 *   3. every exemption is still written by something too, so a stale exemption
 *      is deleted rather than left widening;
 *   4. every table and column NAMED on the surface exists in
 *      `src/types/database.ts`, so a rename fails loudly. This one earns its
 *      place twice: `has_column_privilege` RAISES on a column that does not
 *      exist, so without it a typo reaches CI as "the fresh-database seed load
 *      failed" and never mentions the column.
 *   5. every entry's column list matches a verb the writers actually use. The
 *      verbs themselves are derived (`writtenVerbsByTable`), so an entry cannot
 *      claim one nothing does; what it CAN still get wrong is the one verb it
 *      declares by hand — columns are an UPDATE claim, and a table with columns
 *      that nothing updates asks the database for a grant no author needs,
 *      while a table the app updates and lists no columns for asks nothing.
 *
 * The scan is `scripts/direct-table-writes.mjs`, shared with
 * `src/lib/writeBoundaryContract.test.ts` — that rule asks WHO writes and this
 * one asks WHAT they write, and two parsers of the same subject would be two
 * readers to drift from each other, which is the bug both rules exist to catch.
 *
 * The columns are the half no scan can reach: a payload is as often
 * `.update(next)` or `.update(patch)` as a literal. Rules 4 and 5 hold them.
 *
 * The VERBS are the half that used to be missing entirely. The surface asserted
 * UPDATE and nothing else while the app inserted into and deleted from five of
 * its tables (#368) — one verb wide instead of one table wide, the same defect
 * in a different axis. They come off this same scan now, so there is no list of
 * them to keep and none to forget.
 *
 * Run: npm test
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import {
  SRC,
  TABLE_WRITE,
  directTableWrites,
  walkSources,
  writtenTableNames,
  writtenVerbsByTable,
} from '../direct-table-writes.mjs'
import {
  ANY_SIGNED_IN_USER_MAY_WRITE,
  OUTSIDE_THE_SURFACE,
  PANEL_WRITE_SURFACE,
  PROBE_FIXTURES,
  buildWriteSurfaceSql,
  evaluateWriteSurface,
  writeSurfaceAssertions,
  writeSurfaceEntries,
} from '../panel-write-surface.mjs'
import { POPULATED } from '../check-seed-loads.mjs'
import { parseGeneratedTypes } from '../check-schema-inventory.mjs'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const read = (path) => readFileSync(join(ROOT, path), 'utf8')

/**
 * psql's `-At -F '|'` output for the real probe set, with named outcomes.
 *
 * A healthy run is every author write landing and every viewer write matching
 * nothing, so those are the defaults and a test names only the one it is about.
 */
const lines = (outcomes) =>
  writeSurfaceAssertions()
    .map(({ label, who }) => `${label}|${outcomes[label] ?? (who === 'author' ? 'wrote' : 'zero')}|`)
    .join('\n')

// ---------------------------------------------------------------------------
// The rules, as functions over data
// ---------------------------------------------------------------------------

/** Tables the app writes that neither the surface nor an exemption names. */
export function undeclaredWrites(written, surface, exempt) {
  const declared = new Set([
    ...Object.keys(surface),
    ...exempt.map((entry) => entry.table),
  ])
  return written.filter((table) => !declared.has(table)).sort()
}

/** Names on the surface (or exempted) that nothing in `src/` writes any more. */
export function namesNothingWrites(written, names) {
  const real = new Set(written)
  return names.filter((table) => !real.has(table)).sort()
}

/** `table.column` pairs on the surface that the generated types do not have. */
export function namesTheSchemaLacks(surface, schema) {
  const problems = []
  for (const [table, columns] of Object.entries(surface)) {
    const known = schema.get(table)
    if (!known) {
      problems.push(`public.${table} is on the write surface and not in the schema`)
      continue
    }
    for (const column of columns) {
      if (!known.has(column)) {
        problems.push(`public.${table}.${column} is on the write surface and not in the schema`)
      }
    }
  }
  return problems
}

/**
 * Entries listing columns for a table the app never UPDATEs.
 *
 * The columns ARE the UPDATE claim — they exist so `has_column_privilege` can
 * be asked about them. A table that is only inserted into and deleted from does
 * not need them, and asking for a grant no author needs makes the check look
 * broader than it is.
 */
export function columnsNothingUpdates(surface, verbs) {
  return Object.entries(surface)
    .filter(([table, columns]) => columns.length > 0 && !(verbs.get(table) ?? []).includes('UPDATE'))
    .map(([table]) => table)
    .sort()
}

/** Tables the app UPDATEs whose entry names no column to ask about. */
export function updatesNoColumnDeclares(surface, verbs) {
  return Object.entries(surface)
    .filter(([table, columns]) => columns.length === 0 && (verbs.get(table) ?? []).includes('UPDATE'))
    .map(([table]) => table)
    .sort()
}

// ---------------------------------------------------------------------------
// The matchers, exercised on fixtures — a rule that cannot fail is not a rule
// ---------------------------------------------------------------------------

test('undeclaredWrites names the table nobody declared', () => {
  // The bug, exactly as it happened: a mutation module writes a table, and the
  // declaration of what the app may write does not mention it.
  const written = ['cells', 'evidence', 'steps']
  const surface = { steps: ['summary'], cells: ['content'] }
  assert.deepEqual(undeclaredWrites(written, surface, []), ['evidence'])
})

test('an exemption is a declaration, not an absence', () => {
  const written = ['agent_messages', 'steps']
  const surface = { steps: ['summary'] }
  const exempt = [{ table: 'agent_messages', because: 'the agent transcript' }]
  assert.deepEqual(undeclaredWrites(written, surface, exempt), [])
})

test('namesNothingWrites names an entry the app has stopped writing', () => {
  // The other direction: a table dropped from the app leaves the surface asking
  // the database a question about a table nobody edits, and the answer being
  // yes is not evidence of anything.
  assert.deepEqual(namesNothingWrites(['steps'], ['steps', 'legacy_notes']), ['legacy_notes'])
})

test('namesTheSchemaLacks catches the rename and the typo', () => {
  const schema = new Map([['steps', new Set(['id', 'summary'])]])
  assert.deepEqual(namesTheSchemaLacks({ steps: ['summary', 'sumary'] }, schema), [
    'public.steps.sumary is on the write surface and not in the schema',
  ])
  assert.deepEqual(namesTheSchemaLacks({ stps: ['summary'] }, schema), [
    'public.stps is on the write surface and not in the schema',
  ])
})

test('columnsNothingUpdates catches the entry claiming an update nothing makes', () => {
  // The verb axis of the drift: `slides` stops being edited in place and is only
  // replaced wholesale, and its column list goes on asking for an UPDATE grant.
  const verbs = new Map([
    ['steps', ['UPDATE']],
    ['slides', ['DELETE', 'INSERT']],
  ])
  const surface = { steps: ['summary'], slides: ['illustration'] }
  assert.deepEqual(columnsNothingUpdates(surface, verbs), ['slides'])
  assert.deepEqual(columnsNothingUpdates({ steps: ['summary'] }, verbs), [])
})

test('updatesNoColumnDeclares catches the other direction', () => {
  const verbs = new Map([['steps', ['UPDATE']]])
  assert.deepEqual(updatesNoColumnDeclares({ steps: [] }, verbs), ['steps'])
  assert.deepEqual(updatesNoColumnDeclares({ steps: ['summary'] }, verbs), [])
})

test('the verbs come off the writers, and upsert counts as both', () => {
  // `upsert` is `insert … on conflict do update`. Asserting one of the two would
  // be asking half the question, and the unasked half is the one that breaks.
  const verbs = writtenVerbsByTable([
    { table: 'evidence', verb: 'insert' },
    { table: 'evidence', verb: 'delete' },
    { table: 'evidence', verb: 'update' },
    { table: 'agent_sessions', verb: 'upsert' },
  ])
  assert.deepEqual(verbs.get('evidence'), ['DELETE', 'INSERT', 'UPDATE'])
  assert.deepEqual(verbs.get('agent_sessions'), ['INSERT', 'UPDATE'])
})

test('a refused write is a failure, in the words it costs', () => {
  // The grant half, now answered by the write itself: revoke it and the author
  // meets a 42501 that the panel shows as "permission denied".
  const [insertProblem] = evaluateWriteSurface(
    lines({ 'author insert evidence': 'refused' }),
  ).filter((problem) => problem.includes('INSERT on public.evidence'))
  assert.match(insertProblem, /permission denied/)
  const [deleteProblem] = evaluateWriteSurface(
    lines({ 'author delete slices': 'refused' }),
  ).filter((problem) => problem.includes('DELETE on public.slices'))
  assert.match(deleteProblem, /permission denied/)
})

test('a write that matched nothing says what silence looks like', () => {
  // The failure mode the whole file is for, and the one the old existence test
  // could not see: the statement runs, changes nothing, and returns 200.
  const save = evaluateWriteSurface(lines({ 'author update cells.summary': 'zero' })).filter(
    (one) => one.startsWith('no policy lets an author UPDATE public.cells.summary'),
  )
  assert.equal(save.length, 1)
  assert.match(save[0], /that row no longer exists/)
  const remove = evaluateWriteSurface(lines({ 'author delete slices': 'zero' })).filter((one) =>
    one.startsWith('no policy lets an author DELETE public.slices'),
  )
  assert.equal(remove.length, 1)
  assert.match(remove[0], /returns 200/)
})

test('a signed-in reader who CAN write is a failure too', () => {
  // The other direction, and the one that keeps the first from being vacuous.
  // A database that let everybody write would pass every author probe.
  const problems = evaluateWriteSurface(lines({ 'viewer update cells': 'wrote' })).filter((one) =>
    one.startsWith('a signed-in reader can UPDATE public.cells'),
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /ANY_SIGNED_IN_USER_MAY_WRITE/)
  // And a viewer who is turned away is not a problem at all, by either route.
  assert.deepEqual(evaluateWriteSurface(lines({ 'viewer update cells': 'refused' })), [])
  assert.deepEqual(evaluateWriteSurface(lines({})), [])
})

test('a table with no row to write is a failure, not a pass', () => {
  // An empty table answers zero rows for a reason that has nothing to do with
  // permission, so it must not be read as one.
  const problems = evaluateWriteSurface(lines({ 'author update evidence.title': 'norow' })).filter(
    (one) => one.startsWith('public.evidence is empty'),
  )
  assert.equal(problems.length, 1)
  assert.match(problems[0], /PROBE_FIXTURES/)
})

test('a probe that did not run is a failure, not a write that happened', () => {
  // The typo case. `has_column_privilege` used to RAISE on a column that does
  // not exist; the probe raises 42703 instead, and the one thing it must not do
  // is let that read as a successful write.
  const problems = evaluateWriteSurface(
    lines({ 'author update cells.summary': 'error' }).replace(
      'author update cells.summary|error|',
      'author update cells.summary|error|42703 column "summary" does not exist',
    ),
  ).filter((one) => one.startsWith('the update probe on public.cells.summary did not run'))
  assert.equal(problems.length, 1)
  assert.match(problems[0], /42703/)
})

test('a probe the read never reached is a failure, not a pass', () => {
  // The whole-file failure mode: a truncated read answers nothing, and every
  // question it skipped would otherwise be counted as satisfied.
  const problems = evaluateWriteSurface('')
  assert.equal(problems.length, writeSurfaceAssertions().length)
  assert.ok(problems.every((one) => one.endsWith('the write-surface probe never reached it')))
})

test('the scan reads writes, and not reads or uploads', () => {
  // Both shapes are everywhere in the app and both are correct where they are.
  // Asserted here as well as in the write-boundary contract, because this rule
  // now shares that scan and a widening of it would condemn the read layer in
  // two places at once.
  assert.equal("await client.from('cells').select('id, title').eq('id', id)".match(TABLE_WRITE), null)
  assert.equal(
    'client.storage.from(ILLUSTRATION_BUCKET).upload(path, file, { upsert: true })'.match(TABLE_WRITE),
    null,
  )
  const multiline = [
    'const { error } = await client',
    "  .from('slides')",
    '  .update({',
    '    illustration: next,',
    '  })',
    "  .eq('id', itemId)",
  ].join('\n')
  assert.deepEqual([...multiline.matchAll(TABLE_WRITE)].map((m) => [m[1], m[2]]), [
    ['slides', 'update'],
  ])
})

// ---------------------------------------------------------------------------
// The repository
// ---------------------------------------------------------------------------

const WRITES = directTableWrites(SRC)
const WRITTEN = writtenTableNames(WRITES)

test('the walk sees the whole of src, not a list of roots', () => {
  // A walk that silently found nothing would pass every assertion below, so
  // hold it to the facts that make the scan meaningful: it reaches files, it
  // reaches them outside `lib/`, and it finds writes at all.
  const sources = walkSources(SRC)
  assert.ok(sources.length > 0)
  assert.ok(sources.some((one) => one.startsWith('components/')))
  assert.ok(WRITES.length > 0)
  assert.ok(WRITTEN.length > 0)
})

test('every table the app writes directly is declared, or exempted with a reason', () => {
  const undeclared = undeclaredWrites(WRITTEN, PANEL_WRITE_SURFACE, OUTSIDE_THE_SURFACE)
  assert.deepEqual(
    undeclared,
    [],
    'The app writes these tables directly and the write surface does not mention them: ' +
      `${undeclared.join(', ')}.\n` +
      'Add each to PANEL_WRITE_SURFACE with the columns its `.update({…})` names, so ' +
      'check:seed-load asks the database whether a signed-in author may write them — or, ' +
      'if it is deliberately outside the surface, add it to OUTSIDE_THE_SURFACE and say why. ' +
      'One of the two, not silence.',
  )
})

test('every exemption states its reason', () => {
  const silent = OUTSIDE_THE_SURFACE.filter((entry) => entry.because.trim() === '').map(
    (entry) => entry.table,
  )
  assert.deepEqual(
    silent,
    [],
    'An exemption without a reason is indistinguishable from an oversight: ' + silent.join(', '),
  )
})

test('nothing is declared, or exempted, that the app has stopped writing', () => {
  const stale = namesNothingWrites(WRITTEN, [
    ...Object.keys(PANEL_WRITE_SURFACE),
    ...OUTSIDE_THE_SURFACE.map((entry) => entry.table),
  ])
  assert.deepEqual(
    stale,
    [],
    'The write surface names tables that nothing under src/ writes any more: ' +
      `${stale.join(', ')}. Remove them — an assertion about a table the app does not ` +
      'edit proves nothing, and it makes the list look maintained when it is not.',
  )
})

test('every entry claims exactly the update its writers make', () => {
  const verbs = writtenVerbsByTable(WRITES)
  const claiming = columnsNothingUpdates(PANEL_WRITE_SURFACE, verbs)
  assert.deepEqual(
    claiming,
    [],
    'These entries list columns and nothing under src/ updates the table: ' +
      `${claiming.join(', ')}. The columns are the UPDATE claim — drop them, or ` +
      'the check asks the database for a grant no author needs.',
  )
  const silent = updatesNoColumnDeclares(PANEL_WRITE_SURFACE, verbs)
  assert.deepEqual(
    silent,
    [],
    'The app updates these tables and the surface names no column for them: ' +
      `${silent.join(', ')}. An entry with no columns asks the database nothing ` +
      'about the update it is on the surface for.',
  )
})

test('the surface asks about every verb the app uses, on every table it uses it', () => {
  // The rule this file was widened for. Derived on both sides, so it cannot be
  // satisfied by editing a list — it is satisfied by the assertions being built
  // from the writers, and it fails if that ever stops being true.
  const verbs = writtenVerbsByTable(WRITES)
  // `grant update steps.summary` asks about `steps`; the table is what a verb is
  // asked of, and the column is which update.
  const asked = new Set(
    writeSurfaceAssertions().map(({ label }) => {
      const [who, verb, what] = label.split(' ')
      return `${who} ${verb} ${what.split('.')[0]}`
    }),
  )
  const missing = []
  for (const table of Object.keys(PANEL_WRITE_SURFACE)) {
    for (const verb of verbs.get(table) ?? []) {
      const lower = verb.toLowerCase()
      if (!asked.has(`author ${lower} ${table}`)) missing.push(`author ${lower} ${table}`)
      if (ANY_SIGNED_IN_USER_MAY_WRITE[table] !== undefined) continue
      if (!asked.has(`viewer ${lower} ${table}`)) missing.push(`viewer ${lower} ${table}`)
    }
  }
  assert.deepEqual(missing, [], `The database is never asked about: ${missing.join(', ')}.`)
  // And the shape the issue named: five tables the app inserts into or deletes
  // from, none of which the surface used to ask about at all.
  const beyondUpdate = writeSurfaceEntries().filter((entry) => entry.verbs.length > 1)
  assert.ok(beyondUpdate.length > 0)
})

test('every name on the write surface is a name the schema has', () => {
  const schema = parseGeneratedTypes(read('src/types/database.ts'))
  const problems = namesTheSchemaLacks(PANEL_WRITE_SURFACE, schema)
  assert.deepEqual(
    problems,
    [],
    `${problems.join('\n')}\n\n` +
      'A renamed column leaves the surface pointing at nothing. Worse, ' +
      '`has_column_privilege` RAISES on a column that does not exist, so check:seed-load ' +
      'reports it as "the fresh-database seed load failed" and never names the column. ' +
      'Rename it here too, or regenerate src/types/database.ts if the schema moved.',
  )
})

test('every surface table has a row for the probe to write', () => {
  // The probe attempts a real UPDATE and DELETE, and both match zero rows on an
  // empty table for a reason that is not permission. Either the seed fills the
  // table or PROBE_FIXTURES stands one row up in it — not neither.
  const seeded = new Set(POPULATED)
  const empty = Object.keys(PANEL_WRITE_SURFACE).filter(
    (table) => !seeded.has(table) && PROBE_FIXTURES[table] === undefined,
  )
  assert.deepEqual(
    empty,
    [],
    'These surface tables are neither populated by the seed nor given a row by ' +
      `PROBE_FIXTURES: ${empty.join(', ')}. The probe would attempt its write against ` +
      'an empty table and read the zero rows as a policy that refuses.',
  )
  // And the other direction: a fixture for a table the seed now fills is dead
  // weight, and one for a table that is not on the surface asks nothing.
  const pointless = Object.keys(PROBE_FIXTURES).filter(
    (table) => PANEL_WRITE_SURFACE[table] === undefined,
  )
  assert.deepEqual(pointless, [], `PROBE_FIXTURES names tables off the surface: ${pointless.join(', ')}.`)
})

test('an ungated table is named, reasoned, and still asked about as an author', () => {
  // The exception is a smaller claim, not an exemption: the author probe still
  // runs, and only the viewer half is skipped. Silence about it would be the
  // same hole in a different place, so the reason is required and printed on
  // every green run.
  for (const [table, because] of Object.entries(ANY_SIGNED_IN_USER_MAY_WRITE)) {
    assert.ok(
      PANEL_WRITE_SURFACE[table] !== undefined,
      `ANY_SIGNED_IN_USER_MAY_WRITE names ${table}, which is not on the write surface.`,
    )
    assert.ok(
      because.trim().length > 0,
      `ANY_SIGNED_IN_USER_MAY_WRITE gives no reason for ${table}; an entry without one ` +
        'is indistinguishable from an oversight.',
    )
  }
  const labels = writeSurfaceAssertions().map(({ label }) => label)
  for (const table of Object.keys(ANY_SIGNED_IN_USER_MAY_WRITE)) {
    assert.ok(labels.some((label) => label.startsWith(`author update ${table}.`)))
    assert.ok(!labels.some((label) => label === `viewer update ${table}`))
  }
})

test('the probe becomes the role, and undoes everything it did', () => {
  // Three properties the SQL cannot be allowed to lose quietly. Run as the
  // owner it would prove nothing — `service_role` and a superuser both bypass
  // RLS, which is the exact failure this check exists to catch — and a probe
  // that committed would leave its writes for the anon inventory read that
  // follows it.
  const sql = buildWriteSurfaceSql()
  assert.match(sql, /set local role authenticated/)
  assert.match(sql, /request\.jwt\.claims/)
  assert.match(sql, /^begin;/)
  assert.match(sql, /rollback;\s*$/)
  assert.equal(/\bcommit;/.test(sql), false)
  // Both people, spelled by their claims and not by their names.
  assert.match(sql, /"app_metadata":\{"role":"service"\}/)
  assert.match(sql, /"app_metadata":\{\}/)
})
