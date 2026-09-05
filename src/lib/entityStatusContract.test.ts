import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ENTITY_STATUS,
  ENTITY_STATUS_LABEL,
  ENTITY_STATUS_MEANING,
  ENTITY_STATUS_SHORT,
  asEntityStatus,
  isUnbuilt,
} from '@/lib/entityStatus'
import type { EntityStatus as DatabaseEntityStatus } from '@/types/database'

const src = (path: string) =>
  readFileSync(join(process.cwd(), 'src', path), 'utf8')

/*
  THE VOCABULARY, AND ONLY THE VOCABULARY.

  `cells.status` and `paths.status` are one `entity_status` domain in the
  database, and this module is the TypeScript half of it. What the canvas then
  DOES with a status — the dashed edge on an unbuilt cell, the rung named in
  the detail panel, the column reaching the normalizer without being dropped —
  is asserted by the change that draws it, not here. Those assertions land with
  the panels and the cell face; the list, the labels and the meanings land now,
  because three lists that must agree drift the moment nothing compares them.
*/

describe('the status ladder', () => {
  it('has one rung per state the panel can name', () => {
    // The ladder, the label and the meaning are three lists that must agree.
    // They drifted once already: `planned` and `prototype` were two words for
    // "not built" that did not order, and the one marked `planned` was code
    // already in QA.
    for (const rung of ENTITY_STATUS) {
      expect(ENTITY_STATUS_LABEL[rung], rung).toBeTruthy()
      expect(ENTITY_STATUS_MEANING[rung], rung).toBeTruthy()
      expect(ENTITY_STATUS_SHORT[rung], rung).toBeTruthy()
    }
    expect(Object.keys(ENTITY_STATUS_LABEL).sort()).toEqual(
      [...ENTITY_STATUS].sort(),
    )
    expect(Object.keys(ENTITY_STATUS_MEANING).sort()).toEqual(
      [...ENTITY_STATUS].sort(),
    )
    expect(Object.keys(ENTITY_STATUS_SHORT).sort()).toEqual(
      [...ENTITY_STATUS].sort(),
    )
  })

  it('is the same list the database domain carries', () => {
    /*
      `EntityStatus` in `src/types/database.ts` is the generated half — it
      spells the `entity_status` domain a migration created. This module is
      the runtime half. A value added to one and not the other is a rung the
      app can write and the database rejects, or one the database holds and no
      label describes.

      The two aliases below are the assertion, and they are checked by `tsc`
      rather than by vitest: `Assignable` constrains its first parameter to
      extend its second, so a member in one union and not the other stops the
      build. The expectation only keeps the aliases reachable.
    */
    type Assignable<A extends B, B> = [A, B] extends [B, A] ? true : true
    type ModuleFitsDatabase = Assignable<
      (typeof ENTITY_STATUS)[number],
      DatabaseEntityStatus
    >
    type DatabaseFitsModule = Assignable<
      DatabaseEntityStatus,
      (typeof ENTITY_STATUS)[number]
    >
    const bothDirections: [ModuleFitsDatabase, DatabaseFitsModule] = [
      true,
      true,
    ]
    expect(bothDirections).toEqual([true, true])
  })

  it('reads the three unbuilt rungs as unbuilt and nothing else', () => {
    // The dashed cell edge hangs off this, so a rung landing on the wrong
    // side of it draws a live surface as a design exploration.
    expect(ENTITY_STATUS.filter(isUnbuilt)).toEqual([
      'proposed',
      'planned',
      'built',
    ])
    expect(isUnbuilt(null)).toBe(false)
    expect(isUnbuilt(undefined)).toBe(false)
  })

  it('refuses a value that is not a rung', () => {
    // The database column is a domain over text, so a row that predates the
    // domain — or a hand-written fallback — can hand the app anything.
    for (const rung of ENTITY_STATUS) expect(asEntityStatus(rung)).toBe(rung)
    expect(asEntityStatus('prototype')).toBeNull()
    expect(asEntityStatus('')).toBeNull()
    expect(asEntityStatus(null)).toBeNull()
    expect(asEntityStatus(undefined)).toBeNull()
  })
})

describe('the status is a column, not a prefix on a name', () => {
  it('no cell label carries the status it used to', () => {
    // A status is not part of a touchpoint's NAME, and the vocabulary gained
    // products called "Planned — swap flow UI". The fallbacks are the offline
    // copy of the board; a `Planned — ` here would put the prefix back on a
    // canvas no migration can reach.
    const dir = join(process.cwd(), 'src', 'data')
    const offenders = readdirSync(dir)
      .filter((f) => f.endsWith('.ts'))
      .filter((f) =>
        readFileSync(join(dir, f), 'utf8').includes('Planned — '),
      )
    expect(offenders).toEqual([])
  })

  it('is spelled once, in this module', () => {
    // Six string literals in a component are a second vocabulary nobody can
    // query. Anything that needs the list imports it.
    const module = src('lib/entityStatus.ts')
    expect(module).toContain("export const ENTITY_STATUS = [")
  })
})
