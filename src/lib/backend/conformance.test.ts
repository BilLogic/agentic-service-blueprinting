/**
 * The conformance suite, run against every backend this repo ships — and
 * against one that is deliberately broken.
 *
 * The last part is the load-bearing one. A suite that has never gone red is
 * indistinguishable from a suite that cannot.
 */
import { describe, expect, test } from 'vitest'
import { SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'
import { createFixtureBackend } from './adapters/fixture'
import { createMemoryBackend, type MemorySeed } from './adapters/memory'
import { formatFailures, runConformance, type ConformanceFixture } from './conformance'
import type { Backend } from './ports'

const SCENARIO = SAMPLE_SCENARIOS.find((scenario) => scenario.primary) ?? SAMPLE_SCENARIOS[0]

const fixture: ConformanceFixture = {
  scenarioId: SCENARIO.id,
  pathId: SCENARIO.path_ids[0],
}

/** The bundled sample, reshaped into what an in-memory store would hold. */
async function seedFromFixture(): Promise<MemorySeed> {
  const source = createFixtureBackend()
  const phases = await source.blueprints.listPhases()
  const paths = []
  const blueprints = new Map()
  for (const phase of phases) {
    for (const scenario of phase.scenarios) {
      for (const path of await source.blueprints.listPaths(scenario.id)) {
        paths.push(path)
        const blueprint = await source.blueprints.getBlueprint(path.id)
        if (blueprint) blueprints.set(path.id, blueprint)
      }
    }
  }
  return { phases, paths, blueprints }
}

async function expectConformance(backend: Backend) {
  const results = await runConformance(backend, fixture)
  expect(formatFailures(results)).toBe('')
  return results
}

describe('the backends this repo ships', () => {
  test('the bundled fixture conforms, and reports its write cases as skipped', async () => {
    const results = await expectConformance(createFixtureBackend())
    const skipped = results.filter((result) => result.status === 'skipped')
    expect(skipped.length).toBeGreaterThan(0)
    // Not run is not the same as not applicable, and a reader must be able to
    // tell them apart.
    for (const result of skipped) {
      expect(result.detail).toContain('reads only')
    }
  })

  test('an in-memory store conforms at the Transactional level', async () => {
    const results = await expectConformance(
      createMemoryBackend(await seedFromFixture(), 'transactional'),
    )
    const ran = results.filter((result) => result.status === 'pass')
    expect(ran.map((result) => result.id)).toContain(
      'transactional/rejected-write-leaves-nothing',
    )
  })

  test('the same store conforms at the Idempotent level, through repair', async () => {
    const results = await expectConformance(
      createMemoryBackend(await seedFromFixture(), 'idempotent'),
    )
    const ids = results.filter((r) => r.status === 'pass').map((r) => r.id)
    expect(ids).toContain('idempotent/repair-resolves-a-torn-write')
    // The stricter case is not claimed at this level, and is reported as such.
    const stricter = results.find((r) => r.id === 'transactional/rejected-write-leaves-nothing')
    expect(stricter?.status).toBe('skipped')
  })
})

describe('the suite can fail', () => {
  test('a torn write with no repair is caught at the Idempotent level', async () => {
    const backend = createMemoryBackend(await seedFromFixture(), 'idempotent')
    // The exact promise the Idempotent level trades a transaction for: you may
    // tear, provided somebody can drive the torn state forward.
    backend.slices.repairSlices = async () => 0
    const results = await runConformance(backend, fixture)
    const repair = results.find((r) => r.id === 'idempotent/repair-resolves-a-torn-write')
    expect(repair?.status).toBe('fail')
    expect(repair?.detail).toContain('slice(s) behind')
  })

  test('a delete that refuses to be repeated is caught', async () => {
    const backend = createMemoryBackend(await seedFromFixture(), 'transactional')
    const deleteSlice = backend.slices.deleteSlice.bind(backend.slices)
    const deleted = new Set<string>()
    backend.slices.deleteSlice = async (sliceId: string) => {
      if (deleted.has(sliceId)) throw new Error('already deleted')
      deleted.add(sliceId)
      await deleteSlice(sliceId)
    }
    const results = await runConformance(backend, fixture)
    expect(results.find((r) => r.id === 'write/delete-is-repeatable')?.status).toBe('fail')
  })

  test('findings that breed duplicates are caught', async () => {
    const backend = createMemoryBackend(await seedFromFixture(), 'transactional')
    const findings = backend.findings
    backend.findings = {
      ...findings,
      // Dedupe removed: record everything it is handed.
      recordFindings: async (drafts) =>
        drafts.map((draft, index) => ({
          ...draft,
          id: `dupe-${index}-${Math.random()}`,
          status: 'open' as const,
        })),
    }
    const results = await runConformance(backend, fixture)
    const dedupe = results.find((r) => r.id === 'write/findings-dedupe-by-fingerprint')
    expect(dedupe?.status).toBe('fail')
    expect(dedupe?.detail).toContain('breed duplicates')
  })

  test('a read that throws on an unknown id is caught', async () => {
    const backend = createFixtureBackend()
    backend.blueprints.getBlueprint = async (pathId: string) => {
      if (pathId.startsWith('00000000')) throw new Error('not found')
      return createFixtureBackend().blueprints.getBlueprint(pathId)
    }
    const results = await runConformance(backend, fixture)
    expect(results.find((r) => r.id === 'read/absence-is-not-an-error')?.status).toBe('fail')
  })
})
