import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'

const src = (path: string) =>
  readFileSync(join(process.cwd(), 'src', path), 'utf8')

/*
  THE PANEL READS THE BOARD.

  `CellPanelEditor`, `CellOverviewSpec` and `CellContentSection` used to fetch
  the owner pair and the spec block per cell, on panel open. They read them off
  the board now, so the values are in memory before a panel opens and there is
  no round-trip to wait for. This holds the panel to that: no hook of its own
  against the table.

  Whether the board CARRIES the columns is no longer a question this file
  asks. It used to compare the select string to the normalizer's source,
  because a type could not see a column named in one and dropped from the
  other; both derive from the cell field list now, and `cellFields.test.ts`
  shows one descriptor moving both.
*/

describe('the panel reads the board', () => {
  it('leaves no per-cell fetch behind', () => {
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

describe('a step carries its summary', () => {
  it('is selected and mapped, so the step header has it without asking', () => {
    expect(PATH_BLUEPRINT_SELECT).toMatch(/steps \(\s*id,\s*name,\s*summary/)
    expect(src('lib/normalizeBlueprint.ts')).toContain(
      'summary: row.steps.summary',
    )
  })
})
