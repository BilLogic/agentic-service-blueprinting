/**
 * The instance-vocabulary check's parts, without the network: the dump
 * parser and the matcher. The check itself fetches the instance's map and
 * runs in CI; what it would say about a given map and a given schema is
 * decided here.
 */
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SCHEMA, schemaInventory, trailingNames } from '../check-instance-vocabulary.mjs'

const dump = `
CREATE TABLE public.cells (
    id uuid NOT NULL,
    lane_id uuid NOT NULL,
    content text,
    CONSTRAINT cells_origin_check CHECK ((origin = ANY (ARRAY['import'::text, 'app'::text])))
);
CREATE TABLE public.scenarios (
    id uuid NOT NULL,
    layout text DEFAULT 'single'::text NOT NULL
);
ALTER TABLE public.scenarios
    ADD CONSTRAINT scenarios_layout_check CHECK ((layout = ANY (ARRAY['single'::text, 'stacked'::text])));
ALTER TABLE ONLY public.lanes
    ADD CONSTRAINT lanes_lane_role_check CHECK (((lane_role IS NULL) OR (lane_role = ANY (ARRAY['storyboard'::text, 'visual'::text]))));
`
const inventory = schemaInventory(dump)

test('the dump is read as tables, columns and the values each CHECK accepts', () => {
  assert.deepEqual([...inventory.tables], ['cells', 'scenarios'])
  assert.ok(inventory.columns.has('scenarios.layout'))
  assert.equal(inventory.columns.has('cells.CONSTRAINT'), false)
  assert.deepEqual([...inventory.values.get('scenarios.layout')], ['single', 'stacked'])
  assert.deepEqual([...inventory.values.get('lanes.lane_role')], ['storyboard', 'visual'], 'a NULL-or CHECK is read past the OR')
  assert.deepEqual([...inventory.values.get('cells.origin')], ['import', 'app'], 'an inline CHECK counts')
})

const map = [
  { was: ["scenarios.layout = 'single'"], is: ["scenarios.layout = 'stacked'"], migrations: ['20260902120000'] },
  { was: ['layers', 'layer_role', 'cells.layer_id'], is: ['lanes', 'lane_role', 'cells.lane_id'], migrations: ['20260820120000'] },
  { was: ['*_lane_id'], is: ['lane_id'], migrations: ['20260820140000'] },
  { was: ['visual'], is: ['storyboard'], migrations: ['20260830270000'] },
  { was: ['text (label)'], is: ['Content'], migrations: [] },
]

test('a retired name counts only when it is live here, and an accepted divergence is named rather than failed', () => {
  const { findings, stale } = trailingNames(map, inventory, [{ was: "scenarios.layout = 'single'", until: '#103', because: 'x' }])
  assert.deepEqual(
    findings.map((f) => [f.was, f.hit]),
    [
      ['*_lane_id', 'column cells.lane_id'],
      ['visual', 'a value lanes.lane_role still accepts'],
    ],
  )
  assert.deepEqual(stale, [])
})

test('an exemption nothing matches any more is itself a finding', () => {
  const { stale } = trailingNames(map, inventory, [{ was: 'layers', until: '#1', because: 'gone' }])
  assert.equal(stale.length, 1)
})

test('the committed dump parses to the schema the types describe', () => {
  const live = schemaInventory(readFileSync(SCHEMA, 'utf8'))
  assert.ok(live.tables.has('slides'))
  assert.ok(live.columns.has('cells.frame'))
  assert.deepEqual([...live.values.get('cell_dependencies.kind')], ['leads_to', 'enables'])
})
