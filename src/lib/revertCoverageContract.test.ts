/**
 * Every revert a mutation can record must be one executeRevert can perform.
 *
 * `WriteFn` already buys a compile-time guarantee for `describeChange` — add a
 * write and forget its sentence and the build breaks. That guard was pointed at
 * the switch that writes the ledger's *prose*. The switch that performs the
 * *undo* had none, and the gap cost exactly what you would expect: the two
 * service mutations recorded `fn: 'update_service_summary'` and
 * `'update_business_model'`, executeRevert had no case for either, and both
 * fell to a default branch that calls `client.rpc(fn, args)` — a Postgres
 * function that has never existed. Every service edit shipped an undo button
 * that could only 404, and nothing failed until a human pressed it.
 *
 * This test reads both files as text rather than importing them. executeRevert
 * needs a live Supabase client to run, and the question here is not what it
 * does but which names it knows — which is a fact about the source, and
 * readable without standing up a database.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LIB = join(process.cwd(), 'src', 'lib')

const readLib = (file: string) => readFileSync(join(LIB, file), 'utf8')

/**
 * Files that can record a revert. A mutation module not listed here is
 * invisible to this test, so the list is asserted non-empty and each file is
 * read eagerly — a renamed module fails loudly rather than quietly shrinking
 * the set under audit.
 */
const MUTATION_MODULES = [
  'authoringRpc.ts',
  'cellContentMutations.ts',
  'cellSpecMutations.ts',
  'evidenceMutations.ts',
  'laneSpecMutations.ts',
  'phaseSpecMutations.ts',
  'scenarioSpecMutations.ts',
  'serviceSpecMutations.ts',
  'sliceMutations.ts',
  'stakeholderMutations.ts',
  'stepSpecMutations.ts',
  'placementResourceMutations.ts',
  'placementLinkMutations.ts',
] as const

/**
 * Reverts that are genuinely Postgres functions, and so are *correctly* served
 * by executeRevert's default branch — it calls `client.rpc(fn, args)`, which is
 * exactly right when the name really is an RPC.
 *
 * Verified against the migration series, which is what builds that list:
 *   select proname from pg_proc where pronamespace = 'public'::regnamespace
 *
 * Every other recorded name is a direct table write dressed as a function name,
 * and needs a case of its own. That is the distinction this file exists to
 * police: `update_service_summary` looked exactly like the ten names below and
 * was not one of them.
 */
const RPC_BACKED = new Set([
  'clear_cell_dependency',
  'delete_cell',
  'delete_path',
  'delete_scenario',
  'remove_lane',
  'remove_lanes',
  'remove_step',
  'rename_path',
  'rename_phase',
  'rename_scenario',
  // #280. The header toggle's write, self-inverse with the previous layout,
  // so the default branch calls it back as is.
  'update_scenario_layout',
  // #273. The inverse of featuring a resource writes the captured
  // {id, featured} pairs back, and is a function reached through the default
  // branch. (`set_featured_resource` itself is never a revert target — its
  // inverse is this one — so it is not listed here.)
  'restore_featured_resources',
  // #277. A placement's identity and its removal are both one function with
  // a returned inverse; the inverse of each is itself an RPC.
  'set_placement_touchpoint',
  'restore_placement',
])

/** `fn: 'name'` inside a recorded RevertSpec. */
const RECORDED_FN = /\bfn:\s*'([a-z_]+)'/g

/** `case 'name':` in executeRevert's switch. */
const HANDLED_FN = /\bcase\s+'([a-z_]+)':/g

const matchAll = (source: string, pattern: RegExp): string[] => {
  const found = new Set<string>()
  for (const match of source.matchAll(pattern)) found.add(match[1])
  return [...found].sort()
}

const recordedFns = (): string[] => {
  const found = new Set<string>()
  for (const file of MUTATION_MODULES) {
    let source: string
    try {
      source = readLib(file)
    } catch {
      // A module in the list that no longer exists is itself the failure —
      // silently skipping it would shrink the audit to nothing over time.
      throw new Error(
        `${file} is listed as a mutation module but could not be read. ` +
          'If it was renamed, update MUTATION_MODULES.',
      )
    }
    for (const fn of matchAll(source, RECORDED_FN)) found.add(fn)
  }
  return [...found].sort()
}

describe('revert coverage', () => {
  it('watches a non-empty set of mutation modules', () => {
    expect(MUTATION_MODULES.length).toBeGreaterThan(0)
    expect(recordedFns().length).toBeGreaterThan(0)
  })

  it('handles every recorded revert that is not a real RPC', () => {
    const handled = new Set(matchAll(readLib('revertChange.ts'), HANDLED_FN))
    const stranded = recordedFns().filter(
      (fn) => !handled.has(fn) && !RPC_BACKED.has(fn),
    )

    // An unhandled name does not crash at the switch — it reaches the default
    // branch and is called as `client.rpc(fn, args)`. If no such function
    // exists, the undo fails with a PostgREST 404, and it fails at the moment
    // a person presses "take back", not at build time.
    expect(
      stranded,
      `Recorded by a mutation, handled by neither an executeRevert case nor a ` +
        `real Postgres function. These will 404 when reverted: ` +
        `${stranded.join(', ')}. Add a case to revertChange.ts, or add the name ` +
        `to RPC_BACKED if you just shipped it as an RPC.`,
    ).toEqual([])
  })

  it('does not claim an RPC that no mutation records any more', () => {
    // Keeps RPC_BACKED honest in the other direction: a stale entry would
    // silently excuse a future direct-table mutation that reused the name.
    const recorded = new Set(recordedFns())
    const orphans = [...RPC_BACKED].filter((fn) => !recorded.has(fn)).sort()
    expect(
      orphans,
      `RPC_BACKED lists names no mutation records any more: ${orphans.join(', ')}`,
    ).toEqual([])
  })

  it('records the service writes with the argument shape their revert reads', () => {
    // Both service reverts are self-inverse: executeRevert hands the captured
    // args straight back to the same function. The payload therefore has to be
    // the shape that function's parameter takes. update_business_model
    // originally spread a camelCase BusinessModelUpdate flat into args, which
    // no consumer on either side could read.
    const source = readLib('serviceSpecMutations.ts')
    expect(source).toContain("args: { service_id: serviceId, update: previous }")
    expect(source).toContain("args: { service_id: serviceId, summary: previous }")
  })
})
