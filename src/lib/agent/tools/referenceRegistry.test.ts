import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
