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
 * Names the handler still reads and the schema no longer advertises.
 *
 * An alias only ever goes this way. A name the SCHEMA knows and the handler
 * does not is the silent drop itself, so there is deliberately no way to
 * excuse one — the field is `accepts`, and it is read against the handler.
 */
const ACCEPTED_ALIASES = [
  {
    tool: 'create_slice',
    accepts: 'description',
    now: 'summary',
    because:
      'the schema advertised `description` for as long as the handler read `summary`, so a model that learned that wire is still holding the word this fixed',
  },
  {
    tool: 'update_slice',
    accepts: 'description',
    now: 'summary',
    because: 'same mismatch, same tool pair',
  },
]

describe('every argument a tool advertises is an argument it reads', () => {
  it('finds no drift in either direction', () => {
    expect(argumentDrift(specs, registry, ACCEPTED_ALIASES)).toEqual([])
  })

  it('reads every accepted alias, and advertises none of them', () => {
    const declared = declaredArguments(specs)
    const read = readArguments(registry)
    for (const alias of ACCEPTED_ALIASES) {
      expect(read.get(alias.tool)?.has(alias.accepts)).toBe(true)
      expect(declared.get(alias.tool)?.has(alias.accepts)).toBe(false)
      expect(declared.get(alias.tool)?.has(alias.now)).toBe(true)
    }
  })
})

describe('reading the two files', () => {
  it('finds every tool on both sides', () => {
    const declared = declaredArguments(specs)
    const read = readArguments(registry)
    expect(declared.size).toBeGreaterThan(40)
    expect([...declared.keys()].filter((tool) => !read.has(tool))).toEqual([])
  })

  it('reads a properties object written on one line', () => {
    // `update_path` is `properties: { path_id: str('…'), name: str('…') }`.
    // A line-oriented reading finds no keys in it and accuses a correct tool.
    const declared = declaredArguments(specs)
    expect([...(declared.get('update_path') ?? [])].sort()).toEqual([
      'name',
      'path_id',
    ])
  })

  it('credits an argument read through a helper', () => {
    // `list_scenarios` never says `s(args, 'service')`. It calls
    // `readScope(client, args)`, which does.
    expect(readArguments(registry).get('list_scenarios')?.has('service')).toBe(
      true,
    )
  })

  it('unions the two dispatchers rather than letting the later one win', () => {
    // `dispatchSampleTool` has its own `case 'list_scenarios'`, one line long
    // and taking no arguments. Overwriting made the tool look like it ignored
    // the argument the live arm reads.
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
