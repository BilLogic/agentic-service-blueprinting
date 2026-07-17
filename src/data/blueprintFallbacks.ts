/**
 * Offline / no-DB fallback registry.
 *
 * The template ships one generated sample scenario (the scale fixture in
 * src/data/scaleFixture.ts, produced by scripts/generate_scale_fixture.mjs).
 * An import pipeline (generate_fallbacks.py, plan Phase 3) replaces this
 * registry with generated content for a real organization. All lookups are
 * keyed by scenario / path UUIDs, so foreign content simply misses.
 */
import {
  SCALE_TEST_ALTERNATIVE_PATH_FALLBACK,
  SCALE_TEST_ALTERNATIVE_PATH_ID,
  SCALE_TEST_EXCEPTION_PATH_FALLBACK,
  SCALE_TEST_EXCEPTION_PATH_ID,
  SCALE_TEST_HAPPY_PATH_FALLBACK,
  SCALE_TEST_HAPPY_PATH_ID,
  SCALE_TEST_PATH_FALLBACKS,
  SCALE_TEST_SCENARIO_ID,
} from '@/data/scaleFixture'
import type { BlueprintData } from '@/types/blueprint'

/** The template's sample scenario (rendered offline without a database). */
export const SAMPLE_SCENARIO_ID = SCALE_TEST_SCENARIO_ID

const FALLBACK_BY_PATH: Record<string, BlueprintData> = {
  [SCALE_TEST_HAPPY_PATH_ID]: SCALE_TEST_HAPPY_PATH_FALLBACK,
  [SCALE_TEST_ALTERNATIVE_PATH_ID]: SCALE_TEST_ALTERNATIVE_PATH_FALLBACK,
  [SCALE_TEST_EXCEPTION_PATH_ID]: SCALE_TEST_EXCEPTION_PATH_FALLBACK,
}

type FallbackPathListItem = {
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: BlueprintData['path']['path_type']
}

const FALLBACK_PATHS_BY_SCENARIO: Record<string, FallbackPathListItem[]> = {
  [SCALE_TEST_SCENARIO_ID]: SCALE_TEST_PATH_FALLBACKS.map((fallback) => ({
    id: fallback.path.id,
    name: fallback.path.name,
    description: fallback.path.description,
    note: fallback.path.note,
    path_type: fallback.path.path_type,
  })),
}

const FALLBACK_BY_SCENARIO: Record<string, BlueprintData> = {
  [SCALE_TEST_SCENARIO_ID]: SCALE_TEST_HAPPY_PATH_FALLBACK,
}

/** Paths hidden from pickers/grids until ready in the UI (template: none). */
const UI_HIDDEN_PATH_IDS_BY_SCENARIO: Record<string, readonly string[]> = {}

const EMPTY_FALLBACK_PATHS: FallbackPathListItem[] = []

export function hasBlueprintFallback(scenarioId: string | undefined): boolean {
  if (!scenarioId) return false
  return (
    scenarioId in FALLBACK_BY_SCENARIO ||
    scenarioId in FALLBACK_PATHS_BY_SCENARIO
  )
}

export function filterPathsForScenarioUi<T extends { id: string }>(
  scenarioId: string | undefined,
  paths: readonly T[],
): T[] {
  if (!scenarioId) return [...paths]
  const hidden = UI_HIDDEN_PATH_IDS_BY_SCENARIO[scenarioId]
  if (!hidden?.length) return [...paths]
  const hiddenIds = new Set(hidden)
  return paths.filter((path) => !hiddenIds.has(path.id))
}

/** Union DB paths with registered fallback paths missing from the database. */
export function mergePathsWithFallback<
  T extends {
    id: string
    name: string
    description: string | null
    note: string | null
    path_type: BlueprintData['path']['path_type']
  },
>(scenarioId: string | undefined, paths: readonly T[]): T[] {
  const fallbackPaths = getFallbackPathsForScenario(scenarioId)
  if (!scenarioId || fallbackPaths.length === 0) {
    return filterPathsForScenarioUi(scenarioId, paths)
  }

  const merged = new Map(
    filterPathsForScenarioUi(scenarioId, paths).map((path) => [path.id, path]),
  )
  for (const fallbackPath of fallbackPaths) {
    const existing = merged.get(fallbackPath.id)
    if (existing) {
      merged.set(fallbackPath.id, {
        ...existing,
        name: existing.name.trim() ? existing.name : fallbackPath.name,
        description: existing.description ?? fallbackPath.description,
        note: existing.note ?? fallbackPath.note,
      })
    } else {
      const hasPathOfType = [...merged.values()].some(
        (path) => path.path_type === fallbackPath.path_type,
      )
      if (!hasPathOfType) {
        merged.set(fallbackPath.id, fallbackPath as T)
      }
    }
  }

  const order = fallbackPaths.map((path) => path.id)
  return [...merged.values()].sort((a, b) => {
    const aIndex = order.indexOf(a.id)
    const bIndex = order.indexOf(b.id)
    if (aIndex === -1 && bIndex === -1) return a.name.localeCompare(b.name)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}

export function getFallbackPathsForScenario(
  scenarioId: string | undefined,
): FallbackPathListItem[] {
  if (!scenarioId) return EMPTY_FALLBACK_PATHS
  return filterPathsForScenarioUi(
    scenarioId,
    FALLBACK_PATHS_BY_SCENARIO[scenarioId] ?? EMPTY_FALLBACK_PATHS,
  )
}

function withPathIdentity(
  data: BlueprintData,
  path: {
    id: string
    name: string
    description?: string | null
    note?: string | null
    path_type: BlueprintData['path']['path_type']
  },
): BlueprintData {
  return {
    ...data,
    path: {
      ...data.path,
      id: path.id,
      name: path.name,
      description: path.description ?? data.path.description,
      note: path.note ?? data.path.note,
      path_type: path.path_type,
    },
  }
}

export function hasRegisteredPathFallback(
  pathId: string | undefined | null,
): boolean {
  return Boolean(pathId && pathId in FALLBACK_BY_PATH)
}

export function getRawBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathType?: BlueprintData['path']['path_type'],
): BlueprintData | null {
  let data: BlueprintData | null = null
  if (pathId && FALLBACK_BY_PATH[pathId]) {
    data = FALLBACK_BY_PATH[pathId]
  } else if (scenarioId && pathType) {
    const match = (FALLBACK_PATHS_BY_SCENARIO[scenarioId] ?? []).find(
      (path) => path.path_type === pathType,
    )
    if (match) {
      data = FALLBACK_BY_PATH[match.id] ?? null
    }
  }

  if (!data && scenarioId) {
    data = FALLBACK_BY_SCENARIO[scenarioId] ?? null
  }

  if (!data) return null

  const identity =
    pathId && pathType
      ? { id: pathId, name: data.path.name, path_type: pathType }
      : null

  return identity ? withPathIdentity(data, identity) : data
}

export function getBlueprintFallback(
  scenarioId: string | undefined,
  pathId?: string | null,
  pathType?: BlueprintData['path']['path_type'],
): BlueprintData | null {
  return getRawBlueprintFallback(scenarioId, pathId, pathType)
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
