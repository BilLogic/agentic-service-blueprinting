import { existsSync, readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { buildSystem } from '@/lib/agent/loop'
import { configureAgentDoctrine } from '@/lib/agent/doctrine'
import { toolSpec } from '@/lib/agent/tools/definition'
import { TOOL_DEFINITIONS } from '@/lib/agent/tools/definitions'
import { getReferenceTool } from '@/lib/agent/tools/definitions/references'
import { fakeToolContext } from '@/lib/agent/tools/definitions/testContext'
import { runTool } from '@/lib/agent/tools/definition'
import { TEMPLATE_REFERENCE_DOCS } from '@/lib/agent/tools/referenceDocs'
import { REFERENCE_NAMES } from '@/lib/agent/tools/referenceNames'
import {
  READ_TOOLS_PLACEHOLDER,
  WRITE_TOOLS_PLACEHOLDER,
  configureAgentReferences,
  readReference,
  referenceNames,
} from '@/lib/agent/tools/references'
import { configureAgentTools, sessionRoster } from '@/lib/agent/tools/roster'

/*
 * The rulebook as a deployment shapes it through its config, and the canvas
 * adapter as a session is served it: prose from the file, surface rows from
 * the roster. Nothing here registers anything or reloads a module graph —
 * the documents are read when they are served.
 */

afterEach(() => {
  configureAgentReferences(undefined)
  configureAgentDoctrine(undefined)
  configureAgentTools(undefined)
})

const DESKTOP = { sampleTrial: false, mobileReading: false, allowWrites: true, searchOffered: true }
const full = sessionRoster(DESKTOP)
const description = () => toolSpec(getReferenceTool).description

/** Tool names, as the adapter spells them, on one of its two surface rows. */
function rowNames(adapter: string, row: 'Edit IR JSON' | 'Read the blueprint'): string[] {
  const line = adapter.split('\n').find((entry) => entry.startsWith(`| ${row} |`))!
  const list = line.split(' — ')[0]!
  return [...list.matchAll(/`([a-z_]+)`/g)].map((match) => match[1]!)
}

describe('the deployment references', () => {
  it('are the template\'s own when the config names none', () => {
    expect(referenceNames()).toEqual(REFERENCE_NAMES)
    expect(description()).not.toMatch(/Read blueprint first/)
    expect(description()).not.toContain('canvas-adapter')
  })

  it("a deployment's own document is served, named after the adapter, and pointed at first", async () => {
    configureAgentReferences({ blueprint: '# This service\n' })
    expect(referenceNames().slice(0, 2)).toEqual(['canvas-adapter', 'blueprint'])
    expect(await runTool(getReferenceTool, { name: 'blueprint' }, fakeToolContext())).toBe(
      '# This service\n',
    )
    expect(description()).toContain('blueprint')
    expect(description()).toMatch(/Read blueprint first/)
  })

  it('a document the template serves is replaced and adds no name, in the prompt too', () => {
    configureAgentReferences({ 'canvas-adapter': '# Our own adapter\n' })
    expect(referenceNames().filter((name) => name === 'canvas-adapter')).toHaveLength(1)
    expect(readReference('canvas-adapter', full)).toBe('# Our own adapter\n')
    const system = buildSystem([], full)
    expect(system).toContain('# Our own adapter\n')
    expect(system).not.toContain(TEMPLATE_REFERENCE_DOCS['canvas-adapter']!.slice(0, 200))
  })

  it('an unknown name is answered with the list, the deployment\'s names included', () => {
    configureAgentReferences({ runbook: '# Runbook\n' })
    expect(readReference('nope', full)).toBe(
      `Unknown reference "nope". Available: ${referenceNames().join(', ')}`,
    )
    expect(readReference('nope', full)).toContain('runbook')
  })
})

describe('the canvas adapter is rendered against the roster it is served with', () => {
  it('the file carries the two placeholders and no tool list of its own', () => {
    const source = TEMPLATE_REFERENCE_DOCS['canvas-adapter']!
    expect(source).toContain(READ_TOOLS_PLACEHOLDER)
    expect(source).toContain(WRITE_TOOLS_PLACEHOLDER)
    expect(rowNames(source, 'Edit IR JSON')).toEqual([])
    expect(rowNames(source, 'Read the blueprint')).toEqual([])
  })

  it('the rows list exactly the read and write tools on the roster, in its order', () => {
    const served = readReference('canvas-adapter', full)
    expect(served).not.toContain('{{')
    expect(rowNames(served, 'Read the blueprint')).toEqual(
      full.filter((tool) => tool.surface === 'read').map((tool) => tool.name),
    )
    expect(rowNames(served, 'Edit IR JSON')).toEqual(
      full.filter((tool) => tool.surface === 'write').map((tool) => tool.name),
    )
  })

  it('a narrowed roster narrows the document — the config, the mode, and search alike', async () => {
    configureAgentTools(['get_cell', 'list_blueprint', 'upsert_cell', 'open_phase'])
    const narrowed = sessionRoster(DESKTOP)
    const served = readReference('canvas-adapter', narrowed)
    expect(rowNames(served, 'Read the blueprint')).toEqual(['list_blueprint', 'get_cell'])
    expect(rowNames(served, 'Edit IR JSON')).toEqual(['upsert_cell'])
    // Through the tool, against the roster its context carries.
    expect(
      rowNames(
        await runTool(getReferenceTool, { name: 'canvas-adapter' }, fakeToolContext({ roster: narrowed })),
        'Edit IR JSON',
      ),
    ).toEqual(['upsert_cell'])

    configureAgentTools(undefined)
    const viewer = readReference('canvas-adapter', sessionRoster({ ...DESKTOP, allowWrites: false }))
    expect(rowNames(viewer, 'Edit IR JSON')).toEqual([])
    const unsearched = readReference('canvas-adapter', sessionRoster({ ...DESKTOP, searchOffered: false }))
    expect(rowNames(unsearched, 'Read the blueprint')).not.toContain('search_blueprint')
  })

  it('every backticked snake_case token in the served document names a tool, or is one of the words it is allowed', () => {
    // The sweep the read-surface check used to make of the whole document:
    // a tool name that drifted into prose rather than into a row is a tool
    // the agent believes it has. Fails CLOSED — a new column name in the
    // prose is a deliberate one-line admission here, not a hole.
    const notTools = new Set(['position', 'whatif', 'leads_to'])
    const real = new Set(TOOL_DEFINITIONS.map((tool) => tool.name))
    const served = readReference('canvas-adapter', full)
    const named = [...served.matchAll(/`([a-z][a-z0-9]*(?:_[a-z0-9]+)+)`/g)].map((m) => m[1]!)
    expect([...new Set(named)].filter((token) => !real.has(token) && !notTools.has(token))).toEqual([])
  })
})

describe('the system prompt', () => {
  it('carries the adapter as served, and the doctrine after it when the deployment has one', () => {
    const bare = buildSystem([], full)
    expect(bare).toContain(readReference('canvas-adapter', full))
    expect(bare).not.toContain('--- deployment doctrine ---')
    configureAgentDoctrine('  Always cite the intake call.  ')
    const overlaid = buildSystem([], full)
    expect(overlaid).toContain('--- deployment doctrine ---\nAlways cite the intake call.')
    expect(overlaid.indexOf('--- deployment doctrine ---')).toBeGreaterThan(
      overlaid.indexOf('--- canvas-adapter reference'),
    )
  })

  /**
   * Where the template's generated copy exists (this repository), the
   * loader's adapter is that file byte for byte, which catches a `?raw`
   * import pointed at the wrong document. A deployment has no such file and
   * skips.
   */
  const generated = new URL('../skill/references/canvas-adapter.md', import.meta.url)
  it.skipIf(!existsSync(generated))("in the template, the loader's adapter is the generated copy", () => {
    expect(TEMPLATE_REFERENCE_DOCS['canvas-adapter']).toBe(readFileSync(generated, 'utf8'))
  })
})
