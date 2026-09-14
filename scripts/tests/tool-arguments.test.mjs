import { describe, expect, it } from 'vitest'
import { fileURLToPath } from 'node:url'
import {
  argumentDrift,
  declaredArguments,
  readArguments,
} from '../tool-arguments.mjs'
import { readAppFile } from '../app-source.mjs'

/**
 * #272 — the agent tool's wire, read from both ends.
 *
 * `create_slice` advertised a `description` argument and read a `summary` one.
 * Both files typechecked, because neither names the other's keys in a type:
 * one builds a JSON schema out of string literals, the other reads
 * `args['summary']` out of a `Record<string, unknown>`. A model that filled in
 * the field the schema offered wrote an empty summary and was told the slice
 * had been created.
 *
 * This is the general form of that defect, not a spot fix. Every tool, both
 * directions, on every run.
 */

/**
 * Both ends of the wire, read out of the application wherever this tree keeps
 * it. A deployment has no `src` of its own and reads them out of
 * `node_modules/agentic-service-blueprinting`; spelled by hand from `src/…`,
 * this file threw ENOENT on import there and took every check below with it.
 */
const root = fileURLToPath(new URL('../..', import.meta.url))
const specs = readAppFile(root, 'src/lib/agent/tools/specs.ts')
const registry = readAppFile(root, 'src/lib/agent/tools/registry.ts')

/**
 * Every tool is a definition now: its two ends are one zod schema, and a
 * compiler compares them. The subject of this check — a spec literal beside
 * a switch case — is empty, and what must hold until the check is deleted
 * with the rest of the switch-era scaffolding is that it STAYS empty: no
 * literal creeps back into the spec table, no case into the dispatcher.
 * The accepted aliases (`create_slice.description`, `update_slice.description`)
 * moved with the tools and are declared on the definitions themselves.
 */
describe('no tool is a spec beside a switch case', () => {
  it('finds no drift, because there are no two ends left to drift', () => {
    expect(argumentDrift(specs, registry, [])).toEqual([])
  })

  it('finds no spec literal in the table and no case in the dispatcher', () => {
    expect([...declaredArguments(specs).keys()]).toEqual([])
    expect([...readArguments(registry).keys()]).toEqual([])
  })
})

describe('reading source text', () => {
  it('credits an argument read through a helper', () => {
    // A case that never says `s(args, 'service')` but calls a local helper
    // that does is credited with the key the helper reads.
    const helped = `
      function readScope(client, args) { return s(args, 'service') }
      case 'list_things':
        return listThings(client, await readScope(client, args))
    `
    expect(readArguments(helped).get('list_things')?.has('service')).toBe(true)
  })

  it('stops a case body where its function ends', () => {
    // The last case of one switch must not run on into the next function's
    // signature: a function taking \`args\` there would lend the case every
    // key it reads, and accuse it of reading names it never saw.
    const twoFunctions = `
export async function dispatch(name, args) {
  switch (name) {
    case 'update_thing':
      return update(need(args, 'thing_id'))
  }
}

async function dispatchOther(name, args) {
  switch (name) {
    case 'open_other':
      return open(need(args, 'other_id'))
  }
}
`
    expect([...(readArguments(twoFunctions).get('update_thing') ?? [])]).toEqual(['thing_id'])
  })

  it('unions the two dispatchers rather than letting the later one win', () => {
    // The sample dispatcher used to carry a second `case` for the same tool,
    // one line long and taking no arguments. Overwriting made the tool look
    // like it ignored the argument the live arm reads.
    const twoArms = `
      function readScope(client, args) { return s(args, 'service') }
      case 'list_scenarios':
        return listScenarios(client, await readScope(client, args))
      case 'get_blueprint':
        return getBlueprint(client, need(args, 'scenario_id'))
      case 'list_scenarios':
        return sampleListScenarios()
      case 'get_cell':
        return sampleGetCell()
    `
    expect(readArguments(twoArms).get('list_scenarios')?.has('service')).toBe(
      true,
    )
  })

  it('does not mistake a quoted brace for structure', () => {
    const source = `
      { name: 'noisy', parameters: { type: 'object', properties: {
        left: str('a { brace in prose'),
        right: str("and a } here"),
      } } },
    `
    expect([...(declaredArguments(source).get('noisy') ?? [])].sort()).toEqual([
      'left',
      'right',
    ])
  })

  it('sees a declared-but-unread argument as drift', () => {
    const drift = argumentDrift(
      `{ name: 'demo', parameters: { properties: { kept: str('x'), dropped: str('y') } } }`,
      `case 'demo': { return go(need(args, 'kept')) }`,
    )
    expect(drift).toEqual([
      { tool: 'demo', declaredNotRead: ['dropped'], readNotDeclared: [] },
    ])
  })

  it('sees a read-but-undeclared argument as drift', () => {
    const drift = argumentDrift(
      `{ name: 'demo', parameters: { properties: { kept: str('x') } } }`,
      `case 'demo': { return go(need(args, 'kept'), s(args, 'invisible')) }`,
    )
    expect(drift).toEqual([
      { tool: 'demo', declaredNotRead: [], readNotDeclared: ['invisible'] },
    ])
  })
})
