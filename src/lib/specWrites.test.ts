import { beforeEach, describe, expect, it } from 'vitest'
import { sourceOf } from '@/lib/sourceTree'

import { clearSession, sessionSnapshot } from '@/lib/authoringSession'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import { updateLaneSpec } from '@/lib/laneSpecMutations'
import { updatePhaseSpec } from '@/lib/phaseSpecMutations'
import { updatePathSpec, updateScenarioSummary } from '@/lib/scenarioSpecMutations'
import {
  updateBusinessModel,
  updateServiceEntityExamples,
  updateServiceSummary,
} from '@/lib/serviceSpecMutations'
import { updateStepSummary } from '@/lib/stepSpecMutations'
import { inMemoryDatabase, type Row } from '@/test/inMemoryDatabase'

/**
 * What every spec level writes, row by row and ledger entry by ledger entry.
 *
 * A spec write is one rule at six levels — normalise, update, translate the
 * failure, require rows, invalidate, record the inverse — and the rule used to
 * be spelled out once per level, comments included. The levels differ in what
 * is genuinely theirs: the table, the column the write is addressed by, the
 * columns a spec may touch and how each is normalised, and the shape of the
 * inverse the ledger carries.
 *
 * These cases are the recording of that difference, taken from the six modules
 * as they stood. Each drives one write against the in-memory database and
 * states the whole of what came out — the patch as PostgREST received it, the
 * rows as they ended up, and the ledger entry with its inverse. A shared
 * implementation that changes a byte of any of them fails here, which is the
 * point: the levels are being folded into one write, and the evidence that
 * nothing moved has to be stronger than a reading of the diff.
 *
 * Freshness is the one station not asserted here. It has its own seam and its
 * own recording stand-in in `queryInvalidation.test.ts`, and a second reader of
 * it beside this one could only ever disagree with the first.
 */

/**
 * The modules that declare a spec level. Listed rather than globbed, so a
 * module renamed out of the family fails loudly here instead of quietly
 * shrinking what this file claims to cover — the same rule, and the same
 * reason, as `revertCoverageContract`'s own list.
 */
const MUTATION_MODULES = [
  'cellSpecMutations.ts',
  'laneSpecMutations.ts',
  'phaseSpecMutations.ts',
  'scenarioSpecMutations.ts',
  'serviceSpecMutations.ts',
  'stepSpecMutations.ts',
] as const

type Case = {
  /**
   * The level, as the panel opening it would name it. A name carrying a comma
   * is a SECOND case for a level already counted — the lane with one row —
   * rather than a level of its own.
   */
  level: string
  seed: Record<string, Row[]>
  /** The level's write, with the record flag the ledger cases vary. */
  write: (client: never, options?: { record?: boolean }) => Promise<void>
  /**
   * The update as the database received it: the patch, what addressed it, and
   * what it selected. The last is not decoration — the row count
   * `requireRowsWritten` reads comes from the select, and a level addressed by
   * a column that is not `id` must select that column or PostgREST answers 400.
   */
  update: { table: string; patch: Row; filters: Row; select: string }
  /** Every seeded row afterwards, so a write that reached too far shows. */
  rows: Record<string, Row[]>
  /** The ledger entry, minus the id and timestamp the session mints. */
  ledger: { fn: string; args: Row; revert?: { fn: string; args: Row } }
}

const CASES: Case[] = [
  {
    level: 'cell',
    seed: { cells: [{ id: 'cell-1', function: 'Before', form: 'Before', value_props: [] }] },
    write: (client, options) =>
      updateCellSpec(
        client,
        'cell-1',
        {
          function: ' Confirm ',
          form: '  ',
          valueProps: [
            { for: ' Customer ', value: ' A slot ' },
            { for: ' ', value: '' },
          ],
        },
        { function: 'old fn', form: 'old form', valueProps: [] },
        options,
      ),
    update: {
      table: 'cells',
      patch: {
        function: 'Confirm',
        form: null,
        value_props: [{ for: 'Customer', value: 'A slot' }],
      },
      filters: { id: 'cell-1' },
      select: 'id',
    },
    rows: {
      cells: [
        {
          id: 'cell-1',
          function: 'Confirm',
          form: null,
          value_props: [{ for: 'Customer', value: 'A slot' }],
        },
      ],
    },
    ledger: {
      fn: 'update_cell_spec',
      args: { cell_id: 'cell-1' },
      revert: {
        fn: 'update_cell_spec',
        args: {
          cell_id: 'cell-1',
          update: { function: 'old fn', form: 'old form', valueProps: [] },
        },
      },
    },
  },
  {
    level: 'lane',
    // Three rows carry the label and two are named: a fan-out that reached the
    // third, or stopped at the first, shows in the rows below.
    seed: { lanes: [{ id: 'lane-1' }, { id: 'lane-2' }, { id: 'lane-3' }] },
    write: (client, options) =>
      updateLaneSpec(
        client,
        ['lane-1', 'lane-2'],
        {
          ownerTeam: ' Dispatch ',
          kpis: [' first ', '  ', 'second'],
          tools: ['  '],
          stakeholderId: null,
        },
        { ownerTeam: 'Old', kpis: [], tools: [], stakeholderId: 'st-1' },
        options,
      ),
    update: {
      table: 'lanes',
      patch: {
        owner_team: 'Dispatch',
        kpis: ['first', 'second'],
        tools: [],
        stakeholder_id: null,
      },
      filters: { id: ['lane-1', 'lane-2'] },
      select: 'id',
    },
    rows: {
      lanes: [
        { id: 'lane-1', owner_team: 'Dispatch', kpis: ['first', 'second'], tools: [], stakeholder_id: null },
        { id: 'lane-2', owner_team: 'Dispatch', kpis: ['first', 'second'], tools: [], stakeholder_id: null },
        { id: 'lane-3' },
      ],
    },
    ledger: {
      fn: 'update_lane_spec',
      args: { lane_ids: ['lane-1', 'lane-2'] },
      revert: {
        fn: 'update_lane_spec',
        args: {
          lane_ids: ['lane-1', 'lane-2'],
          update: { ownerTeam: 'Old', kpis: [], tools: [], stakeholderId: 'st-1' },
        },
      },
    },
  },
  {
    // The same level with ONE row named: a one-path scenario's lane, which is
    // the ordinary case there rather than a corner. A write that read a
    // single-member set as a single value would address the column with an
    // array and match nothing.
    level: 'lane, one row',
    seed: { lanes: [{ id: 'lane-1' }, { id: 'lane-2' }] },
    write: (client, options) =>
      updateLaneSpec(
        client,
        ['lane-1'],
        { ownerTeam: 'Dispatch', kpis: [], tools: [], stakeholderId: 'st-1' },
        { ownerTeam: '', kpis: [], tools: [], stakeholderId: null },
        options,
      ),
    update: {
      table: 'lanes',
      patch: { owner_team: 'Dispatch', kpis: [], tools: [], stakeholder_id: 'st-1' },
      filters: { id: ['lane-1'] },
      select: 'id',
    },
    rows: {
      lanes: [
        { id: 'lane-1', owner_team: 'Dispatch', kpis: [], tools: [], stakeholder_id: 'st-1' },
        { id: 'lane-2' },
      ],
    },
    ledger: {
      fn: 'update_lane_spec',
      args: { lane_ids: ['lane-1'] },
      revert: {
        fn: 'update_lane_spec',
        args: {
          lane_ids: ['lane-1'],
          update: { ownerTeam: '', kpis: [], tools: [], stakeholderId: null },
        },
      },
    },
  },
  {
    level: 'phase',
    seed: { phases: [{ id: 'phase-1' }] },
    write: (client, options) =>
      updatePhaseSpec(
        client,
        'phase-1',
        { summary: ' A phase ', businessImpact: '', operationalRequirements: ' needs ' },
        { summary: 'old', businessImpact: 'old bi', operationalRequirements: '' },
        options,
      ),
    update: {
      table: 'phases',
      patch: { summary: 'A phase', business_impact: null, operational_requirements: 'needs' },
      filters: { id: 'phase-1' },
      select: 'id',
    },
    rows: {
      phases: [
        { id: 'phase-1', summary: 'A phase', business_impact: null, operational_requirements: 'needs' },
      ],
    },
    ledger: {
      fn: 'update_phase_spec',
      args: { phase_id: 'phase-1' },
      revert: {
        fn: 'update_phase_spec',
        args: {
          phase_id: 'phase-1',
          update: { summary: 'old', businessImpact: 'old bi', operationalRequirements: '' },
        },
      },
    },
  },
  {
    level: 'scenario',
    seed: { scenarios: [{ id: 'scenario-1' }] },
    // The previous summary is EMPTY, which is the case a truthiness test gets
    // wrong: an inverse is still owed, and undoing back to empty is an undo.
    write: (client, options) => updateScenarioSummary(client, 'scenario-1', '  When it rains  ', '', options),
    update: {
      table: 'scenarios',
      patch: { summary: 'When it rains' },
      filters: { id: 'scenario-1' },
      select: 'id',
    },
    rows: { scenarios: [{ id: 'scenario-1', summary: 'When it rains' }] },
    ledger: {
      fn: 'update_scenario_spec',
      args: { scenario_id: 'scenario-1' },
      revert: { fn: 'update_scenario_spec', args: { scenario_id: 'scenario-1', summary: '' } },
    },
  },
  {
    level: 'path',
    seed: { paths: [{ id: 'path-1' }] },
    write: (client, options) =>
      updatePathSpec(
        client,
        'path-1',
        { summary: ' s ', note: '', status: 'live' },
        { summary: 'old s', note: 'old n', status: 'proposed' },
        options,
      ),
    update: {
      table: 'paths',
      // `status` passes through untrimmed: it is a domain value, not prose.
      patch: { summary: 's', note: null, status: 'live' },
      filters: { id: 'path-1' },
      select: 'id',
    },
    rows: { paths: [{ id: 'path-1', summary: 's', note: null, status: 'live' }] },
    ledger: {
      fn: 'update_path_spec',
      args: { path_id: 'path-1' },
      revert: {
        fn: 'update_path_spec',
        args: {
          path_id: 'path-1',
          update: { summary: 'old s', note: 'old n', status: 'proposed' },
        },
      },
    },
  },
  {
    level: 'service summary',
    seed: { services: [{ id: 'svc-1' }] },
    write: (client, options) => updateServiceSummary(client, 'svc-1', '  The retrofit ', '', options),
    update: {
      table: 'services',
      patch: { summary: 'The retrofit' },
      filters: { id: 'svc-1' },
      select: 'id',
    },
    rows: { services: [{ id: 'svc-1', summary: 'The retrofit' }] },
    ledger: {
      fn: 'update_service_summary',
      args: { service_id: 'svc-1' },
      revert: { fn: 'update_service_summary', args: { service_id: 'svc-1', summary: '' } },
    },
  },
  {
    level: 'business model',
    // The one level addressed by a column that is not `id`.
    seed: { business_models: [{ service_id: 'svc-1' }] },
    write: (client, options) =>
      updateBusinessModel(
        client,
        'svc-1',
        { funding: ' grant ', pricing: '', deliveryCost: ' cost ', revenueModel: '', partners: ' p ' },
        { funding: 'old', pricing: 'old', deliveryCost: '', revenueModel: '', partners: '' },
        options,
      ),
    update: {
      table: 'business_models',
      patch: {
        funding: 'grant',
        pricing: null,
        delivery_cost: 'cost',
        revenue_model: null,
        partners: 'p',
      },
      filters: { service_id: 'svc-1' },
      // Not `id`: a `business_models` row has none, and selecting one is a 400.
      select: 'service_id',
    },
    rows: {
      business_models: [
        {
          service_id: 'svc-1',
          funding: 'grant',
          pricing: null,
          delivery_cost: 'cost',
          revenue_model: null,
          partners: 'p',
        },
      ],
    },
    ledger: {
      fn: 'update_business_model',
      args: { service_id: 'svc-1' },
      revert: {
        fn: 'update_business_model',
        args: {
          service_id: 'svc-1',
          update: { funding: 'old', pricing: 'old', deliveryCost: '', revenueModel: '', partners: '' },
        },
      },
    },
  },
  {
    level: 'entity examples',
    seed: { services: [{ id: 'svc-1', entity_examples: {} }] },
    write: (client, options) =>
      updateServiceEntityExamples(
        client,
        'svc-1',
        { service: ' The retrofit ', phase: '  ', lane: 'The installer lane' },
        { service: 'old' },
        options,
      ),
    update: {
      table: 'services',
      // The emptied phase drops its key rather than storing a blank.
      patch: { entity_examples: { service: 'The retrofit', lane: 'The installer lane' } },
      filters: { id: 'svc-1' },
      select: 'id',
    },
    rows: {
      services: [
        { id: 'svc-1', entity_examples: { service: 'The retrofit', lane: 'The installer lane' } },
      ],
    },
    ledger: {
      fn: 'update_service_entity_examples',
      args: { service_id: 'svc-1' },
      revert: {
        fn: 'update_service_entity_examples',
        args: { service_id: 'svc-1', update: { service: 'old' } },
      },
    },
  },
  {
    level: 'step',
    seed: { steps: [{ id: 'step-1' }] },
    write: (client, options) => updateStepSummary(client, 'step-1', ' The caption ', '', options),
    update: {
      table: 'steps',
      patch: { summary: 'The caption' },
      filters: { id: 'step-1' },
      select: 'id',
    },
    rows: { steps: [{ id: 'step-1', summary: 'The caption' }] },
    ledger: {
      fn: 'update_step_spec',
      args: { step_id: 'step-1' },
      revert: { fn: 'update_step_spec', args: { step_id: 'step-1', summary: '' } },
    },
  },
]

/** The entry as recorded, minus what the session mints rather than the write. */
const recorded = () =>
  sessionSnapshot().map((entry) => ({
    fn: entry.fn,
    args: entry.args,
    ...(entry.revert ? { revert: entry.revert } : {}),
  }))

beforeEach(() => {
  clearSession()
})

describe('a spec write, at every level', () => {
  it('covers every level declared, counted off the declarations themselves', () => {
    // A hardcoded list catches a case being deleted; it does not catch a level
    // being ADDED. A tenth declaration on a table the surface already names
    // would be written by the shared rule, pass every other guard, and arrive
    // here with no recording at all — so the expected count is read off the
    // declarations, the way the revert-coverage contract reads `fn` off them.
    const declared = MUTATION_MODULES.flatMap((file) => [
      ...sourceOf(`lib/${file}`).matchAll(/\bspecWriter\(/g),
    ]).length
    expect(declared).toBeGreaterThan(0)
    expect(
      CASES.filter((one) => !one.level.includes(',')).length,
      'A spec level was declared without a recording here. Add a case to CASES ' +
        'stating the patch, the rows and the ledger entry its write produces.',
    ).toBe(declared)
  })

  it.each(CASES)('$level writes the columns it declares', async (one) => {
    const db = inMemoryDatabase(one.seed)
    await one.write(db.client as never)
    expect(db.updates).toEqual([one.update])
    expect(db.tables).toEqual(one.rows)
  })

  it.each(CASES)('$level records one entry carrying its inverse', async (one) => {
    const db = inMemoryDatabase(one.seed)
    await one.write(db.client as never)
    expect(recorded()).toEqual([one.ledger])
  })

  it.each(CASES)('$level records nothing on the revert path', async (one) => {
    // `record: false` is how `executeRevert` calls back in: the write lands and
    // the ledger stays where it was, or an undo would itself be undoable and
    // the stack would never empty.
    const db = inMemoryDatabase(one.seed)
    await one.write(db.client as never, { record: false })
    expect(db.updates).toEqual([one.update])
    expect(recorded()).toEqual([])
  })

  it('refuses a fan-out addressed to nothing, before it writes', async () => {
    // The rule's first station, and the only one no level can reach through
    // the cases above: a lane whose rows were deleted while its panel was open
    // hands the write an empty set, and an update matching nothing is a write
    // that reports success having done nothing. The sentence is built from the
    // level's own subject, so this also holds that wording steady.
    const db = inMemoryDatabase({ lanes: [{ id: 'lane-1' }] })
    await expect(
      updateLaneSpec(db.client as never, [], {
        ownerTeam: 'Dispatch',
        kpis: [],
        tools: [],
        stakeholderId: null,
      }),
    ).rejects.toThrow('That lane no longer exists — nothing to save onto.')
    expect(db.updates).toEqual([])
    expect(recorded()).toEqual([])
  })

  it('hands a refusal on as the sentence a person can act on', async () => {
    // The station between the update and the row count. A revoked column grant
    // arrives as database text, and what the panel shows is what
    // `toAuthoringError` makes of it — never the raw string.
    const refusing = {
      from: () => {
        const api = {
          update: () => api,
          eq: () => api,
          select: () => api,
          then: (resolve: (value: unknown) => unknown) =>
            Promise.resolve({
              data: null,
              error: { message: 'duplicate key value violates unique constraint' },
            }).then(resolve),
        }
        return api
      },
    }
    await expect(
      updateStepSummary(refusing as never, 'step-1', 'The caption'),
    ).rejects.toThrow('Something with that name or position already exists here.')
    expect(recorded()).toEqual([])
  })

  it.each(CASES)('$level fails rather than reporting a write that matched no row', async (one) => {
    // PostgREST answers a zero-row update with a 200 and an empty array, so
    // every level has to raise rather than carry on as if the write landed.
    const db = inMemoryDatabase(
      Object.fromEntries(Object.keys(one.seed).map((table) => [table, []])),
    )
    await expect(one.write(db.client as never)).rejects.toThrow(/no longer exists/)
    expect(recorded()).toEqual([])
  })
})
