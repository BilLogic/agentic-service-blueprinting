#!/usr/bin/env node
/**
 * Every (table, column) a panel editor writes directly, and the tables whose
 * rows it therefore has to be allowed to reach.
 *
 * The five panel editors do not write through the definer RPCs. They call
 * `.from(t).update({…})` under the caller's own privileges (see
 * `src/lib/*SpecMutations.ts`), which means a field is saveable only when TWO
 * independent things are true on the deployed database:
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
 */

/**
 * `table: [columns]`. The columns are the ones named in an `.update({…})` or
 * `.insert({…})` payload in the panel mutation modules — spelled as the
 * database spells them, not as the TypeScript spells them.
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
}

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
