#!/usr/bin/env node
/**
 * Every (table, column) the authoring UI writes directly, and the tables whose
 * rows it therefore has to be allowed to reach.
 *
 * The panel editors are the largest family and the reason this file exists, but
 * they are not the whole of it: the evidence form, the findings list, the slice
 * editor and the cell's placement rows write the same way. None of them go
 * through the definer RPCs. They call `.from(t).update({…})` under the caller's
 * own privileges (see `src/lib/*Mutations.ts`), which means a field is saveable
 * only when TWO independent things are true on the deployed database:
 *
 *   1. `authenticated` holds UPDATE on that COLUMN — the grant.
 *   2. an UPDATE POLICY on that table admits `authenticated` — RLS.
 *
 * Both have been missing, separately, inside three migrations of each other,
 * and neither failure is loud. A missing grant is a 42501 the panel surfaces as
 * "permission denied for table …". A missing policy is worse: under RLS an
 * UPDATE nobody is allowed to make matches zero rows and returns 200, so
 * `requireRowsWritten` reports the row as DELETED. And both are invisible on a
 * laptop, because local authoring holds the dev service key and `service_role`
 * bypasses RLS entirely.
 *
 * 21000126000000 swept the grants once by hand and 21000127000000 swept them
 * again after the first sweep missed `phases.summary`; 21000128000000 added the
 * policy the grant sweep could not see. A one-time sweep is the wrong
 * instrument for a surface that grows every time a panel gains a field. This
 * list is the standing one: `check:seed-load` asks the real database, after the
 * real recipe applies, whether each of these is writable — the question the
 * save asks, six minutes before a deployed author asks it.
 *
 * KEEP THIS IN STEP with the mutation modules. A field added to a panel and not
 * added here is exactly the field the next migration will forget to grant.
 *
 * THE TABLES ARE NO LONGER HAND-KEPT. `scripts/tests/the-surface-is-the-writers.test.mjs`
 * walks `src/` for direct table writes and holds this map to what it finds, in
 * both directions: a table written by the app and named neither here nor in
 * `OUTSIDE_THE_SURFACE` fails, and so does an entry nothing writes any more.
 * That test exists because this list had drifted six tables wide — `cells`,
 * `cell_touchpoints`, `evidence`, `audit_findings`, `slices` and `slides` were
 * all written by the app and absent from it, and a declaration with a hole in
 * it is worse than none: a reader consulting it to answer "may the app change
 * this table?" gets the wrong answer, and every check built on it inherits the
 * hole in silence.
 *
 * THE COLUMNS ARE STILL HAND-KEPT, and cannot be otherwise: a payload is as
 * often `.update(next)` or `.update(patch)` as it is a literal, so no scan of
 * the source can name them. What holds them instead is
 * `src/types/database.ts` — the same test asserts that every column named here
 * is a column the schema has, so a rename fails loudly rather than quietly
 * pointing the assertion at nothing. That check earns its place twice over:
 * `has_column_privilege` RAISES on a column that does not exist, so a typo here
 * reaches CI as "the fresh-database seed load failed" with no mention of the
 * column.
 *
 * WHAT IS ASSERTED IS THE UPDATE PATH, and only that. `buildWriteSurfaceSql`
 * asks for an UPDATE grant and an UPDATE policy; the app also inserts and
 * deletes `evidence`, `slices`, `slides`, `stakeholders` and `audit_findings`,
 * and no assertion here covers those. That is a known limit of this map's
 * shape, stated so it is not mistaken for coverage.
 */

/**
 * `table: [columns]`. The columns are the ones named in an `.update({…})`
 * payload in the mutation modules — the UPDATE grant is what is asserted, so an
 * insert-only column would be asking the database the wrong question. Spelled
 * as the database spells them, not as the TypeScript spells them.
 */
export const PANEL_WRITE_SURFACE = {
  // src/lib/stepSpecMutations.ts
  steps: ['summary'],
  // src/lib/serviceSpecMutations.ts
  services: ['summary', 'entity_examples'],
  // src/lib/phaseSpecMutations.ts
  phases: ['summary', 'business_impact', 'operational_requirements'],
  // src/lib/scenarioSpecMutations.ts
  scenarios: ['summary'],
  paths: ['summary', 'note', 'status'],
  // src/lib/laneSpecMutations.ts
  lanes: ['owner_team', 'kpis', 'tools', 'stakeholder_id'],
  // src/lib/stakeholderMutations.ts
  stakeholders: ['name', 'kind', 'summary', 'aliases'],
  // src/lib/serviceSpecMutations.ts (the Service panel's second row)
  business_models: ['funding', 'pricing', 'delivery_cost', 'revenue_model', 'partners'],
  // src/lib/cellContentMutations.ts (content, summary, owner, perceived_owner,
  // status) and src/lib/cellSpecMutations.ts (function, form, value_props) —
  // one table, two panels, and the reason the grant for it arrives in three
  // separate migrations.
  cells: [
    'content',
    'summary',
    'owner',
    'perceived_owner',
    'status',
    'function',
    'form',
    'value_props',
  ],
  // src/lib/touchpointMutations.ts — the cell panel's placement rows.
  cell_touchpoints: ['summary', 'role'],
  // src/lib/evidenceMutations.ts. The form also inserts and deletes; see the
  // header for why only the update is asserted.
  evidence: ['kind', 'title', 'note'],
  // src/lib/findingMutations.ts — exactly the columns `toPatch` builds, which
  // is exactly the column list the recipe grants. `check_key` and `service_id`
  // are written on insert only and are NOT updatable; naming either here would
  // assert a privilege the deployment deliberately withholds.
  audit_findings: ['severity', 'summary', 'run_id', 'cell_ids', 'cell_keys', 'source', 'status'],
  // src/lib/sliceMutations.ts. Slides are replaced wholesale — deleted and
  // reinserted — so `illustration` is the only column the editor UPDATES.
  slices: ['title', 'summary', 'kind', 'actor', 'authorship'],
  slides: ['illustration'],
}

/**
 * The tables the app writes directly that are deliberately NOT on the surface,
 * each with the reason it is not.
 *
 * Listed, or explained — not silence. A reader who comes here to ask whether
 * the app may change a table has to find every table it writes named somewhere
 * on this page, and an omission has to be distinguishable from an oversight.
 *
 * Every entry is asserted to still be written by something, so an exemption for
 * a table nothing touches any more fails rather than sitting here forever.
 */
export const OUTSIDE_THE_SURFACE = [
  {
    table: 'agent_sessions',
    because:
      'the agent transcript, not blueprint data. It is best-effort by design: the deployed read-only site has no write policy on it and every call there fails quietly on purpose, so asserting that `authenticated` may update it would assert the opposite of the intent. See src/lib/agent/persistence.ts, which the write-boundary contract exempts for the same reason.',
  },
  {
    table: 'agent_messages',
    because:
      'the other half of the same transcript, written by the same module under the same best-effort contract.',
  },
]

/** Flattened to `table.column` pairs, in declaration order. */
export function writtenColumns() {
  return Object.entries(PANEL_WRITE_SURFACE).flatMap(([table, columns]) =>
    columns.map((column) => [table, column]),
  )
}

/** The tables that therefore need an UPDATE policy admitting `authenticated`. */
export function writtenTables() {
  return Object.keys(PANEL_WRITE_SURFACE)
}

/**
 * One query returning `label|ok` per assertion, run as the OWNER.
 *
 * `has_column_privilege` and `pg_policies` answer for a named role without
 * becoming it, which is what lets this run in the same session as the anon
 * inventory read. The policy question is EXISTENCE, deliberately — whether a
 * given author passes the predicate is that policy's business (`stakeholders`
 * admits only service accounts, on purpose), but a table with no UPDATE policy
 * at all admits nobody and reports the failure as a deleted row.
 */
export function buildWriteSurfaceSql() {
  const grants = writtenColumns().map(
    ([table, column]) =>
      `select 'grant ${table}.${column}'::text as t, ` +
      `has_column_privilege('authenticated', 'public.${table}', '${column}', 'UPDATE') as ok`,
  )
  const policies = writtenTables().map(
    (table) =>
      `select 'policy ${table}', exists(select 1 from pg_policies ` +
      `where schemaname = 'public' and tablename = '${table}' ` +
      `and cmd = 'UPDATE' and 'authenticated' = any (roles))`,
  )
  return `${[...grants, ...policies].join('\nunion all\n')};`
}

/** Parse `label|t|f` lines, and say what a false one means. */
export function evaluateWriteSurface(stdout) {
  const problems = []
  const seen = new Set()
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const [label, ok] = trimmed.split('|')
    if (label === undefined || ok === undefined) continue
    seen.add(label)
    if (ok === 't') continue
    const [kind, what] = label.split(' ')
    if (kind === 'grant') {
      problems.push(
        `authenticated cannot UPDATE public.${what} — the panel that writes it ` +
          `is refused with "permission denied"; grant the column in a migration`,
      )
    } else {
      problems.push(
        `public.${what} has no UPDATE policy admitting authenticated — under RLS ` +
          `the panel's save matches zero rows, returns 200, and is reported to ` +
          `the author as "that row no longer exists"; add the policy in a migration`,
      )
    }
  }
  const expected = [
    ...writtenColumns().map(([table, column]) => `grant ${table}.${column}`),
    ...writtenTables().map((table) => `policy ${table}`),
  ]
  for (const label of expected) {
    if (!seen.has(label)) problems.push(`${label} returned no row — the write-surface read never reached it`)
  }
  return problems
}
