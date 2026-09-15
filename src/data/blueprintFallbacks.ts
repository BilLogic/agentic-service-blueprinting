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
 * NOTHING HERE IS SETTLED BY WRITING TO THIS MODULE. A registry becomes an
 * {@link OfflineBoard} — the indexed value every lookup below takes as its
 * first argument — and `DeploymentConfigProvider` builds one and hands it down
 * the tree. The board a surface draws is therefore the board the provider
 * above it holds, which is what lets two providers with two registries stand
 * in one tree, and what stops a test's board from outliving its own file.
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

/**
 * The same board, deferred: a registry behind a call rather than in hand.
 *
 * A registry of a real board is the largest thing a deployment hands this
 * config — on the order of a megabyte of cells — and it is read on exactly one
 * condition, `isBundledSampleActive()`. Handed over as a VALUE it is reachable
 * from the config module, so every build carries it, including the production
 * build with a database where nothing will ever ask for it. Handed over as a
 * LOADER — `() => import('./data/sampleBlueprints').then((m) =>
 * m.SAMPLE_BLUEPRINTS)` — the only reference to those bytes is inside a
 * dynamic import, which is a chunk boundary to every bundler, and they are
 * fetched when a board is about to be drawn and at no other time.
 *
 * ONE FIELD, TWO FORMS, rather than a second field beside the first. A
 * deployment states its offline board once; two fields would need a rule for
 * which wins when both are supplied, and there is no answer to that question
 * a deployment would mean.
 *
 * CALLED MORE THAN ONCE, sometimes: React's strict mode runs the effect behind
 * it twice in development, and a host may mount `App` more than once. A loader
 * that is a bare `import()` costs nothing for that — the module registry
 * answers the second call from cache — which is the form to write. One that
 * fetches over the network should hold its own promise rather than start a
 * second request.
 *
 * What the loader costs is that the registry is not there during the first
 * render, and the board reads it during its own. `DeploymentConfigProvider`
 * pays that in the one place that can: with the bundled sample active it
 * awaits the loader before it renders the tree below, so nothing beneath it
 * ever draws against a board that has not arrived. With a database configured
 * it never calls the loader at all.
 */
export type SampleBlueprintRegistryLoader =
  () => Promise<SampleBlueprintRegistry>

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

/**
 * One offline board, indexed: the registry this part of the tree reads, with
 * the lookup tables every read below goes through built once over it.
 *
 * The VALUE a provider holds and hands down. Opaque on purpose — a caller
 * takes one and passes it on, and everything it knows how to answer is a
 * function in this module — so the shape of the tables stays this module's
 * business and the thing threaded through the app is one noun.
 */
export type OfflineBoard = {
  byPath: Record<string, BlueprintData>
  pathsByScenario: Record<string, FallbackPathListItem[]>
  byScenario: Record<string, BlueprintData>
  hiddenByScenario: Record<string, readonly string[]>
  /** Every cell by id, built lazily — most sessions never open a panel. */
  cellsById: Map<string, BlueprintData['cells'][number]> | null
}

function indexRegistry(registry: SampleBlueprintRegistry): OfflineBoard {
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

/**
 * The package's own board, indexed once — what a clone with no database draws,
 * and what a tree with no provider over it reads.
 */
export const PACKAGE_OFFLINE_BOARD: OfflineBoard = indexRegistry(
  PACKAGE_SAMPLE_BLUEPRINTS,
)

/**
 * The board an installation reads: the deployment's when it supplied a registry
 * on `sample.blueprints`, the package's when it did not.
 *
 * `undefined` is "I have nothing to say" rather than "show nothing" — the same
 * reading `sample.nav` gives an absent field — and so is an empty registry, so
 * both land on the package's own. A pure function of its argument: call it
 * twice with the same registry and the two boards answer alike, which is why
 * the provider may build one inside a memo and hand it down.
 */
export function offlineBoardFrom(
  registry: SampleBlueprintRegistry | undefined,
): OfflineBoard {
  return registry && Object.keys(registry.blueprintsByScenario).length > 0
    ? indexRegistry(registry)
    : PACKAGE_OFFLINE_BOARD
}

const EMPTY_FALLBACK_PATHS: FallbackPathListItem[] = []

export function hasBlueprintFallback(
  board: OfflineBoard,
  scenarioId: string | undefined,
): boolean {
  if (!scenarioId) return false
  return scenarioId in board.byScenario || scenarioId in board.pathsByScenario
}

export function filterPathsForScenarioUi<T extends { id: string }>(
  board: OfflineBoard,
  scenarioId: string | undefined,
  paths: readonly T[],
): T[] {
  if (!scenarioId) return [...paths]
  const hidden = board.hiddenByScenario[scenarioId]
  if (!hidden?.length) return [...paths]
  const hiddenIds = new Set(hidden)
  return paths.filter((path) => !hiddenIds.has(path.id))
}

export function getFallbackPathsForScenario(
  board: OfflineBoard,
  scenarioId: string | undefined,
): FallbackPathListItem[] {
  if (!scenarioId) return EMPTY_FALLBACK_PATHS
  return filterPathsForScenarioUi(
    board,
    scenarioId,
    board.pathsByScenario[scenarioId] ?? EMPTY_FALLBACK_PATHS,
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
  board: OfflineBoard,
  pathId: string | undefined | null,
): boolean {
  return Boolean(pathId && pathId in board.byPath)
}

export function getRawBlueprintFallback(
  board: OfflineBoard,
  scenarioId: string | undefined,
  pathId?: string | null,
  pathKind?: BlueprintData['path']['kind'],
): BlueprintData | null {
  let data: BlueprintData | null = null
  if (pathId && board.byPath[pathId]) {
    data = board.byPath[pathId]
  } else if (scenarioId && pathKind) {
    const match = (board.pathsByScenario[scenarioId] ?? []).find(
      (path) => path.kind === pathKind,
    )
    if (match) {
      data = board.byPath[match.id] ?? null
    }
  }

  if (!data && scenarioId) {
    data = board.byScenario[scenarioId] ?? null
  }

  if (!data) return null

  const identity =
    pathId && pathKind
      ? { id: pathId, name: data.path.name, kind: pathKind }
      : null

  return identity ? withPathIdentity(data, identity) : data
}

export function getBlueprintFallback(
  board: OfflineBoard,
  scenarioId: string | undefined,
  pathId?: string | null,
  pathKind?: BlueprintData['path']['kind'],
): BlueprintData | null {
  return getRawBlueprintFallback(board, scenarioId, pathId, pathKind)
}

export function getFallbackBlueprintsForScenarios(
  board: OfflineBoard,
  scenarioIds: string[],
): Map<string, BlueprintData> {
  const map = new Map<string, BlueprintData>()
  for (const id of scenarioIds) {
    const data = getBlueprintFallback(board, id)
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
  board: OfflineBoard,
  cellId: string | null | undefined,
): BlueprintData['cells'][number] | null {
  if (!cellId) return null
  if (!board.cellsById) {
    board.cellsById = new Map(
      Object.values(board.byPath).flatMap((data) =>
        data.cells.map((cell) => [cell.id, cell] as const),
      ),
    )
  }
  return board.cellsById.get(cellId) ?? null
}
