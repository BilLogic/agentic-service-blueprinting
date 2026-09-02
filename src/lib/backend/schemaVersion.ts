/**
 * What shape a target carries, and whether this template can talk to it.
 *
 * The adapter contract has always required "a compatible `schema_version`".
 * Until the database grew a `schema_version` table the value lived only in an
 * IR file and in `blueprint-workspace.json`, so the compatibility check
 * compared a file against a file and never once asked the target. An IR
 * authored against a schema the database does not have would import
 * cheerfully and fail on the first column that moved.
 *
 * The list below is the whole compatibility rule: a version is supported or it
 * is not. Ranges were the alternative and are a promise nobody can keep —
 * "2026.07.16 and later" claims compatibility with shapes that do not exist
 * yet. Each entry earns its place by having a migration behind it.
 */

/** The shape this checkout builds. Bumped by the migration that changes it. */
export const TEMPLATE_SCHEMA_VERSION = '2026.09.05'

/**
 * Every version this checkout can read and write, newest first.
 *
 * A version leaves this list when the migration that would carry it forward
 * stops existing — which is a deliberate act, not an omission.
 */
export const SUPPORTED_SCHEMA_VERSIONS: readonly string[] = [
  // A resource keeps its id, knows its cell, and one of them is featured
  // (#110). `resources.kind` is `link | attachment` and `featured` arrives;
  // a file that authored `other` moves.
  '2026.09.05',
  // `scenarios.layout` is `stacked | merged` (#109). `single` folded into
  // stacked — one path stacked is one band — and merged, until now a
  // session-only display, is a value the row holds, so a scenario left
  // merged opens merged. A file that authored `single` moves.
  '2026.09.04',
  // A cell's `picture` is its `frame` (#94). One word served two ideas — the
  // image on a cell, and the border a walkthrough draws around one — and the
  // column took it. `slice_items` became `slides` in the same migration; the
  // IR never carried that table, so only the cell field moves here.
  '2026.09.03',
  '2026.09.02',
  // The dependency kinds became `leads_to` and `enables` (#94). Not a pair of
  // renames: `needs` put the source at the opposite end from `enables`, so
  // 21000114000000 and the IR step both TURN those edges around. This is the
  // only bump so far that moves authored content, so it is the only one that
  // can change a signed scenario's content hash.
  '2026.09.01',
  // `cells.links` split into `resources` and `cell_touchpoints` (#91). One
  // column held what a cell points at and the prose about a touchpoint used
  // at it; the IR splits with it, so a 2026.08.27 file authors a `links`
  // array this template no longer reads.
  '2026.08.31',
  // propositions → business_models, the last row of the vocabulary map that
  // applied to this package (#84). `evidence.proposition_question_key` keeps
  // the word on purpose: the three validation questions ARE propositions.
  '2026.08.27',
  // The IR can author a `needs` edge: dependency edges carry an optional
  // `kind`, absent meaning `trigger`. No DDL — cell_dependencies.kind has
  // existed since 20260729120000; what moved is the IR's ability to say it.
  '2026.08.26',
  // Lane vocabulary: lanes, cell_dependencies, services, scenarios, position,
  // summary.
  '2026.08.25',
  // The original template shape: lanes, cell_dependencies, services,
  // scenarios, {row,column,slot,order}_position, summary.
  '2026.07.16',
]

export class SchemaVersionMismatch extends Error {
  readonly found: string
  readonly supported: readonly string[]

  constructor(found: string, supported: readonly string[]) {
    super(
      `the target carries schema_version ${found}; this template speaks ` +
        `${supported.join(', ')}. Apply the migrations in supabase/migrations, ` +
        'or check out the template revision that matches the target.',
    )
    this.found = found
    this.supported = supported
    this.name = 'SchemaVersionMismatch'
  }
}

export function isSchemaVersionSupported(version: string): boolean {
  return SUPPORTED_SCHEMA_VERSIONS.includes(version)
}

/**
 * Throw unless the target's version is one this template speaks.
 *
 * The message names both sides on purpose. "Incompatible schema" sends a
 * reader to the migrations directory to guess; "carries 2026.07.16, speaks
 * 2026.08.25" tells them which migration is missing.
 */
export function assertSchemaCompatible(found: string): void {
  if (!isSchemaVersionSupported(found)) {
    throw new SchemaVersionMismatch(found, SUPPORTED_SCHEMA_VERSIONS)
  }
}
