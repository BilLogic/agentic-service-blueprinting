/**
 * The value-set claim parser, ported from the instance with its catalog read
 * off the schema dump. Green against the docs proves nothing by itself — a
 * parser that found no claims prints the same line. What is asserted here is
 * that it finds the shapes #102 measured, holds them to the right set, and
 * reads the shapes that are not claims as English.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA } from '../check-instance-vocabulary.mjs'
import { catalogFromSchema, retiredValues, sentencesOf, valueSetFindings } from '../value-set-claims.mjs'

const dump = `
CREATE TABLE public.scenarios (
    id uuid NOT NULL,
    layout text DEFAULT 'single'::text NOT NULL,
    CONSTRAINT scenarios_layout_check CHECK ((layout = ANY (ARRAY['single'::text, 'stacked'::text])))
);
CREATE TABLE public.paths (
    id uuid NOT NULL,
    kind text NOT NULL,
    CONSTRAINT paths_kind_check CHECK ((kind = ANY (ARRAY['happy'::text, 'variant'::text, 'exception'::text])))
);
CREATE TABLE public.cell_dependencies (
    id uuid NOT NULL,
    kind text NOT NULL,
    CONSTRAINT cell_dependencies_kind_check CHECK ((kind = ANY (ARRAY['leads_to'::text, 'enables'::text])))
);
CREATE TABLE public.slices (
    id uuid NOT NULL,
    kind text NOT NULL,
    CONSTRAINT slices_kind_check CHECK ((kind = ANY (ARRAY['journey'::text, 'step'::text, 'lane'::text, 'cell'::text, 'custom'::text])))
);
`
const catalog = catalogFromSchema(dump)
const retired = new Map([
  ['side-by-side', { column: 'scenarios.layout', is: 'stacked', migration: '21000116000000' }],
  ['integrated', { column: 'scenarios.layout', is: 'stacked', migration: '21000116000000' }],
  ['unhappy', { column: 'paths.kind', is: 'exception', migration: '21000116000000' }],
  ['trigger', { column: 'cell_dependencies.kind', is: 'leads_to', migration: '21000114000000' }],
])
const markdown = (text) => valueSetFindings({ text, source: 'doc.md', medium: 'markdown' }, catalog, retired)

test('the dump is read as the catalog, by column and by bare name', () => {
  assert.deepEqual([...catalog.columns.get('scenarios.layout').values], ['single', 'stacked'])
  assert.deepEqual(catalog.byColumn.get('kind').sort(), ['cell_dependencies.kind', 'paths.kind', 'slices.kind'])
  const live = catalogFromSchema(readFileSync(SCHEMA, 'utf8'))
  assert.ok(live.columns.has('scenarios.layout'), 'the committed dump carries the layout CHECK')
})

test('the rename map records retired VALUES', () => {
  const live = retiredValues()
  assert.equal(live.get('side-by-side')?.is, 'stacked')
  assert.equal(live.get('unhappy')?.is, 'exception')
  assert.equal(live.get('trigger')?.is, 'leads_to')
})

test('a scoped list is held to the set, by equality', () => {
  assert.deepEqual(markdown('`layout` is `single` or `stacked`.'), [])
  assert.deepEqual(markdown('Set per scenario: `layout` (`single` | `stacked`) and `kind` (`happy` | `variant` | `exception`).'), [])
  const [finding] = markdown('`kind` is `happy`, `variant`, `exception` or `detour`.')
  assert.match(finding, /paths_kind_check accepts \{happy, variant, exception\}/)
})

test('a retired value is a finding as a list member or on its own', () => {
  assert.match(markdown('- `integrated`: confirm the merged grid renders.')[0], /names `integrated`, which `scenarios\.layout` retired for `stacked` in 21000116000000/)
  assert.match(markdown('**View modes** per scenario: `single`, `side-by-side`, `integrated`.')[0], /names `side-by-side`/)
  // `single` is still a value the CHECK accepts, so alone it is English.
  assert.deepEqual(markdown('`single`: switch through every path.'), [])
})

test('a sentence that records the retirement and cites the migration is history', () => {
  assert.deepEqual(markdown('`side-by-side` and `integrated` became `stacked` in `21000116000000`.'), [])
  assert.deepEqual(markdown('It used to store `single | side-by-side | integrated`; `21000116000000` folded both into `stacked` and the translation was deleted.'), [])
  assert.equal(markdown('It used to store `single | side-by-side | integrated` with a translation module.').length, 1)
})

test('a table cell is its own statement and a pipe between cells is a border', () => {
  const table = [
    '| Entity | Table | Notes |',
    '| --- | --- | --- |',
    '| Phase | `phases` | `position`; optional `loops_to_phase_id` |',
    '| Path | `paths` | `kind` is `happy`, `variant` or `exception` |',
  ].join('\n')
  assert.deepEqual(markdown(table), [])
  const wrong = table.replace('`exception`', '`unhappy`')
  assert.match(markdown(wrong)[0], /^doc\.md:4 names `unhappy`/)
  assert.deepEqual(sentencesOf('| a | b |\n| --- | --- |\n| `x` | y. z |').map((s) => s.text), ['a ; b', '`x` ; y. z'])
  // The row that cites a migration in one cell and records the rename in another is one correction.
  assert.deepEqual(markdown('| `21000103000000_cell_triggers_are_cell_dependencies.sql` | `cell_triggers` → `cell_dependencies`; `kind` keeps (`trigger`, `needs`) |'), [])
})

test('a column list, a code fence and the rename section are not claims', () => {
  assert.deepEqual(markdown('Table `paths`: `scenario_id`, `name`, `kind`, `summary`, `note`.'), [])
  assert.deepEqual(markdown("```sql\ncheck (layout in ('single', 'integrated'))\n```"), [])
  const section = ['## The rename map', '', '`integrated` went in the same migration.', '', '| Was | Is | Migration |', '|---|---|---|', '| `a` | `b` | `1` |'].join('\n')
  assert.deepEqual(markdown(section), [])
})
