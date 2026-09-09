import { test, expect } from 'vitest'
import { describeChange, type ChangeEntry, type WriteFn } from '@/lib/authoringSession'

/**
 * The two guarantees `WriteFn` exists to make. Both are compile-time — this
 * file is type-checked by `npm run build` — so the runtime assertions below
 * exist only so a failure is reported by name rather than as a silent absence.
 */

/**
 * A read RPC's name may never be a member of `WriteFn`.
 *
 * The ledger used to hold a deny-list of these and silently drop anything
 * matching it. Silent dropping is the wrong shape of guard: it protects
 * against a read being recorded (harmless, cosmetic) by risking a write being
 * forgotten (data loss, invisible). The union inverts that — a read name at
 * the ledger's door is a type error at the call site instead.
 */
type ReadFn = 'deletion_impact' | 'cell_natural_key' | 'slices_referencing'
type ReadsThatAreWrites = Extract<WriteFn, ReadFn>
const NO_READ_IS_A_WRITE: ReadsThatAreWrites extends never ? true : false = true

test('no read RPC can be recorded as a change', () => {
  expect(NO_READ_IS_A_WRITE).toBe(true)
})

/**
 * Every `WriteFn` has a sentence. `describeChange` is a `Record<WriteFn, …>`,
 * so this cannot fail to compile — but it can fail at runtime if the record is
 * ever built dynamically, and the list below doubles as the readable inventory
 * of what the sheet can say.
 *
 * Keyed (`satisfies Record<WriteFn, true>`) rather than a `WriteFn[]`, because
 * an array of the union's members happily accepts a SHORT array: adding an
 * operation and forgetting to list it here left the new sentence untested and
 * the omission invisible. Keyed, the omission does not compile — the same
 * argument `DESCRIBERS` itself makes.
 */
const EVERY_WRITE = Object.keys({
  create_phase: true,
  create_scenario: true,
  create_path: true,
  duplicate_path: true,
  duplicate_scenario: true,
  rename_phase: true,
  rename_scenario: true,
  update_scenario_layout: true,
  rename_path: true,
  rename_owner_tag: true,
  add_step: true,
  add_lane: true,
  upsert_cell: true,
  update_cell_content: true,
  update_cell_resources: true,
  update_placement_resources: true,
  set_featured_resource: true,
  restore_featured_resources: true,
  set_placement_touchpoint: true,
  remove_placement: true,
  restore_placement: true,
  rename_touchpoint: true,
  update_touchpoint_placement: true,
  update_cell_spec: true,
  update_lane_spec: true,
  update_phase_spec: true,
  update_scenario_spec: true,
  update_service_summary: true,
  update_business_model: true,
  update_service_entity_examples: true,
  update_path_spec: true,
  update_step_spec: true,
  create_stakeholder: true,
  update_stakeholder: true,
  add_evidence: true,
  update_evidence: true,
  delete_evidence: true,
  set_cell_dependency: true,
  clear_cell_dependency: true,
  reorder_steps: true,
  set_path_steps: true,
  reorder_lanes: true,
  delete_scenario: true,
  delete_path: true,
  remove_step: true,
  remove_lane: true,
  delete_cell: true,
  delete_slice: true,
  create_slice: true,
  duplicate_slice: true,
  update_slice_meta: true,
  replace_slides: true,
  update_slide_illustration: true,
  create_finding: true,
  update_finding: true,
} satisfies Record<WriteFn, true>) as WriteFn[]

test('every recordable operation reads as a sentence, not an identifier', () => {
  for (const fn of EVERY_WRITE) {
    const entry: ChangeEntry = { id: 'c1', fn, args: {}, at: 0 }
    const described = describeChange(entry)
    expect(described.length).toBeGreaterThan(0)
    // The old switch's `default` returned the lowercased function name, which
    // is what put "duplicate scenario" in the change list.
    expect(described).not.toBe(fn.replace(/_/g, ' '))
    // A sentence, so it starts like one.
    expect(described[0]).toBe(described[0].toUpperCase())
  }
})

/**
 * The two upserts say which half they took, and the sentence follows.
 *
 * Both `upsert_cell` and `set_cell_dependency` land on either an insert or an
 * update, and both learned to report which — that is what let `deriveRevert`
 * stop deducing an inverse from the operation's NAME. The sentence was left
 * behind: it still read "Added a cell" over a write that had edited one, which
 * is the same mistake in the one place a person actually sees it.
 *
 * The entry carries no report of its own, so the describers read the derived
 * inverse, which is where the report survives. That makes the absence of an
 * inverse meaningful too: an insert always derives one, so a missing inverse
 * is the update half whose before-state did not come back — an edit.
 */
const CELL_INSERT: ChangeEntry = {
  id: 'c1',
  fn: 'upsert_cell',
  args: {},
  at: 0,
  revert: { fn: 'delete_cell', args: { cell_id: 'cell-1' } },
}

const CELL_UPDATE: ChangeEntry = {
  id: 'c2',
  fn: 'upsert_cell',
  args: {},
  at: 0,
  revert: { fn: 'restore_cell_content', args: { cell_id: 'cell-1', content: 'was' } },
}

const EDGE_INSERT: ChangeEntry = {
  id: 'c3',
  fn: 'set_cell_dependency',
  args: {},
  at: 0,
  revert: { fn: 'clear_cell_dependency', args: { dependency_id: 'dep-1' } },
}

const EDGE_UPDATE: ChangeEntry = {
  id: 'c4',
  fn: 'set_cell_dependency',
  args: {},
  at: 0,
  revert: {
    fn: 'restore_cell_dependency',
    args: { dependency_id: 'dep-1', name: null, note: 'was' },
  },
}

test('an upsert that inserted reads as a create', () => {
  expect(describeChange(CELL_INSERT)).toBe('Added a cell')
  expect(describeChange(EDGE_INSERT)).toBe('Connected two cells')
})

test('an upsert that updated does not read as a create', () => {
  expect(describeChange(CELL_UPDATE)).toBe('Edited a cell’s text')
  expect(describeChange(EDGE_UPDATE)).toBe('Edited a connection')
})

test('an update with no recoverable before-state still reads as an edit', () => {
  // No inverse is how the ledger says the prior state did not come back. Only
  // the update half can be in that state, so the sentence must not fall back
  // to the create — the fallback is the defect, not the safe default.
  const entry: ChangeEntry = { id: 'c5', fn: 'upsert_cell', args: {}, at: 0 }
  expect(describeChange(entry)).toBe('Edited a cell’s text')
  const edge: ChangeEntry = { id: 'c6', fn: 'set_cell_dependency', args: {}, at: 0 }
  expect(describeChange(edge)).toBe('Edited a connection')
})
