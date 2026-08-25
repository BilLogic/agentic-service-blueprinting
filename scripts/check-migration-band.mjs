#!/usr/bin/env node
/**
 * Upstream migrations live in a reserved timestamp band. Nothing else does.
 *
 * A consumer forks this template, adds `20260901120000_theirs.sql`, then pulls
 * an upstream migration stamped with the day it was written. `supabase db push`
 * applies in timestamp order, so an upstream file stamped earlier than a
 * migration the consumer has already applied lands *before* it — the desync
 * that gets repaired by hand-editing `supabase_migrations.schema_migrations`.
 *
 * The fix is arithmetic rather than procedural. Upstream stamps every new
 * migration in a band above any wall clock a consumer will ever produce, so an
 * upstream file always sorts after every migration the consumer has applied and
 * a pull can only ever append. The number is an allocation counter wearing a
 * date's clothes; the file header carries the real authoring date.
 *
 * The eight migrations that predate the rule keep their real timestamps: they
 * are already applied on every existing database, and renaming an applied
 * migration is the desync this exists to prevent. They are frozen by name here.
 *
 * Run: npm run check:band
 */
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const MIGRATIONS = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

/** The reserved band, inclusive. Both ends are 14-digit migration versions. */
export const BAND_START = '21000101000000'
export const BAND_END = '21991231235959'

/**
 * Applied everywhere before the band existed, and therefore unmovable.
 *
 * This list only ever shrinks. Adding to it would mean stamping a new upstream
 * migration outside the band, which is the thing being prevented.
 */
export const PRE_BAND = new Set([
  '20260716200000',
  '20260729120000',
  '20260730090000',
  '20260803001000',
  '20260818000000',
  '20260818001000',
  '20260818002000',
  '20260819000000',
])

/** `<version>_<name>.sql`, or null when the filename is not a migration. */
export function parseVersion(filename) {
  const match = /^(\d{14})_[a-z0-9_]+\.sql$/.exec(filename)
  return match ? match[1] : null
}

/**
 * A version is a real calendar timestamp, not merely fourteen digits.
 *
 * `supabase migration list` parses the version to display it, so `21000230…`
 * — the thirtieth of February — is a filename that reads fine and breaks the
 * CLI. Reconstructing the string from a parsed Date is what catches it.
 */
export function isCalendarTimestamp(version) {
  const [year, month, day, hour, minute, second] = [
    version.slice(0, 4),
    version.slice(4, 6),
    version.slice(6, 8),
    version.slice(8, 10),
    version.slice(10, 12),
    version.slice(12, 14),
  ].map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  )
}

export function check(filenames) {
  const problems = []
  const seen = new Map()
  const versions = []

  for (const filename of [...filenames].sort()) {
    if (!filename.endsWith('.sql')) continue
    const version = parseVersion(filename)
    if (version === null) {
      problems.push(
        `${filename} is not <14-digit version>_<lower_snake_name>.sql`,
      )
      continue
    }
    if (seen.has(version)) {
      problems.push(`${filename} and ${seen.get(version)} share the version ${version}`)
      continue
    }
    seen.set(version, filename)
    versions.push(version)

    if (PRE_BAND.has(version)) continue

    if (version < BAND_START || version > BAND_END) {
      problems.push(
        `${filename} is stamped outside the reserved band ${BAND_START}–${BAND_END}; ` +
          'upstream migrations are allocated from the band, never from the wall clock',
      )
    }
    if (!isCalendarTimestamp(version)) {
      problems.push(`${filename} is not a real calendar timestamp; the Supabase CLI parses it`)
    }
  }

  // Sorted-by-filename is sorted-by-version, so the band files must come last.
  const banded = versions.filter((version) => !PRE_BAND.has(version))
  const frozen = versions.filter((version) => PRE_BAND.has(version))
  if (banded.length && frozen.length && banded[0] < frozen.at(-1)) {
    problems.push(
      `${seen.get(banded[0])} sorts before the frozen migration ${seen.get(frozen.at(-1))}`,
    )
  }

  return problems
}

function main() {
  const problems = check(readdirSync(MIGRATIONS))
  if (problems.length === 0) {
    console.log(`every upstream migration is inside ${BAND_START}–${BAND_END}`)
    return
  }
  console.error('supabase/migrations breaks the reserved-band rule:\n')
  for (const problem of problems) console.error(`  ${problem}`)
  console.error(
    '\nSee supabase/DATABASE.md § Reserved migration timestamp band. Take the ' +
      'next unused day inside the band; do not stamp with the current date.',
  )
  process.exit(1)
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) main()
