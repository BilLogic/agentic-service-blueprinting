import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

/**
 * The client may edit a placement's DETAIL and nothing about where it sits.
 *
 * A placement exists because a cell's text names a touchpoint, and one rule
 * decides whether that is allowed to happen: only a touchpoint-BEARING cell
 * gets placements, because `cells.content` on an actor lane is a sentence
 * about what somebody did, and syncing it would file that sentence in the
 * catalog as a tool. That rule lives inside `sync_cell_touchpoints`
 * (20260830160000) and is proven there in SQL.
 *
 * It lives in exactly one place, which is what makes it worth guarding here.
 * A gate in a function is only a gate while nothing writes around it, and
 * `authenticated` holds INSERT and DELETE on `cell_touchpoints` — it has to,
 * because the sync function is `security invoker` and runs as its caller. So
 * the grants cannot express "only through the sync", and this test is what
 * says it instead: no module in `src/` creates or removes a placement, and no
 * module moves one.
 *
 * The two shapes are separate findings because they route around the gate in
 * different directions. An INSERT puts a placement on a cell the gate never
 * looked at. An UPDATE of `cell_id`, `touchpoint_id` or `position` takes a
 * placement the gate allowed and moves it somewhere it would not have —
 * which is why `cell_id` and `touchpoint_id` are outside the column grant,
 * and why `position` is inside it and still forbidden here: repositioning is
 * a swap, the uniqueness constraint is DEFERRABLE INITIALLY DEFERRED, and
 * PostgREST gives every statement its own transaction. A reorder issued from
 * the client raises 23505 on the first row, every time. That defect is
 * already written up at the top of `20260830160000`; this stops it coming
 * back through a different door.
 *
 * Companion to `writeBoundaryContract.test.ts`, not a duplicate of it: that
 * one says writes must live in a `*Mutations` module, this one says what a
 * mutation module may write on this table.
 */
const SRC = resolve(__dirname, '..')

/** Creating or removing a placement — what only the gated sync may do. */
const PLACEMENT_CREATE =
  /\.from\(\s*'cell_touchpoints'\s*\)[\s\S]{0,200}?\.(insert|upsert|delete)\s*\(/g

/** Moving one: the columns that say WHERE a placement is, not what it says. */
const PLACEMENT_REANCHOR =
  /\.from\(\s*'cell_touchpoints'\s*\)[\s\S]{0,200}?\.update\s*\(\s*\{[\s\S]{0,400}?\b(cell_id|touchpoint_id|position)\s*:/g

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name)
    if (statSync(path).isDirectory()) {
      out.push(...walk(path))
    } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
      out.push(path)
    }
  }
  return out
}

function offendersFor(pattern: RegExp): string[] {
  const found: string[] = []
  for (const file of walk(SRC)) {
    const source = readFileSync(file, 'utf-8')
    for (const match of source.matchAll(pattern)) {
      const line = source.slice(0, match.index).split('\n').length
      found.push(`${file.slice(SRC.length + 1)}:${line} — ${match[1]}`)
    }
  }
  return found
}

test('nothing in the app creates or removes a placement', () => {
  expect(
    offendersFor(PLACEMENT_CREATE),
    'A placement is created by `sync_cell_touchpoints` from the cell text and ' +
      'by nothing else — that function holds the only check that the cell is ' +
      'touchpoint-bearing. Change the cell’s text through `updateCellContent` ' +
      'and let the sync follow it.',
  ).toEqual([])
})

test('nothing in the app moves a placement', () => {
  expect(
    offendersFor(PLACEMENT_REANCHOR),
    'A placement’s cell, touchpoint and position are where it SITS. ' +
      '`cell_id` and `touchpoint_id` are outside the `authenticated` column ' +
      'grant, and a client-side reposition raises 23505 on the deferred ' +
      'uniqueness constraint because PostgREST commits every statement ' +
      'separately. Reordering goes through `sync_cell_touchpoints`.',
  ).toEqual([])
})

test('both guards can fail', () => {
  // Regexes over source text pass by matching nothing, so each is shown
  // against the shape it claims to catch and the shape it must permit.
  const inserting = `await client.from('cell_touchpoints').insert({ cell_id: id })`
  const deleting = `await client.from('cell_touchpoints').delete().eq('id', x)`
  const moving = `client.from('cell_touchpoints').update({ cell_id: other }).eq('id', x)`
  const reordering = `client.from('cell_touchpoints').update({ position: 2 }).eq('id', x)`
  const detail = `client.from('cell_touchpoints').update({ summary: s, role: p }).eq('id', x)`
  const anotherTable = `client.from('cells').insert({ cell_id: id })`

  expect(inserting.match(PLACEMENT_CREATE)).not.toBeNull()
  expect(deleting.match(PLACEMENT_CREATE)).not.toBeNull()
  expect(detail.match(PLACEMENT_CREATE)).toBeNull()
  expect(anotherTable.match(PLACEMENT_CREATE)).toBeNull()

  expect(moving.match(PLACEMENT_REANCHOR)).not.toBeNull()
  expect(reordering.match(PLACEMENT_REANCHOR)).not.toBeNull()
  // The write this whole ticket exists to allow must not trip it.
  expect(detail.match(PLACEMENT_REANCHOR)).toBeNull()
})
