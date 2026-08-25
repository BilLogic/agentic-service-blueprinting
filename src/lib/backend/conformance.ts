/**
 * The conformance suite: a checklist a human cannot fudge.
 *
 * `references/adapter-contract.md` used to carry a seven-item checklist whose
 * items were things a person ticked. This is the same idea with the ticking
 * removed — an agent can implement against it until the cases pass, and a
 * reviewer can read the failures instead of taking someone's word.
 *
 * It is deliberately framework-free: no vitest import, no assertion library.
 * It takes a backend and returns results, so an adopter can run it from their
 * own runner, a script, or a CI job, against their own store. The repo's own
 * wrapper lives in `conformance.test.ts`.
 *
 * ⚠️ It WRITES. Point it at a scratch project, never at real content: it
 * creates slices, deletes them, and records findings it then dismisses.
 */
import type {
  Backend,
  ConformanceLevel,
  SliceDraft,
} from './ports'
import { levelsFor } from './levels'

/** Which part of the contract a case belongs to. */
export type CaseKind = 'read' | 'identity' | 'write' | ConformanceLevel

export type ConformanceCase = {
  id: string
  kind: CaseKind
  /** What a reader of a failure needs to know: the promise being checked. */
  title: string
  run(backend: Backend, fixture: ConformanceFixture): Promise<void>
}

/**
 * What the suite needs to already exist in the target. Every backend has to
 * be seeded before it can be judged; the suite does not seed for you, because
 * seeding is the adapter's own import operation and judging it is the point.
 */
export type ConformanceFixture = {
  /** A scenario that exists, with at least one path. */
  scenarioId: string
  /** A path that exists, with at least one cell. */
  pathId: string
}

export type ConformanceResult = {
  id: string
  kind: CaseKind
  title: string
  status: 'pass' | 'fail' | 'skipped'
  /** Why it failed, or why it did not apply. */
  detail?: string
}

class ConformanceFailure extends Error {}

function require(condition: boolean, message: string): asserts condition {
  if (!condition) throw new ConformanceFailure(message)
}

/**
 * A draft the contract requires every backend to reject — an empty title.
 *
 * It carries the fixture's scenario on purpose. A rejected write that lands
 * somewhere the suite does not look is a torn write nobody counts, and the
 * whole point of the two levels is counting exactly that.
 */
function invalidDraft(scenarioId: string): SliceDraft {
  return {
    scenarioId,
    title: '',
    sliceType: 'custom',
    origin: 'generated',
    frames: [{ position: 0, title: 'orphan', body: null, cellIds: [] }],
  }
}

function draft(title: string, scenarioId: string): SliceDraft {
  return {
    scenarioId,
    title,
    sliceType: 'custom',
    origin: 'generated',
    frames: [
      { position: 0, title: 'first', body: 'one', cellIds: [] },
      { position: 1, title: 'second', body: null, cellIds: [] },
    ],
  }
}

export const CONFORMANCE_CASES: ConformanceCase[] = [
  {
    id: 'read/phases',
    kind: 'read',
    title: 'listPhases returns distinct phases in position order',
    async run(backend) {
      const phases = await backend.blueprints.listPhases()
      require(phases.length > 0, 'no phases — the target is empty or unseeded')
      const ids = new Set(phases.map((phase) => phase.id))
      require(ids.size === phases.length, 'two phases share an id')
      const positions = phases.map((phase) => phase.position)
      require(
        positions.every((value, index) => index === 0 || value >= positions[index - 1]),
        `phases came back out of order: ${positions.join(', ')}`,
      )
    },
  },
  {
    id: 'read/paths',
    kind: 'read',
    title: 'listPaths returns only paths of the scenario asked for',
    async run(backend, fixture) {
      const paths = await backend.blueprints.listPaths(fixture.scenarioId)
      require(paths.length > 0, `no paths under scenario ${fixture.scenarioId}`)
      const stray = paths.find((path) => path.scenarioId !== fixture.scenarioId)
      require(!stray, `listPaths leaked a path from scenario ${stray?.scenarioId}`)
    },
  },
  {
    id: 'read/blueprint-is-internally-consistent',
    kind: 'read',
    title: 'every cell in a blueprint names a lane and a step that came with it',
    async run(backend, fixture) {
      const blueprint = await backend.blueprints.getBlueprint(fixture.pathId)
      require(blueprint !== null, `path ${fixture.pathId} did not resolve`)
      require(blueprint.cells.length > 0, 'blueprint has no cells to check')
      const lanes = new Set(blueprint.layers.map((lane) => lane.id))
      const steps = new Set(blueprint.steps.map((step) => step.id))
      for (const cell of blueprint.cells) {
        require(lanes.has(cell.layer_id), `cell ${cell.id} names a lane not in the blueprint`)
        require(steps.has(cell.step_id), `cell ${cell.id} names a step not in the blueprint`)
      }
      const cells = new Set(blueprint.cells.map((cell) => cell.id))
      for (const edge of blueprint.triggers) {
        require(
          cells.has(edge.source_cell_id) && cells.has(edge.target_cell_id),
          `edge ${edge.id} points outside its own blueprint`,
        )
      }
    },
  },
  {
    id: 'read/absence-is-not-an-error',
    kind: 'read',
    title: 'an unknown path reads as null rather than throwing',
    async run(backend) {
      // A backend that throws here turns "this link is stale" into a crash.
      const missing = await backend.blueprints.getBlueprint(
        '00000000-0000-4000-8000-000000000000',
      )
      require(missing === null, 'an unknown path returned data')
    },
  },
  {
    id: 'read/repeatable',
    kind: 'read',
    title: 'reading the same path twice returns the same thing',
    async run(backend, fixture) {
      const first = await backend.blueprints.getBlueprint(fixture.pathId)
      const second = await backend.blueprints.getBlueprint(fixture.pathId)
      require(
        JSON.stringify(first) === JSON.stringify(second),
        'two reads of one path disagreed — ordering is unstable',
      )
    },
  },
  {
    id: 'identity/tier',
    kind: 'identity',
    title: 'the identity port answers in tiers, not in claims',
    async run(backend) {
      const tier = await backend.identity.currentTier()
      require(
        tier === 'anon' || tier === 'authoring' || tier === 'service',
        `currentTier returned ${String(tier)}`,
      )
    },
  },
  {
    id: 'write/slice-round-trip',
    kind: 'write',
    title: 'a created slice reads back with its frames, in order',
    async run(backend, fixture) {
      const created = await backend.slices.createSlice(
        draft('conformance round trip', fixture.scenarioId),
      )
      try {
        const read = await backend.slices.getSlice(created.id)
        require(read !== null, 'a slice that was just created did not read back')
        require(read.title === 'conformance round trip', 'title did not survive the write')
        require(read.frames.length === 2, `expected 2 frames, read ${read.frames.length}`)
        require(
          read.frames[0].position === 0 && read.frames[1].position === 1,
          'frames came back out of position order',
        )
      } finally {
        await tidy(() => backend.slices.deleteSlice(created.id))
      }
    },
  },
  {
    id: 'write/replace-frames',
    kind: 'write',
    title: 'replacing frames leaves the new set and none of the old',
    async run(backend, fixture) {
      const created = await backend.slices.createSlice(
        draft('conformance replace', fixture.scenarioId),
      )
      try {
        await backend.slices.replaceSliceFrames(created.id, [
          { position: 0, title: 'only', body: null, cellIds: [] },
        ])
        const read = await backend.slices.getSlice(created.id)
        require(read !== null, 'the slice vanished during a frame replace')
        require(read.frames.length === 1, `old frames survived: ${read.frames.length} remain`)
        require(read.frames[0].title === 'only', 'the new frame did not land')
      } finally {
        await tidy(() => backend.slices.deleteSlice(created.id))
      }
    },
  },
  {
    id: 'write/delete-is-repeatable',
    kind: 'write',
    title: 'deleting a slice twice is success, not an error',
    async run(backend, fixture) {
      // Callers retry. A retry that reports failure teaches them to stop
      // retrying, which is the wrong lesson.
      const created = await backend.slices.createSlice(
        draft('conformance delete', fixture.scenarioId),
      )
      await backend.slices.deleteSlice(created.id)
      await backend.slices.deleteSlice(created.id)
      const read = await backend.slices.getSlice(created.id)
      require(read === null, 'the slice survived its own deletion')
    },
  },
  {
    id: 'write/findings-dedupe-by-fingerprint',
    kind: 'write',
    title: 're-recording a finding with the same fingerprint adds nothing',
    async run(backend) {
      const fingerprint = `conformance:${Math.random().toString(36).slice(2)}`
      const drafts = [
        {
          fingerprint,
          source: 'audit',
          severity: 'info',
          summary: 'conformance probe',
          cellIds: [],
        },
      ]
      const first = await backend.findings.recordFindings(drafts)
      require(first.length === 1, `first record returned ${first.length} findings`)
      try {
        const second = await backend.findings.recordFindings(drafts)
        require(
          second.length === 0,
          'the same fingerprint was recorded twice — the audit will breed duplicates',
        )
      } finally {
        // Tidying up must never become the reported failure: a backend that is
        // already broken will often break here too, and the first diagnosis is
        // the useful one.
        await tidy(() => backend.findings.setFindingStatus(first[0].id, 'dismissed'))
      }
    },
  },
  {
    id: 'write/status-is-repeatable',
    kind: 'write',
    title: 'setting a status the finding already has is success',
    async run(backend) {
      const [finding] = await backend.findings.recordFindings([
        {
          fingerprint: `conformance:${Math.random().toString(36).slice(2)}`,
          source: 'audit',
          severity: 'info',
          summary: 'conformance status probe',
          cellIds: [],
        },
      ])
      await backend.findings.setFindingStatus(finding.id, 'dismissed')
      await backend.findings.setFindingStatus(finding.id, 'dismissed')
      const dismissed = await backend.findings.listFindings('dismissed')
      require(
        dismissed.some((row) => row.id === finding.id),
        'the status did not stick',
      )
    },
  },
  {
    id: 'transactional/rejected-write-leaves-nothing',
    kind: 'transactional',
    title: 'a rejected createSlice leaves no trace at all',
    async run(backend, fixture) {
      const before = await backend.slices.listSlices(fixture.scenarioId)
      await expectRejection(
        () => backend.slices.createSlice(invalidDraft(fixture.scenarioId)),
        'createSlice accepted a slice with an empty title',
      )
      const after = await backend.slices.listSlices(fixture.scenarioId)
      require(
        after.length === before.length,
        `a rejected write left ${after.length - before.length} slice(s) behind`,
      )
    },
  },
  {
    id: 'idempotent/repair-resolves-a-torn-write',
    kind: 'idempotent',
    title: 'whatever a rejected write leaves, repairSlices resolves it',
    async run(backend, fixture) {
      const before = await backend.slices.listSlices(fixture.scenarioId)
      await expectRejection(
        () => backend.slices.createSlice(invalidDraft(fixture.scenarioId)),
        'createSlice accepted a slice with an empty title',
      )
      // Tearing is allowed at this level. Being stuck is not.
      const repaired = await backend.slices.repairSlices()
      require(repaired >= 0, 'repairSlices must report how much it repaired')
      const after = await backend.slices.listSlices(fixture.scenarioId)
      require(
        after.length === before.length,
        `repairSlices left ${after.length - before.length} slice(s) behind`,
      )
    },
  },
]

/** Run a cleanup step, swallowing its failure so a diagnosis survives it. */
async function tidy(action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch {
    // Deliberately ignored — see the call sites.
  }
}

async function expectRejection(action: () => Promise<unknown>, message: string) {
  let rejected = false
  try {
    await action()
  } catch {
    rejected = true
  }
  require(rejected, message)
}

/**
 * Run every case that applies to this backend and report each one.
 *
 * Cases are never silently dropped: a backend that serves reads only reports
 * its write cases as `skipped` with a reason, so a reader can tell "did not
 * apply" from "was not run".
 */
export async function runConformance(
  backend: Backend,
  fixture: ConformanceFixture,
): Promise<ConformanceResult[]> {
  const level = backend.capabilities.writes
  const applicable = new Set<CaseKind>(['read', 'identity'])
  if (level) {
    applicable.add('write')
    for (const each of levelsFor(level)) applicable.add(each)
  }

  const results: ConformanceResult[] = []
  for (const testCase of CONFORMANCE_CASES) {
    const base = { id: testCase.id, kind: testCase.kind, title: testCase.title }
    if (!applicable.has(testCase.kind)) {
      results.push({
        ...base,
        status: 'skipped',
        detail: level
          ? `${backend.name} conforms at ${level}; this case belongs to another level`
          : `${backend.name} serves reads only`,
      })
      continue
    }
    try {
      await testCase.run(backend, fixture)
      results.push({ ...base, status: 'pass' })
    } catch (error) {
      results.push({
        ...base,
        status: 'fail',
        detail: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return results
}

/** The failures, formatted for a human who has to fix one. */
export function formatFailures(results: ConformanceResult[]): string {
  return results
    .filter((result) => result.status === 'fail')
    .map((result) => `${result.id} — ${result.title}\n    ${result.detail}`)
    .join('\n')
}
