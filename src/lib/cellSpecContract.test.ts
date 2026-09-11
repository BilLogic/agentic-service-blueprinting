import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'

const src = (path: string) =>
  readFileSync(join(process.cwd(), 'src', path), 'utf8')

/*
  THE PANEL READS THE BOARD, SO THE BOARD HAS TO CARRY THE COLUMNS.

  `CellPanelEditor`, `CellOverviewSpec` and `CellContentSection` used to fetch
  the owner pair and the spec block per cell, on panel open. They read them off
  the board now: the columns ride `PATH_BLUEPRINT_SELECT` and the normalizer
  maps them onto `BlueprintCell`, so the values are in memory before a panel
  opens and there is no round-trip to wait for.

  That is a chain of three, and only the last link fails loudly. Drop a column
  from the select and `tsc` says nothing — `RawCell` has it optional, because
  fallback data does not carry it. Drop it from the normalizer and `tsc` says
  nothing either, because every one of these fields is optional on
  `BlueprintCell` for the same reason. What the reader gets is a panel that
  quietly renders nothing where an author put text, on a board where the
  column is populated.

  So this compares the two lists. It is deliberately textual: the point is
  that the select STRING names each column and the normalizer STATEMENT maps
  it, which is exactly what a type cannot see.
*/

/** The columns the panel reads off the board rather than fetching. */
const SPEC_COLUMNS = [
  'function',
  'form',
  'value_props',
  'owner',
  'perceived_owner',
] as const

describe('the cell spec rides the board query', () => {
  it('names every spec column in the board select', () => {
    for (const column of SPEC_COLUMNS) {
      // `function` is a reserved word to PostgREST and is quoted in the select.
      const spelled = column === 'function' ? '"function"' : column
      expect(PATH_BLUEPRINT_SELECT, column).toContain(spelled)
    }
  })

  it('maps every one of them onto the cell', () => {
    const normalizer = src('lib/normalizeBlueprint.ts')
    for (const column of SPEC_COLUMNS) {
      // The mapped value may be wrapped — `value_props` is cast to the shape
      // the panel renders — so this asks that the field is assigned FROM the
      // raw cell's column of the same name, not that the line is verbatim.
      expect(normalizer, column).toMatch(
        new RegExp(`${column}:\\s*\\(?cell\\.${column}\\b`),
      )
    }
  })

  it('leaves no per-cell fetch of them behind', () => {
    // The two hooks this replaced were `useCellSpec` and `useCellContent`.
    // A third one would be the same round-trip under a new name.
    const editor = src('components/blueprint/CellPanelEditor.tsx')
    const overview = src('components/blueprint/CellOverviewSpec.tsx')
    const owners = src('components/blueprint/CellContentSection.tsx')
    for (const [name, file] of [
      ['CellPanelEditor', editor],
      ['CellOverviewSpec', overview],
      ['CellContentSection', owners],
    ] as const) {
      expect(file, name).toContain("useBlueprintCell")
      expect(file, name).not.toContain('.from(')
    }
  })
})

/**
 * One PostgREST select, minus every embedded relation and the name it hangs
 * off, however that embed is spelled: aliased or plain, nested or flat.
 */
function stripEmbeds(select: string): string[] {
  const out: string[] = []
  let field = ''
  let depth = 0
  for (const ch of select) {
    if (ch === '(') {
      depth += 1
      // The identifier collected so far names the embed, not a column.
      if (depth === 1) field = ''
      continue
    }
    if (ch === ')') {
      depth -= 1
      continue
    }
    if (depth > 0) continue
    if (ch === ',') {
      out.push(field.trim())
      field = ''
      continue
    }
    field += ch
  }
  out.push(field.trim())
  return (
    out
      // PostgREST needs a reserved word quoted — `"function"` — and the mapper
      // writes the bare key. Compare identifiers, not spellings.
      .map((entry) => entry.replace(/^"(.*)"$/, '$1'))
      .filter(Boolean)
  )
}

/** The body of the `cells ( … )` block, by balanced brackets. */
function cellsBlock(select: string): string {
  const open = select.indexOf('(', select.indexOf('cells ('))
  let depth = 0
  for (let i = open; i < select.length; i += 1) {
    if (select[i] === '(') depth += 1
    else if (select[i] === ')') {
      depth -= 1
      if (depth === 0) return select.slice(open + 1, i)
    }
  }
  return ''
}

describe('every column the board selects for a cell reaches the cell', () => {
  it('loses nothing between the query and the canvas', () => {
    /*
      The general form of the chain above, rather than one list's version of it.

      `SPEC_COLUMNS` holds five names that must be remembered; a sixth column
      added to the select and not to the mapper is outside it. That has
      happened twice with columns the canvas reads: `status`, caught the same
      day, and `position`, which was selected, typed and SORTED ON while the
      mapper never set it and every slot sort compared undefined to undefined.

      So every field the query asks for must appear in the mapper — a
      comparison of the two lists, which cannot be forgotten. Embedded
      relations are dropped first; each has a mapper of its own.
    */
    expect(
      PATH_BLUEPRINT_SELECT.indexOf('cells ('),
      'the select no longer has a cells block',
    ).toBeGreaterThan(-1)
    const selected = stripEmbeds(cellsBlock(PATH_BLUEPRINT_SELECT))
    // The subject is real: an empty list would pass vacuously.
    expect(selected.length).toBeGreaterThan(5)

    const source = src('lib/normalizeBlueprint.ts')
    const mapStart = source.indexOf('rawCells.map((cell) => ({')
    expect(mapStart, 'the cell mapper moved').toBeGreaterThan(-1)
    const mapper = source.slice(mapStart, source.indexOf('}))', mapStart))

    const missing = selected.filter(
      (field) => !new RegExp(`(^|\\s)${field}:`, 'm').test(mapper),
    )
    expect(
      missing,
      `selected by the query and dropped by the mapper: ${missing.join(', ')}`,
    ).toEqual([])
  })

  it('reads an embed as an embed, however it is spelled', () => {
    // The first version of this was a regexp, and it was wrong twice. It
    // required an ALIAS before the parenthesis, so an embed written plainly
    // was left in and its first inner field read as a column no mapper could
    // satisfy. And it closed at the first `)`, so a nested embed ended early.
    expect(
      stripEmbeds(
        'id, "function", plain (a, b), alias:table!fk (c, nested (d, e)), last',
      ),
    ).toEqual(['id', 'function', 'last'])
  })
})

describe('a step carries its summary', () => {
  it('is selected and mapped, so the step header has it without asking', () => {
    expect(PATH_BLUEPRINT_SELECT).toMatch(/steps \(\s*id,\s*name,\s*summary/)
    expect(src('lib/normalizeBlueprint.ts')).toContain(
      'summary: row.steps.summary',
    )
  })
})
