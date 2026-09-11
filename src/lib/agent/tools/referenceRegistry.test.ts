import { existsSync, readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** The template's generated copy of the adapter. A deployment has none here. */
const GENERATED_ADAPTER = new URL('../skill/references/canvas-adapter.md', import.meta.url)

/**
 * The deployment half of the reference-doc seam, and its TIMING.
 *
 * Every case reloads the module graph and imports dynamically, because what is
 * under test is what `referenceDocs.ts` and `referenceNames.ts` record while
 * they evaluate. A static import would settle the registry once for the file.
 */

beforeEach(() => {
  vi.resetModules()
})

describe('the reference registry', () => {
  it('is empty in the standalone template', async () => {
    const { REFERENCE_NAMES } = await import('@/lib/agent/tools/referenceNames')
    const { REFERENCE_DOCS } = await import('@/lib/agent/tools/referenceDocs')
    const { REFERENCE_NAMES_EXTRA } = await import(
      '@/lib/agent/tools/referenceNamesExtra'
    )
    expect(REFERENCE_NAMES).toContain('canvas-adapter')
    expect(REFERENCE_NAMES).not.toContain('blueprint')
    expect(REFERENCE_NAMES_EXTRA).toEqual([])
    expect(Object.keys(REFERENCE_DOCS).sort()).toEqual(
      [...REFERENCE_NAMES].sort(),
    )
  })

  /**
   * A generated account is a deployment's own content. The template loader must
   * stay byte-identical after a deployment adopts it, so extra names arrive
   * only through `REFERENCE_NAMES_EXTRA` (copy) or `registerReferenceDocs`
   * (mount) — never a path import of another repo's file.
   */
  it('the template loader imports no generated account by path', () => {
    const docs = readFileSync(new URL('./referenceDocs.ts', import.meta.url), 'utf8')
    const names = readFileSync(new URL('./referenceNames.ts', import.meta.url), 'utf8')
    expect(docs).not.toMatch(/blueprint\.md/)
    expect(docs).not.toMatch(/from ['"][^'"]*\/docs\//)
    expect(names).not.toMatch(/blueprint\.md/)
  })

  it("a deployment's own document is served, and named after the adapter", async () => {
    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ blueprint: '# This service\n' })

    const { REFERENCE_NAMES } = await import('@/lib/agent/tools/referenceNames')
    const { readReference } = await import('@/lib/agent/tools/read')

    expect(REFERENCE_NAMES.slice(0, 2)).toEqual(['canvas-adapter', 'blueprint'])
    expect(readReference('blueprint')).toBe('# This service\n')
  })

  /**
   * The tool description a model reads is interpolated at module scope in
   * `specs.ts`, which is exactly why registration has to precede the import.
   * An agent told about a document it cannot be told about is the failure this
   * ordering exists to prevent.
   */
  it("the agent's tool description names the registered document", async () => {
    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ blueprint: '# This service\n' })

    const { TOOL_SPECS } = await import('@/lib/agent/tools/specs')
    const getReference = TOOL_SPECS.find((spec) => spec.name === 'get_reference')
    expect(getReference?.description).toContain('blueprint')
  })

  /**
   * The pointer at `blueprint` names a document only a deployment supplies.
   * Standalone there is nothing by that name, and a description telling the
   * model to read it first sends its first call to an "Unknown reference".
   */
  it('points the agent at the blueprint document only when one is registered', async () => {
    const standalone = await import('@/lib/agent/tools/specs')
    const bare = standalone.TOOL_SPECS.find((spec) => spec.name === 'get_reference')
    expect(bare?.description).not.toMatch(/Read blueprint first/)

    vi.resetModules()
    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ blueprint: '# This service\n' })
    const { TOOL_SPECS } = await import('@/lib/agent/tools/specs')
    const getReference = TOOL_SPECS.find((spec) => spec.name === 'get_reference')
    expect(getReference?.description).toMatch(/Read blueprint first/)
  })

  /**
   * Standalone means nothing registered, so the prompt carries the loader's
   * own adapter: the one `get_reference` serves. Read from that record, not a
   * path. A deployment holds no generated copy at this test's relative
   * location; it serves the adapter through the package or through its own
   * loader.
   */
  it("the system prompt carries the loader's own adapter standalone", async () => {
    const { buildSystem } = await import('@/lib/agent/loop')
    const { readReference } = await import('@/lib/agent/tools/read')
    const adapter = readReference('canvas-adapter')
    expect(adapter).not.toMatch(/^Unknown reference/)
    expect(buildSystem('')).toContain(adapter)
  })

  /**
   * Where the template's generated copy exists (this repository), the
   * loader's adapter is that file byte for byte, which catches a `?raw` import
   * pointed at the wrong document. A deployment has no such file and skips.
   */
  it.skipIf(!existsSync(GENERATED_ADAPTER))(
    "in the template, the loader's adapter is the generated copy",
    async () => {
      const { REFERENCE_DOCS } = await import('@/lib/agent/tools/referenceDocs')
      expect(REFERENCE_DOCS['canvas-adapter']).toBe(readFileSync(GENERATED_ADAPTER, 'utf8'))
    },
  )

  /**
   * The prompt is where the adapter is binding — it is in every turn, in
   * full. A replacement served by `get_reference` and absent from the prompt
   * leaves the agent following the template's rules while a tool it rarely
   * calls describes the deployment's.
   */
  it('a registered replacement adapter reaches the system prompt', async () => {
    // The loader's own adapter, captured before anything registers, so the
    // absence below is asserted of whatever this checkout actually ships.
    const standalone = (await import('@/lib/agent/tools/referenceDocs'))
      .REFERENCE_DOCS['canvas-adapter']
    vi.resetModules()

    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ 'canvas-adapter': '# Our own adapter\n' })

    const { buildSystem } = await import('@/lib/agent/loop')
    const system = buildSystem('')
    expect(system).toContain('# Our own adapter\n')
    expect(standalone.length).toBeGreaterThan(0)
    expect(system).not.toContain(standalone)
  })

  it('overriding a document the template serves replaces it and adds no name', async () => {
    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ 'canvas-adapter': '# Our own adapter\n' })

    const { REFERENCE_NAMES } = await import('@/lib/agent/tools/referenceNames')
    const { REFERENCE_DOCS } = await import('@/lib/agent/tools/referenceDocs')
    const { readReference } = await import('@/lib/agent/tools/read')

    expect(readReference('canvas-adapter')).toBe('# Our own adapter\n')
    expect(REFERENCE_NAMES.filter((n) => n === 'canvas-adapter')).toHaveLength(1)
    // `read.ts` asserts these agree at module init; say so here too, because
    // the de-duplication above is the only reason it still holds.
    expect(Object.keys(REFERENCE_DOCS).sort()).toEqual(
      [...REFERENCE_NAMES].sort(),
    )
  })

  it('registering after the documents are served throws', async () => {
    const { registerReferenceDocs } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    // Whatever imported the app has already built the served record.
    await import('@/lib/agent/tools/referenceDocs')

    expect(() => registerReferenceDocs({ blueprint: '# Too late\n' })).toThrow(
      /already being served/,
    )
  })

  it('accumulates across calls made before the first read', async () => {
    const { registerReferenceDocs, registeredReferenceNames } = await import(
      '@/lib/agent/tools/referenceRegistry'
    )
    registerReferenceDocs({ blueprint: '# One\n' })
    registerReferenceDocs({ runbook: '# Two\n' })
    expect(registeredReferenceNames()).toEqual(['blueprint', 'runbook'])
  })
})
