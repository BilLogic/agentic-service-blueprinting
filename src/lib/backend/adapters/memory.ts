/**
 * A reference implementation of the whole seam, in memory — and the suite's
 * own proof that it can be satisfied.
 *
 * It is NOT one of the two reference implementations the contract names —
 * those are Supabase and the no-DB fixture, and the Supabase one is written
 * when the seam reaches its call sites. This is a third thing, and it exists
 * for two narrower reasons. First, so `conformance.ts` has something to pass
 * without a database, the way `adapter_parity.py` has a negative case: a suite
 * nothing has ever passed is a wish list. Second, and more useful to an
 * adopter, it is the shortest complete answer to "what does implementing this
 * actually involve" — roughly two hundred lines, no backend at all.
 *
 * It can run at either conformance level, which is the interesting part:
 *
 *  - `transactional` validates the whole draft before touching the store, so a
 *    rejected write leaves nothing.
 *  - `idempotent` writes the slice row first and validates while writing the
 *    slides, exactly like a store that cannot roll back. A rejected write
 *    leaves an incomplete slice behind — and `repairSlices` clears it. That is
 *    the whole difference between the two levels, in one branch.
 *
 * ⚠️ NOT an app backend. The app is read-only without a database on purpose
 * (`references/adapter-contract.md`): a browser-local write path would be a
 * second implementation of the authoring semantics, and its divergence from
 * the real one would surface only in the demo. This module is wired into the
 * conformance suite and nothing else.
 */
import type { BlueprintData } from '@/types/blueprint'
import { TEMPLATE_SCHEMA_VERSION } from '../schemaVersion'
import type {
  Backend,
  ConformanceLevel,
  Finding,
  FindingDraft,
  FindingStatus,
  PathSummary,
  PhaseSummary,
  SliceDetail,
  SliceDraft,
  Slide,
  SliceSummary,
  Tier,
} from '../ports'

export type MemorySeed = {
  phases: PhaseSummary[]
  paths: PathSummary[]
  blueprints: Map<string, BlueprintData>
}

type StoredSlice = SliceSummary & {
  slides: Slide[]
  /** Written last. An unset flag means a write stopped halfway. */
  complete: boolean
}

/** Why a draft is unacceptable, or null when it is fine. */
function rejectionReason(draft: SliceDraft): string | null {
  if (draft.title.trim() === '') return 'a slice must have a title'
  if (draft.slides.length === 0) return 'a slice must have at least one slide'
  for (const slide of draft.slides) {
    if (slide.position < 0) return `slide position ${slide.position} is negative`
    if (slide.title.trim() === '') return 'a slide must have a title'
  }
  return null
}

let counter = 0
function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter.toString().padStart(6, '0')}`
}

export function createMemoryBackend(
  seed: MemorySeed,
  level: ConformanceLevel,
  tier: Tier = 'authoring',
): Backend {
  const slices = new Map<string, StoredSlice>()
  const findings = new Map<string, Finding>()

  const detail = (stored: StoredSlice): SliceDetail => ({
    id: stored.id,
    scenarioId: stored.scenarioId,
    title: stored.title,
    sliceType: stored.sliceType,
    origin: stored.origin,
    slides: [...stored.slides].sort((a, b) => a.position - b.position),
  })

  return {
    name: `memory (${level})`,
    capabilities: { writes: level },
    schemaVersion: async () => TEMPLATE_SCHEMA_VERSION,

    blueprints: {
      async listPhases() {
        return seed.phases.map((phase) => ({ ...phase }))
      },
      async listPaths(scenarioId) {
        return seed.paths.filter((path) => path.scenarioId === scenarioId)
      },
      async getBlueprint(pathId) {
        return seed.blueprints.get(pathId) ?? null
      },
    },

    slices: {
      async listSlices(scenarioId) {
        // Incomplete slices are NOT hidden. A torn write is visible to a
        // reader until something repairs it, and that visibility is the cost
        // the Idempotent level asks an adopter to accept knowingly. Filtering
        // it out here would make the level difference disappear from the
        // conformance suite, which is the one place it has to show.
        return [...slices.values()]
          .filter((slice) => !scenarioId || slice.scenarioId === scenarioId)
          .map(({ slides: _slides, complete: _complete, ...summary }) => summary)
      },
      async getSlice(sliceId) {
        const stored = slices.get(sliceId)
        return stored ? detail(stored) : null
      },
      async createSlice(draft) {
        // The one branch that separates the two conformance levels.
        if (level === 'transactional') {
          const reason = rejectionReason(draft)
          if (reason) throw new Error(reason)
        }
        const id = nextId('slice')
        const stored: StoredSlice = {
          id,
          scenarioId: draft.scenarioId,
          title: draft.title,
          sliceType: draft.sliceType,
          origin: draft.origin,
          slides: [],
          complete: false,
        }
        slices.set(id, stored)
        if (level === 'idempotent') {
          const reason = rejectionReason(draft)
          // The row is already written. Nothing can take it back; repairSlices
          // is what finishes the story.
          if (reason) throw new Error(reason)
        }
        stored.slides = draft.slides.map((slide) => ({ ...slide }))
        stored.complete = true
        return detail(stored)
      },
      async replaceSlides(sliceId, slides) {
        const stored = slices.get(sliceId)
        if (!stored) throw new Error(`no slice ${sliceId}`)
        const next = slides.map((slide) => ({ ...slide }))
        if (level === 'transactional') {
          stored.slides = next
        } else {
          stored.complete = false
          stored.slides = next
          stored.complete = true
        }
        return detail(stored)
      },
      async deleteSlice(sliceId) {
        // Deleting what is already gone is success: callers retry.
        slices.delete(sliceId)
      },
      async repairSlices() {
        if (level === 'transactional') return 0
        let repaired = 0
        for (const [id, stored] of slices) {
          if (!stored.complete) {
            slices.delete(id)
            repaired += 1
          }
        }
        return repaired
      },
    },

    findings: {
      async listFindings(status) {
        return [...findings.values()].filter((row) => !status || row.status === status)
      },
      async recordFindings(drafts: FindingDraft[]) {
        const open = new Set(
          [...findings.values()]
            .filter((row) => row.status === 'open')
            .map((row) => row.fingerprint),
        )
        const added: Finding[] = []
        for (const draft of drafts) {
          if (open.has(draft.fingerprint)) continue
          const finding: Finding = { ...draft, id: nextId('finding'), status: 'open' }
          findings.set(finding.id, finding)
          open.add(finding.fingerprint)
          added.push(finding)
        }
        return added
      },
      async setFindingStatus(findingId: string, status: FindingStatus) {
        const finding = findings.get(findingId)
        if (!finding) throw new Error(`no finding ${findingId}`)
        finding.status = status
      },
    },

    identity: {
      async currentTier() {
        return tier
      },
    },
  }
}
