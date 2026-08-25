/**
 * The no-DB adapter, behind the seam.
 *
 * This is not new capability — the app has always fallen back to the bundled
 * fixture when a read fails. What is new is that the fallback now implements
 * the same interface a database does, which is what makes "a backend that is
 * not PostgREST can serve this app" a demonstrated claim rather than an
 * intention. There were two backends here all along; only one of them was
 * ever called that.
 *
 * It serves reads and refuses writes, and it says so in its capabilities
 * rather than letting a caller discover it at the point of use.
 */
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
} from '@/data/blueprintFallbacks'
import {
  SAMPLE_PHASES,
  SAMPLE_SCENARIOS,
} from '@/data/sampleBlueprint'
import { FALLBACK_SLICES, FALLBACK_SLICE_ITEMS } from '@/data/sliceFallbacks'
import type {
  Backend,
  PathSummary,
  PhaseSummary,
  SliceDetail,
  SliceSummary,
} from '../ports'

const READ_ONLY =
  'This build has no database configured, so it serves reads only. ' +
  'Author by editing the IR and regenerating (scripts/generate_fallbacks.py), ' +
  'or configure a backend.'

function phases(): PhaseSummary[] {
  return SAMPLE_PHASES.map((phase) => ({
    id: phase.id,
    name: phase.name,
    description: phase.description,
    position: phase.order_position,
    loopsToPhaseId: phase.loops_to_phase_id,
    scenarios: SAMPLE_SCENARIOS.filter((scenario) => scenario.phase_id === phase.id)
      .map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        position: scenario.order_position,
      }))
      .sort((a, b) => a.position - b.position),
  })).sort((a, b) => a.position - b.position)
}

function pathsFor(scenarioId: string): PathSummary[] {
  return getFallbackPathsForScenario(scenarioId).map((path) => ({
    id: path.id,
    scenarioId,
    name: path.name,
    description: path.description,
    note: path.note,
    pathType: path.path_type,
  }))
}

/**
 * Which scenario a path belongs to. The generated registry is keyed the other
 * way round and lives inside a marker block that a regeneration rewrites
 * wholesale, so the index is derived here rather than exported from there.
 */
function scenarioOfPath(pathId: string): string | null {
  for (const scenario of SAMPLE_SCENARIOS) {
    if (getFallbackPathsForScenario(scenario.id).some((path) => path.id === pathId)) {
      return scenario.id
    }
  }
  return null
}

function sliceSummary(slice: (typeof FALLBACK_SLICES)[number]): SliceSummary {
  return {
    id: slice.id,
    // The fixture's demo slices hang off the lifecycle rather than a single
    // scenario, and the seam does not invent an owner they do not have.
    scenarioId: null,
    title: slice.title,
    sliceType: slice.slice_type,
    origin: slice.origin,
  }
}

export function createFixtureBackend(): Backend {
  return {
    name: 'bundled fixture',
    capabilities: { writes: null, blueprintRoundTrips: 0 },

    blueprints: {
      async listPhases() {
        return phases()
      },
      async listPaths(scenarioId) {
        return pathsFor(scenarioId)
      },
      async getBlueprint(pathId) {
        const scenarioId = scenarioOfPath(pathId)
        if (!scenarioId) return null
        return getBlueprintFallback(scenarioId, pathId)
      },
    },

    slices: {
      async listSlices(scenarioId) {
        const all = FALLBACK_SLICES.map(sliceSummary)
        return scenarioId ? all.filter((slice) => slice.scenarioId === scenarioId) : all
      },
      async getSlice(sliceId): Promise<SliceDetail | null> {
        const slice = FALLBACK_SLICES.find((row) => row.id === sliceId)
        if (!slice) return null
        const items = FALLBACK_SLICE_ITEMS[sliceId] ?? []
        return {
          ...sliceSummary(slice),
          frames: items
            .map((item) => ({
              position: item.position,
              title: item.caption ?? '',
              body: item.narrative,
              cellIds: item.cell_ids ?? [],
            }))
            .sort((a, b) => a.position - b.position),
        }
      },
      async createSlice() {
        throw new Error(READ_ONLY)
      },
      async replaceSliceFrames() {
        throw new Error(READ_ONLY)
      },
      async deleteSlice() {
        throw new Error(READ_ONLY)
      },
      async repairSlices() {
        // Nothing writes here, so nothing can tear.
        return 0
      },
    },

    findings: {
      async listFindings() {
        // The derived layer without a database is the audit ledger files, not
        // this module — see adapter-contract.md. Nothing is served here rather
        // than an empty store being implied.
        return []
      },
      async recordFindings() {
        throw new Error(READ_ONLY)
      },
      async setFindingStatus() {
        throw new Error(READ_ONLY)
      },
    },

    identity: {
      async currentTier() {
        return 'anon'
      },
    },
  }
}
