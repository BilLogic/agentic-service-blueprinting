#!/usr/bin/env node
/**
 * Sample-content generator (originally the Phase 0-G scale-test fixture).
 *
 * Emits BOTH template sample artifacts from one source of truth:
 *   - src/data/scaleFixture.ts  — the offline / no-DB fallback module
 *   - supabase/seed.sql         — the equivalent database seed (lifecycle →
 *     phases → 'Sample Service' scenario → paths/steps/layers/cells/triggers)
 *
 * One 'Sample Service' scenario with THREE paths
 * (happy / alternative / exception) sharing 16 scenario-scoped steps and
 * 12 swimlanes per path, exercising the generalized rendering path:
 *   - 3 canonical actor lanes with CJK display names (2 null-role generic
 *     lanes + a customer_actions spine) to smoke-test non-English rendering
 *   - frontstage/backstage tech + support_systems pill lanes
 *     (newline-separated multi-pill content)
 *   - a visual picture row
 *   - 3 org-defined CUSTOM roles (compliance_review, partner_ops,
 *     sla_monitoring) that must render as generic swimlanes
 *   - links (url + tech_description types) on a few cells
 *   - triggers: forward cross-layer, same-column, spine chain, and backward
 *     in-lane loops (incl. one on a custom-role lane, exception path only)
 *     to exercise the generic in-lane loop-corridor predicate
 *     (blueprintLayerHasBackwardInLaneLoop in sideBySideCompareLayout.ts)
 *
 * Deterministic UUIDs: f0000000-0000-4000-8000-<PPKKAAAABBBB>
 *   PP = path ordinal (00 = scenario-scoped), KK = kind
 *   (00 path, 01 layer, 02 step, 03 cell, 04 trigger),
 *   AAAA/BBBB = row/column (or index) slots.
 *
 * Usage: node scripts/generate_scale_fixture.mjs
 */

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_PATH = join(REPO_ROOT, 'src', 'data', 'scaleFixture.ts')
const SEED_OUT_PATH = join(REPO_ROOT, 'supabase', 'seed.sql')

const pad2 = (n) => String(n).padStart(2, '0')
const pad4 = (n) => String(n).padStart(4, '0')

/** f0000000-0000-4000-8000-<PP><KK><AAAA><BBBB> */
function fid(pathOrdinal, kind, a = 0, b = 0) {
  return `f0000000-0000-4000-8000-${pad2(pathOrdinal)}${pad2(kind)}${pad4(a)}${pad4(b)}`
}

export const SCENARIO_ID = fid(0, 0, 0, 1)

const KIND = { path: 0, layer: 1, step: 2, cell: 3, trigger: 4 }

const PATHS = [
  {
    ordinal: 1,
    exportKey: 'HAPPY',
    name: 'Happy Path',
    description: 'Full-scale happy flow: 12 lanes x 16 shared steps.',
    path_type: 'happy',
    cjkTag: '',
    enTag: '',
  },
  {
    ordinal: 2,
    exportKey: 'ALTERNATIVE',
    name: 'Alternative Path',
    description: 'Degraded / manual flow variant of the scale fixture.',
    path_type: 'alternative',
    cjkTag: '（备选）',
    enTag: ' (alt)',
  },
  {
    ordinal: 3,
    exportKey: 'EXCEPTION',
    name: 'Exception Path',
    description:
      'Failure-and-recovery variant with an extra custom-lane backward loop.',
    path_type: 'exception',
    cjkTag: '（异常）',
    enTag: ' (exc)',
  },
]

const STEP_COUNT = 16

/** Scenario-scoped steps — shared step ids across all three paths. */
const STEP_NAMES = [
  '提交报修工单',
  'Triage & Prioritize',
  'Verify Asset Record',
  'Schedule Crew',
  'Dispatch Work Order',
  'On-Site Inspection',
  'Replace Component',
  'Capture Evidence',
  'Update Asset Ledger',
  'Quality Review',
  'Notify Requester',
  'Billing Reconciliation',
  'Compliance Sign-off',
  'Partner Settlement',
  'SLA Report',
  '归档与复盘',
]

/**
 * 12 swimlanes. `kind` drives cell-content generation:
 *  - visual: empty-content picture row
 *  - cjk:    CJK actor verbs (null role lanes render as generic swimlanes)
 *  - pills:  newline-separated multi-pill content (tech / support lanes)
 *  - en:     short English action text
 */
const LANES = [
  { row: 0, name: 'Journey Snapshots', role: 'visual', kind: 'visual' },
  {
    row: 1,
    name: '市政管理员',
    role: null,
    kind: 'cjk',
    verbs: ['接收报修', '审批工单', '分派任务', '跟进进度', '验收结果', '归档记录'],
  },
  {
    row: 2,
    name: '现场技术员',
    role: null,
    kind: 'cjk',
    verbs: ['接单出发', '到场勘查', '更换灯具', '拍照回传', '填写台账', '返回站点'],
  },
  {
    row: 3,
    name: '运营协调员',
    role: 'customer_actions',
    kind: 'cjk',
    verbs: ['汇总需求', '协调排期', '同步进展', '催办异常', '确认闭环', '输出周报'],
  },
  {
    row: 4,
    name: 'Citizen-Facing Tech',
    role: 'frontstage_tech',
    kind: 'pills',
    pills: [
      ['GIS Portal'],
      ['GIS Portal', 'Work Order App'],
      ['Work Order App', 'SMS Gateway'],
      ['GIS Portal', 'Work Order App', 'SMS Gateway'],
    ],
  },
  {
    row: 5,
    name: 'Frontstage Ops',
    role: 'frontstage_actions',
    kind: 'en',
    verb: 'Notify requester',
  },
  {
    row: 6,
    name: 'Backstage Tech',
    role: 'backstage_tech',
    kind: 'pills',
    pills: [
      ['Asset DB'],
      ['Asset DB', 'Billing Engine'],
      ['Billing Engine', 'ETL Jobs'],
      ['Asset DB', 'ETL Jobs'],
    ],
  },
  {
    row: 7,
    name: 'Backstage Ops',
    role: 'backstage_actions',
    kind: 'en',
    verb: 'Reconcile records',
  },
  {
    row: 8,
    name: 'Platform Support',
    role: 'support_systems',
    kind: 'pills',
    pills: [['Dev Team'], ['Dev Team', 'GIS Vendor'], ['GIS Vendor', 'NOC']],
  },
  {
    row: 9,
    name: 'Compliance Review',
    role: 'compliance_review',
    kind: 'en',
    verb: 'Audit checkpoint',
  },
  {
    row: 10,
    name: 'Partner Ops',
    role: 'partner_ops',
    kind: 'en',
    verb: 'Partner sync',
  },
  {
    row: 11,
    name: 'SLA Monitoring',
    role: 'sla_monitoring',
    kind: 'en',
    verb: 'SLA check',
  },
]

/** Non-visual lanes skip every 4th column so density stays realistic (~148 cells/path). */
function laneHasCell(row, col) {
  if (row === 0) return true
  return (row * 3 + col) % 4 !== 0
}

function pillContent(lane, col) {
  return lane.pills[(col - 1) % lane.pills.length].join('\n')
}

function cellContent(lane, col, path) {
  switch (lane.kind) {
    case 'visual':
      return ''
    case 'cjk':
      return `${lane.verbs[(col - 1) % lane.verbs.length]} S${pad2(col)}${path.cjkTag}`
    case 'pills':
      return pillContent(lane, col)
    case 'en':
      return `${lane.verb} S${pad2(col)}${path.enTag}`
    default:
      throw new Error(`unknown lane kind: ${lane.kind}`)
  }
}

/** Links + descriptions on a handful of cells, keyed by [row, col]. */
function cellExtras(lane, col) {
  // url links on the customer_actions spine
  if (lane.row === 3 && (col === 2 || col === 9)) {
    return {
      description: `Scale fixture spine cell at column ${col} — exercises the cell detail panel.`,
      links: [
        {
          type: 'url',
          label: 'SOP 文档',
          url: 'https://example.com/scale-test/sop',
        },
      ],
    }
  }

  // tech_description links keyed to the first pill of the cell
  const techDescriptionCells = { 4: [3, 10], 6: [7] }
  if (techDescriptionCells[lane.row]?.includes(col)) {
    const label = lane.pills[(col - 1) % lane.pills.length][0]
    return {
      links: [
        {
          type: 'tech_description',
          label,
          description: `${label} handles this step in the scale-test fixture (generated long-form tech copy).`,
        },
      ],
    }
  }

  return {}
}

function buildSteps() {
  return STEP_NAMES.map((name, index) => ({
    id: fid(0, KIND.step, index + 1, 0),
    name,
    column_position: index + 1,
  }))
}

function buildLayers(path) {
  return LANES.map((lane) => ({
    id: fid(path.ordinal, KIND.layer, lane.row, 0),
    name: lane.name,
    role: lane.role,
    row_position: lane.row,
  }))
}

function buildCells(path, steps) {
  const cells = []
  for (const lane of LANES) {
    for (let col = 1; col <= STEP_COUNT; col += 1) {
      if (!laneHasCell(lane.row, col)) continue
      const extras = cellExtras(lane, col)
      cells.push({
        id: fid(path.ordinal, KIND.cell, lane.row, col),
        layer_id: fid(path.ordinal, KIND.layer, lane.row, 0),
        step_id: steps[col - 1].id,
        content: cellContent(lane, col, path),
        picture: null,
        description: extras.description ?? null,
        links: extras.links ?? [],
      })
    }
  }
  return cells
}

function buildTriggers(path) {
  const cellId = (row, col) => fid(path.ordinal, KIND.cell, row, col)
  const pairs = []

  // Forward in-lane chain along the customer_actions spine (row 3).
  const spineCols = []
  for (let col = 1; col <= STEP_COUNT; col += 1) {
    if (laneHasCell(3, col)) spineCols.push(col)
  }
  for (let i = 0; i < spineCols.length - 1; i += 1) {
    pairs.push([
      [3, spineCols[i]],
      [3, spineCols[i + 1]],
    ])
  }

  // Forward cross-layer triggers.
  pairs.push(
    [[3, 5], [5, 6]],
    [[2, 8], [7, 9]],
    [[7, 9], [9, 10]],
    [[9, 10], [10, 12]],
  )

  // Same-column cross-layer triggers.
  pairs.push(
    [[3, 5], [4, 5]],
    [[5, 8], [6, 8]],
  )

  // Backward in-lane loop on the 现场技术员 actor lane (row 2) — must reserve
  // the generic in-lane loop corridor in side-by-side layout.
  pairs.push([[2, 13], [2, 4]])

  // Exception path only: backward in-lane loop on a CUSTOM-role lane
  // (compliance_review, row 9) — corridor predicate must be role-agnostic.
  if (path.path_type === 'exception') {
    pairs.push([[9, 12], [9, 6]])
  }

  return pairs.map(([source, target], index) => {
    for (const [row, col] of [source, target]) {
      if (!laneHasCell(row, col)) {
        throw new Error(
          `trigger references missing cell (row ${row}, col ${col})`,
        )
      }
    }
    return {
      id: fid(path.ordinal, KIND.trigger, index + 1, 0),
      source_cell_id: cellId(source[0], source[1]),
      target_cell_id: cellId(target[0], target[1]),
    }
  })
}

function buildBlueprint(path, steps) {
  return {
    path: {
      id: fid(path.ordinal, KIND.path, 0, 0),
      name: path.name,
      description: path.description,
      note: null,
      path_type: path.path_type,
    },
    layers: buildLayers(path),
    steps,
    cells: buildCells(path, steps),
    triggers: buildTriggers(path),
  }
}

// ---------------------------------------------------------------------------
// TS emission
// ---------------------------------------------------------------------------

function emitList(items, indent) {
  return items.map((item) => `${indent}${JSON.stringify(item)},`).join('\n')
}

function emitBlueprint(exportName, blueprint) {
  return `export const ${exportName}: BlueprintData = {
  path: ${JSON.stringify(blueprint.path)},
  layers: [
${emitList(blueprint.layers, '    ')}
  ],
  steps: [
${emitList(blueprint.steps, '    ')}
  ],
  cells: [
${emitList(blueprint.cells, '    ')}
  ],
  triggers: [
${emitList(blueprint.triggers, '    ')}
  ],
}
`
}

const steps = buildSteps()
const blueprints = PATHS.map((path) => ({
  path,
  blueprint: buildBlueprint(path, steps),
}))

const totals = blueprints.map(({ path, blueprint }) => ({
  path: path.name,
  layers: blueprint.layers.length,
  steps: blueprint.steps.length,
  cells: blueprint.cells.length,
  triggers: blueprint.triggers.length,
}))

const header = `// GENERATED by scripts/generate_scale_fixture.mjs — edit the generator, not this file.
//
// The template's sample content: one 'Sample Service' scenario, three paths
// (happy / alternative / exception) sharing 16 scenario-scoped steps, with
// 12 swimlanes per path (CJK actor lanes, canonical roles, a visual row and
// three org-defined custom roles), pill lanes, links, and forward /
// same-column / backward-loop triggers. Registered as the offline fallback
// scenario in src/data/blueprintFallbacks.ts and src/types/nav.ts; the
// matching database seed is generated into supabase/seed.sql.
//
// Dimensions:
${totals
  .map(
    (t) =>
      `//   ${t.path}: ${t.layers} layers, ${t.steps} steps, ${t.cells} cells, ${t.triggers} triggers`,
  )
  .join('\n')}

import type { BlueprintData } from '@/types/blueprint'

export const SCALE_TEST_SCENARIO_ID = '${SCENARIO_ID}'
${blueprints
  .map(
    ({ path, blueprint }) =>
      `export const SCALE_TEST_${path.exportKey}_PATH_ID = '${blueprint.path.id}'`,
  )
  .join('\n')}

`

const body = blueprints
  .map(({ path, blueprint }) =>
    emitBlueprint(`SCALE_TEST_${path.exportKey}_PATH_FALLBACK`, blueprint),
  )
  .join('\n')

const footer = `
/** All scale-test path fallbacks in picker order (happy, alternative, exception). */
export const SCALE_TEST_PATH_FALLBACKS: BlueprintData[] = [
${blueprints
  .map(({ path }) => `  SCALE_TEST_${path.exportKey}_PATH_FALLBACK,`)
  .join('\n')}
]
`

writeFileSync(OUT_PATH, header + body + footer)

// ---------------------------------------------------------------------------
// SQL seed emission (supabase/seed.sql) — same content as the TS fallback,
// wrapped in the sample lifecycle/phases from src/types/nav.ts.
// ---------------------------------------------------------------------------

const LIFECYCLE_ID = 'f0000000-0000-4000-8000-000000000010'
const DISCOVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000100'
const DELIVER_PHASE_ID = 'f0000000-0000-4000-8000-000000000200'

const q = (value) => {
  if (value === null || value === undefined) return 'null'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlRows(rows) {
  return rows.map((row) => `  (${row.join(', ')})`).join(',\n')
}

const seedParts = []
seedParts.push(`-- GENERATED by scripts/generate_scale_fixture.mjs — edit the generator, not this file.
--
-- Sample seed: one 'Sample Lifecycle' with a Discover phase holding the
-- generated 'Sample Service' scenario (3 paths x 12 lanes x 16 steps,
-- layer_role-driven, CJK-safe) and a Deliver phase demonstrating the
-- phase loop (loops_to_phase_id). Matches src/data/scaleFixture.ts and
-- src/types/nav.ts exactly. Idempotent: replaces the sample lifecycle.

begin;

-- Scenario-replace: drop the prior sample lifecycle (cascades to all children).
delete from public.service_lifecycles where id = ${q(LIFECYCLE_ID)};

insert into public.service_lifecycles (id, name, description) values
  (${q(LIFECYCLE_ID)}, 'Sample Lifecycle', 'Generated sample content — replace with your own service lifecycle.');

insert into public.phases (id, service_lifecycle_id, name, description, order_position) values
  (${q(DISCOVER_PHASE_ID)}, ${q(LIFECYCLE_ID)}, 'Discover', 'Sample phase — a request is received, triaged, and resolved on site.', 1),
  (${q(DELIVER_PHASE_ID)}, ${q(LIFECYCLE_ID)}, 'Deliver', 'Sample phase — demonstrates the lifecycle loop back to Discover.', 2);

update public.phases
set loops_to_phase_id = ${q(DISCOVER_PHASE_ID)}
where id = ${q(DELIVER_PHASE_ID)};

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type) values
  (${q(SCENARIO_ID)}, ${q(DISCOVER_PHASE_ID)}, 'Sample Service', 'Generated sample scenario: 12 lanes (canonical + custom roles, CJK labels), 16 steps, 3 paths.', 1, 'side-by-side');
`)

seedParts.push(`insert into public.paths (id, service_scenario_id, name, description, note, path_type) values
${sqlRows(
  blueprints.map(({ blueprint }) => [
    q(blueprint.path.id),
    q(SCENARIO_ID),
    q(blueprint.path.name),
    q(blueprint.path.description),
    q(blueprint.path.note),
    q(blueprint.path.path_type),
  ]),
)};
`)

seedParts.push(`insert into public.steps (id, service_scenario_id, name) values
${sqlRows(steps.map((step) => [q(step.id), q(SCENARIO_ID), q(step.name)]))};
`)

seedParts.push(`insert into public.path_steps (path_id, step_id, column_position) values
${sqlRows(
  blueprints.flatMap(({ blueprint }) =>
    blueprint.steps.map((step) => [
      q(blueprint.path.id),
      q(step.id),
      String(step.column_position),
    ]),
  ),
)};
`)

seedParts.push(`insert into public.layers (id, path_id, name, layer_role, row_position) values
${sqlRows(
  blueprints.flatMap(({ blueprint }) =>
    blueprint.layers.map((layer) => [
      q(layer.id),
      q(blueprint.path.id),
      q(layer.name),
      q(layer.role),
      String(layer.row_position),
    ]),
  ),
)};
`)

seedParts.push(`insert into public.cells (id, path_id, layer_id, step_id, content, picture, description, links) values
${sqlRows(
  blueprints.flatMap(({ blueprint }) =>
    blueprint.cells.map((cell) => [
      q(cell.id),
      q(blueprint.path.id),
      q(cell.layer_id),
      q(cell.step_id),
      q(cell.content),
      q(cell.picture),
      q(cell.description),
      `${q(JSON.stringify(cell.links))}::jsonb`,
    ]),
  ),
)};
`)

seedParts.push(`insert into public.cell_triggers (id, source_cell_id, target_cell_id) values
${sqlRows(
  blueprints.flatMap(({ blueprint }) =>
    blueprint.triggers.map((trigger) => [
      q(trigger.id),
      q(trigger.source_cell_id),
      q(trigger.target_cell_id),
    ]),
  ),
)};

commit;
`)

writeFileSync(SEED_OUT_PATH, seedParts.join('\n'))

console.log(`Wrote ${OUT_PATH}`)
for (const t of totals) {
  console.log(
    `  ${t.path}: ${t.layers} layers, ${t.steps} steps, ${t.cells} cells, ${t.triggers} triggers`,
  )
}
