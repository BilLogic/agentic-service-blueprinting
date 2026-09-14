/**
 * Offline / no-DB fallback registry — and the seam a deployment hands its own
 * through.
 *
 * The template ships a generated sample blueprint — six scenarios across
 * three phases (see src/data/sampleBlueprint.ts, produced by
 * scripts/generate_sample_blueprint.mjs).
 * The import pipeline (scripts/generate_fallbacks.py --register) replaces the
 * marker-delimited registry block below with generated content for a real
 * organization. All lookups are keyed by scenario / path UUIDs, so foreign
 * content simply misses.
 *
 * THAT KEYING IS WHY THIS MODULE HAS A CONFIG HOME. A deployment that reads
 * the application out of the package supplies its own board before a database
 * answers as `sample.nav`, and the nav REPLACES rather than merges — so a
 * deployment whose nav rows are its own, over a registry that is this
 * template's, draws its phases and scenarios above an empty canvas in every
 * no-database build, and no walk over that build can see a board. The
 * two halves of one offline board therefore arrive together: the nav on
 * `sample.nav`, the content behind it on `sample.blueprints`, as a
 * {@link SampleBlueprintRegistry} of exactly the shape the generated block
 * below exports. Supplied, it is the registry every lookup here reads;
 * omitted, the package's own stands, which is what a clone of this repository
 * runs on.
 *
 * `DeploymentConfigProvider` writes it with {@link configureSampleBlueprints}
 * while it renders, before anything below it does — the board reads these
 * lookups during its own render, and a module write notifies no one, so a
 * later write would leave the first paint on the package's content with
 * nothing to correct it.
 */
import type { BlueprintData } from '@/types/blueprint'

type FallbackPathListItem = {
  id: string
  name: string
  summary: string | null
  note: string | null
  kind: BlueprintData['path']['kind']
}

/**
 * One offline board, whole: every path of every scenario it covers.
 *
 * Keyed by scenario id, and the value is that scenario's paths in the order a
 * picker should offer them — the first is the one a scenario with no path
 * chosen draws. This is the generated shape rather than a second one invented
 * for the config: `scripts/generate_fallbacks.py --register` writes exactly
 * this object into the block below, so a deployment that runs the same
 * pipeline hands the config what its own pipeline already produced.
 */
export type SampleBlueprintRegistry = {
  blueprintsByScenario: Record<string, readonly BlueprintData[]>
  /** Paths hidden from pickers/grids until ready in the UI. */
  uiHiddenPathIdsByScenario?: Record<string, readonly string[]>
}

// GENERATED-BLUEPRINT-REGISTRY:BEGIN — managed by scripts/generate_fallbacks.py --register.
// Everything between the BEGIN/END markers is replaced wholesale on
// registration; do not hand-edit. Default content wires the template's
// meta-blueprint sample (the blueprint OF this template itself, generated
// by scripts/generate_sample_blueprint.mjs).
import { SAMPLE_BLUEPRINTS_BY_SCENARIO, SAMPLE_SCENARIOS } from '@/data/sampleBlueprint'

/**
 * The template's primary sample scenario — the compare demo the journey slice
 * and the multi-path tests hang off. The sample has more than one two-path
 * scenario, so it is declared rather than guessed: the generator asserts
 * exactly one `primary` and this throws with a real message if that breaks.
 */
const PRIMARY_SAMPLE_SCENARIO = SAMPLE_SCENARIOS.find(
  (scenario) => scenario.primary,
)
if (!PRIMARY_SAMPLE_SCENARIO) {
  throw new Error(
    'no sample scenario is marked primary — regenerate with scripts/generate_sample_blueprint.mjs',
  )
}
export const SAMPLE_SCENARIO_ID = PRIMARY_SAMPLE_SCENARIO.id

/** The package's own offline board — what a clone with no database shows. */
export const PACKAGE_SAMPLE_BLUEPRINTS: SampleBlueprintRegistry = {
  blueprintsByScenario: SAMPLE_BLUEPRINTS_BY_SCENARIO,
  // The template hides none of its own paths.
  uiHiddenPathIdsByScenario: {},
}
// GENERATED-BLUEPRINT-REGISTRY:END

/** The three lookup tables every read below goes through, built once. */
type RegistryIndex = {
  byPath: Record<string, BlueprintData>
  pathsByScenario: Record<string, FallbackPathListItem[]>
  byScenario: Record<string, BlueprintData>
  hiddenByScenario: Record<string, readonly string[]>
  /** Every cell by id, built lazily — most sessions never open a panel. */
  cellsById: Map<string, BlueprintData['cells'][number]> | null
}

function indexRegistry(registry: SampleBlueprintRegistry): RegistryIndex {
  const byPath: Record<string, BlueprintData> = {}
  const pathsByScenario: Record<string, FallbackPathListItem[]> = {}
  const byScenario: Record<string, BlueprintData> = {}

  for (const [scenarioId, blueprints] of Object.entries(
    registry.blueprintsByScenario,
  )) {
    pathsByScenario[scenarioId] = blueprints.map((blueprint) => ({
      id: blueprint.path.id,
      name: blueprint.path.name,
      summary: blueprint.path.summary,
      note: blueprint.path.note,
      kind: blueprint.path.kind,
    }))
    for (const blueprint of blueprints) {
      byPath[blueprint.path.id] = blueprint
    }
    const first = blueprints[0]
    if (first) byScenario[scenarioId] = first
  }

  return {
    byPath,
    pathsByScenario,
    byScenario,
    hiddenByScenario: registry.uiHiddenPathIdsByScenario ?? {},
    cellsById: null,
  }
}

const PACKAGE_INDEX = indexRegistry(PACKAGE_SAMPLE_BLUEPRINTS)

let index: RegistryIndex = PACKAGE_INDEX

/**
 * The offline board this installation reads: the deployment's when it supplied
 * one on `sample.blueprints`, the package's when it did not.
 *
 * Idempotent, so a host that calls it from its own bootstrap as well as
 * through the provider is doing no harm. `undefined` is "I have nothing to
 * say" rather than "show nothing" — the same reading `sample.nav` gives an
 * absent field — so it restores the package's own registry.
 */
export function configureSampleBlueprints(
  registry: SampleBlueprintRegistry | undefined,
): void {
  index =
    registry && Object.keys(registry.blueprintsByScenario).length > 0
      ? indexRegistry(registry)
      : PACKAGE_INDEX
}

const EMPTY_FALLBACK_PATHS: FallbackPathListItem[] = []

export function hasBlueprintFallback(scenarioId: string | undefined): boolean {
  if (!scenarioId) return false
  return scenarioId in index.byScenario || scenarioId in index.pathsByScenario
}

export function filterPathsForScenarioUi<T extends { id: string }>(
  scenarioId: string | undefined,
  paths: readonly T[],
): T[] {
  if (!scenarioId) return [...paths]
  const hidden = index.hiddenByScenario[scenarioId]
  if (!hidden?.length) return [...paths]
  const hiddenIds = new Set(hidden)
  return paths.filter((path) => !hiddenIds.has(path.id))
}

export function getFallbackPathsForScenario(
  scenarioId: string | undefined,
): FallbackPathListItem[] {
  if (!scenarioId) return EMPTY_FALLBACK_PATHS
  return filterPathsForScenarioUi(
    scenarioId,
    index.pathsByScenario[scenarioId] ?? EMPTY_FALLBACK_PATHS,
  )
}

function withPathIdentity(
  data: BlueprintData,
  path: {
    id: string
    name: string
    summary?: string | null
    note?: string | null
    kind: BlueprintData['path']['kind']
  },
): BlueprintData {
  return {
    ...data,
    path: {
      ...data.path,
      id: path.id,
      name: path.name,
      summary: path.summary ?? data.path.summary,
      note: path.note ?? data.path.note,
      kind: path.kind,
    },
  }
}

export function hasRegisteredPathFallback(
  pathId: string | undefined | null,
): boolean {
  return Boolean(pathId && pathId in index.byPath)
}

export function getRawBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathKind?: BlueprintData['path']['kind'],
): BlueprintData | null {
  let data: BlueprintData | null = null
  if (pathId && index.byPath[pathId]) {
    data = index.byPath[pathId]
  } else if (scenarioId && pathKind) {
    const match = (index.pathsByScenario[scenarioId] ?? []).find(
      (path) => path.kind === pathKind,
    )
    if (match) {
      data = index.byPath[match.id] ?? null
    }
  }

  if (!data && scenarioId) {
    data = index.byScenario[scenarioId] ?? null
  }

  if (!data) return null

  const identity =
    pathId && pathKind
      ? { id: pathId, name: data.path.name, kind: pathKind }
      : null

  return identity ? withPathIdentity(data, identity) : data
}

export function getBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathKind?: BlueprintData['path']['kind'],
): BlueprintData | null {
  return getRawBlueprintFallback(scenarioId, pathId, pathKind)
}

export function getFallbackBlueprintsForScenarios(
  scenarioIds: string[],
): Map<string, BlueprintData> {
  const map = new Map<string, BlueprintData>()
  for (const id of scenarioIds) {
    const data = getBlueprintFallback(id)
    if (data) map.set(id, data)
  }
  return map
}

/**
 * One fallback cell by id, for panels that read a cell on its own rather than
 * through the grid query (`useCellContent`). Without this a keyless clone shows
 * the grid text but none of the cell spec — owner, perceived owner, function,
 * form, value props — which is exactly the part the sample content is teaching.
 */
export function getFallbackCell(
  cellId: string | null | undefined,
): BlueprintData['cells'][number] | null {
  if (!cellId) return null
  if (!index.cellsById) {
    index.cellsById = new Map(
      Object.values(index.byPath).flatMap((data) =>
        data.cells.map((cell) => [cell.id, cell] as const),
      ),
    )
  }
  return index.cellsById.get(cellId) ?? null
}
