import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = (relative: string) =>
  readFileSync(resolve(__dirname, '..', '..', relative), 'utf8')

/**
 * A placeholder that stops matching its panel is invisible in review and
 * obvious to a reader, which is the worst way round.
 *
 * These assert STRUCTURE — how many fields, at what row counts — not pixels.
 * The claim that broke was structural: one placeholder with two equal boxes
 * standing in for a three-textarea panel, a four-field form, an image row and
 * an accordion. Pixel assertions would be brittle and would get skipped, which
 * is how a contract test stops holding anything.
 *
 * The panel set is declared ONCE, below, and every assertion loops it. Three
 * hand-maintained lists had already drifted apart — Service was in the first
 * and missing from the third, and Lane and Service had no field-shape row at
 * all — which is the same failure as the placeholders, one level up.
 */

/**
 * The five entity panels, in `EntityDetailKind` order.
 *
 * Kept in step with the union by the first assertion below, so a sixth kind
 * arrives here as a failing test rather than as a panel nothing checks.
 */
const PANELS = ['Service', 'Lane', 'Phase', 'Scenario', 'Step'] as const
type Panel = (typeof PANELS)[number]

/**
 * How each panel's placeholder compares to its panel, field for field.
 *
 * - `all`   every textarea in the panel has a skeleton at the same row count.
 * - `first` the placeholder draws the panel's own fields and then a repeating
 *           row per child — the scenario's paths — which is not a fixed count.
 * - `none`  the panel has no textareas at all; its fields are a picker, a
 *           text input and two list editors, and the placeholder draws those
 *           four as their own skeleton groups. The assertion here is that
 *           BOTH sides stay empty: a textarea appearing on either side without
 *           the other is the drift this catches.
 */
const FIELD_SHAPE: Record<Panel, 'all' | 'first' | 'none'> = {
  Service: 'all',
  Lane: 'none',
  Phase: 'all',
  Scenario: 'first',
  Step: 'all',
}

describe('a panel and its placeholder agree on shape', () => {
  const loading = src('components/blueprint/panelLoading.tsx')

  /** PanelTextareaField's own default, so an omitted `rows` still compares. */
  const DEFAULT_ROWS = 3

  /**
   * Row count per field, in order — an omitted `rows` counts as the default.
   *
   * A skeleton inside `{[0, 1, 2].map(…)}` stands for as many fields as the
   * array has entries, and is expanded to that many. Without it a placeholder
   * that draws five identical rows through a map reads as one row, which is
   * how the service panel's six fields compared equal to two.
   */
  const fieldRowsIn = (block: string): number[] =>
    [
      ...block.matchAll(
        /(?:\{\[([\d, ]*)\]\.map\([^)]*\)\s*=>\s*\(?\s*)?<(?:PanelTextareaField|FieldSkeleton)\b([\s\S]*?)\/?>/g,
      ),
    ].flatMap((match) => {
      const rows = match[2].match(/rows=\{(\d+)\}/)
      const count = rows ? Number(rows[1]) : DEFAULT_ROWS
      const repeat = match[1] ? match[1].split(',').length : 1
      return Array.from({ length: repeat }, () => count)
    })

  const componentBody = (source: string, name: string): string => {
    const start = source.indexOf(`export function ${name}`)
    expect(start, `${name} moved or was renamed`).toBeGreaterThan(-1)
    const next = source.indexOf('\nexport function ', start + 1)
    return source.slice(start, next === -1 ? source.length : next)
  }

  it('covers every kind the entity drawer can open', () => {
    // The list above is what the other assertions loop; this is what keeps it
    // honest against the union the drawer actually switches on.
    const context = src('contexts/EntityDetailContext.tsx')
    const union = context
      .slice(
        context.indexOf('export type EntityDetailKind'),
        context.indexOf('export type EntityDetailSelection'),
      )
      .match(/'(\w+)'/g)
      ?.map((quoted) => quoted.replaceAll("'", ''))
    expect(union?.slice().sort()).toEqual(
      PANELS.map((panel) => panel.toLowerCase()).sort(),
    )
  })

  it('gives every panel a placeholder of its own', () => {
    // The failure this whole unit exists to end: four panels sharing one
    // shape. `PanelLoading` is gone; nothing may bring it back.
    for (const panel of PANELS) {
      expect(loading, `${panel} has no placeholder of its own`).toMatch(
        new RegExp(`export function ${panel}PanelLoading\\b`),
      )
    }
    expect(loading, 'the generic placeholder is back').not.toMatch(
      /export function PanelLoading\b/,
    )
  })

  it('gives every panel its fields at the same row counts', () => {
    for (const panel of PANELS) {
      const source = src(`components/blueprint/${panel}Panel.tsx`)
      const placeholder = fieldRowsIn(
        componentBody(loading, `${panel}PanelLoading`),
      )
      const fields = fieldRowsIn(source)
      const shape = FIELD_SHAPE[panel]
      if (shape === 'none') {
        expect(fields, `${panel}Panel grew a textarea`).toEqual([])
        expect(placeholder, `${panel}PanelLoading grew a field skeleton`).toEqual([])
        continue
      }
      expect(
        placeholder,
        `${panel}PanelLoading no longer matches ${panel}Panel`,
      ).toEqual(shape === 'first' ? fields.slice(0, 1) : fields)
    }
  })

  it('never leaves a panel on the generic placeholder', () => {
    for (const panel of PANELS) {
      const source = src(`components/blueprint/${panel}Panel.tsx`)
      expect(source, `${panel}Panel is back on the generic placeholder`).not.toMatch(
        /<PanelLoading\s*\/>/,
      )
      expect(source, `${panel}Panel has no placeholder`).toMatch(
        /<\w+PanelLoading[\s/>]/,
      )
    }
  })

  it('gives every entity panel the fourth state', () => {
    // Loading and error were there; empty was not, so a lane with nothing
    // recorded rendered a form of blank fields.
    const lane = src('components/blueprint/LanePanel.tsx')
    expect(lane).toMatch(/<PanelEmpty/)
    // View mode only — in Edit a blank form is how a value gets recorded.
    expect(lane).toMatch(/!canEdit/)
  })
})
