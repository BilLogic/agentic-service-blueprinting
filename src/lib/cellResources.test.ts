/**
 * One question, one answer: what an unnamed resource is called.
 *
 * `resources.name` is not null, and two writers can reach it — the migration
 * that carried the old `cells.links` array across, and the editor that saves a
 * row an author left unnamed. Upstream of this template, those two answered
 * differently: the migration minted the word "Link" while the app minted the
 * URL's host, so the same entry acquired two names depending on which writer
 * touched it last, and nothing in either repository would have said so.
 *
 * The fix is not "both mint the host" — that is the same defect with the two
 * answers agreeing today. `new URL().hostname` and a SQL expression cannot
 * agree by construction: `URL` lowercases a host, punycodes an international
 * one, strips a port, and keeps the square brackets on an IPv6 literal, and no
 * one SQL expression does all four. So the RULE is written once, as a pattern,
 * and both languages run that same text:
 *
 *   src/lib/cellResources.ts          RESOURCE_NAME_FROM_URL
 *   supabase/migrations/21000113…sql  the same characters, in regexp_replace
 *
 * This file is what keeps them the same characters, and it checks two things
 * that fail independently: that the two texts are equal, and that the pattern
 * still produces the host for the shapes a writer can actually produce. The
 * second matters because a pattern the two sides share is still wrong if it
 * names the wrong thing.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  RESOURCE_NAME_FROM_URL,
  cellResources,
  cellResourcesFromRows,
  hostOf,
} from '@/lib/cellResources'

const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/21000113000000_one_column_held_two_unrelated_things.sql',
)

/** The pattern literal the migration hands to `regexp_replace`. */
function patternInMigration(sql: string): string {
  const match = /regexp_replace\(\s*lower\(btrim\([^)]*\)\),\s*'([^']*)',/.exec(sql)
  if (!match) throw new Error('the migration no longer names a fallback pattern')
  return match[1]!
}

describe('the name an unnamed resource takes', () => {
  const sql = readFileSync(MIGRATION, 'utf8')

  it('is one rule, spelled the same in both languages', () => {
    expect(patternInMigration(sql)).toBe(RESOURCE_NAME_FROM_URL)
  })

  it('reads a pattern out of the migration rather than passing vacuously', () => {
    // The extraction, asserted before its result is trusted: a regex that
    // matched nothing would make the test above pass against `undefined`.
    expect(patternInMigration(sql)).toMatch(/^\^https\?/)
    expect(() => patternInMigration('select 1;')).toThrow(
      /no longer names a fallback pattern/,
    )
  })

  it('goes red when the two texts drift apart', () => {
    const drifted = sql.replace(RESOURCE_NAME_FROM_URL, '^https?://(.+)$')
    expect(patternInMigration(drifted)).not.toBe(RESOURCE_NAME_FROM_URL)
  })

  // Every shape either writer can produce. The editor stores
  // `new URL(...).toString()` and the IR validator requires a URI, so these
  // are the inputs, not a wish list.
  const cases: Array<[string, string]> = [
    ['https://www.figma.com/file/abc', 'figma.com'],
    ['https://example.com/sop/intake?q=1#frag', 'example.com'],
    ['https://example.com:8443/a', 'example.com'],
    ['https://user:pw@example.com/a', 'example.com'],
    ['HTTPS://Example.COM/A', 'example.com'],
    ['http://example.com', 'example.com'],
    ['  https://example.com/a  ', 'example.com'],
    ['https://sub.domain.example.co.uk/x', 'sub.domain.example.co.uk'],
  ]

  it.each(cases)('names %s after its host', (url, expected) => {
    expect(hostOf(url)).toBe(expected)
  })

  // Nothing on the other end that a host can be read from. Both writers fall
  // through to the same word rather than to an empty string, which would
  // render as a row a reader cannot click and cannot name.
  it.each([['not a url'], ['mailto:someone@example.com'], ['']])(
    'falls back to Link for %s',
    (url) => {
      expect(hostOf(url)).toBe('Link')
    },
  )
})

describe('resources from database rows', () => {
  it('sorts by position rather than trusting the embed order', () => {
    // PostgREST promises no order for an embedded relation, so a list that
    // arrives shuffled must still render in the order the author put it.
    const rows = [
      { position: 3, name: 'Third', url: 'https://c.example/' },
      { position: 1, name: 'First', url: 'https://a.example/' },
      { position: 2, name: 'Second', url: 'https://b.example/' },
    ]
    expect(cellResourcesFromRows(rows).map((row) => row.name)).toEqual([
      'First',
      'Second',
      'Third',
    ])
  })

  it('defaults kind to link and drops a nameless row', () => {
    const rows = [
      { position: 1, name: '  ', url: 'https://a.example/' },
      { position: 2, name: 'Named', url: 'https://b.example/' },
    ]
    expect(cellResourcesFromRows(rows)).toEqual([
      {
        id: null,
        name: 'Named',
        kind: 'link',
        url: 'https://b.example/',
        placementId: null,
        featured: false,
      },
    ])
  })

  it('keeps resource kinds inside the domain vocabulary', () => {
    const rows = [
      { position: 1, name: 'Screenshot', kind: 'attachment', url: '/a.png' },
      { position: 2, name: 'Legacy value', kind: 'unexpected', url: 'https://a.example/' },
    ]
    expect(cellResourcesFromRows(rows).map((row) => row.kind)).toEqual([
      'attachment',
      'link',
    ])
  })

  it('carries the row\u2019s id, whose placement it is, and whether it leads', () => {
    const rows = [
      {
        id: 'r-1',
        position: 1,
        name: 'Design',
        url: 'https://www.figma.com/design/x',
        cell_touchpoint_id: 'placement-1',
        featured: true,
      },
    ]
    expect(cellResourcesFromRows(rows)).toEqual([
      {
        id: 'r-1',
        name: 'Design',
        kind: 'link',
        url: 'https://www.figma.com/design/x',
        placementId: 'placement-1',
        featured: true,
      },
    ])
  })

  it('reads a cell that carries none as pointing at nothing', () => {
    expect(cellResources({})).toEqual([])
    expect(cellResourcesFromRows(null)).toEqual([])
  })
})
