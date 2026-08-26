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
export const TEMPLATE_SCHEMA_VERSION = '2026.08.26'

/**
 * Every version this checkout can read and write, newest first.
 *
 * A version leaves this list when the migration that would carry it forward
 * stops existing — which is a deliberate act, not an omission.
 */
export const SUPPORTED_SCHEMA_VERSIONS: readonly string[] = [
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
