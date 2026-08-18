import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { getOverviewPathKey } from '@/lib/overviewPathFilters'
import { pickPreferredPath, type PathListItem } from '@/lib/pathSelection'

type PathCatalog = Record<string, PathListItem[]>

type PathSelectionState = {
  catalog: PathCatalog
  /** `null` = uninitialized; first sync applies the happy-path default. */
  activePathKeys: string[] | null
  selections: Record<string, string[]>
}

type PathSelectionContextValue = {
  /** Registered paths per scenario id (read-only; merged, pruned by scope). */
  catalog: PathCatalog
  /** Selected path identities (`path_type:name`) — shared across overview/phase/scenario. */
  activePathKeys: string[]
  /**
   * The happy-path default derived from the catalog — the same derivation
   * the first sync applies. Empty until some scenario's paths have loaded.
   */
  defaultPathKeys: string[]
  /** Restore that default: the way back from "no paths selected". */
  restoreDefaultPathKeys: () => void
  selections: Record<string, string[]>
  getSelectedPathIds: (scenarioId: string) => string[]
  /** Toggle by path identity — updates every known scenario that has that path. */
  togglePathKey: (pathKey: string) => void
  /** Toggle by scenario path UUID — resolves to a path key, then updates globally. */
  togglePathSelection: (scenarioId: string, pathId: string) => void
  setSelectedPathIds: (scenarioId: string, pathIds: string[]) => void
  /**
   * Register/update paths for scenarios and apply the active path keys.
   * `scope` — the scenario ids the caller asked about — additionally prunes
   * any of those that came back with no paths, i.e. that no longer exist.
   */
  syncScenarioPaths: (
    pathsByScenario: Map<string, PathListItem[]>,
    scope?: readonly string[],
  ) => void
}

const PathSelectionContext = createContext<PathSelectionContextValue | null>(
  null,
)

function pathIdsKey(paths: PathListItem[]): string {
  return paths.map((path) => path.id).join('|')
}

function defaultPathKeysFromCatalog(catalog: PathCatalog): string[] {
  for (const paths of Object.values(catalog)) {
    const preferred = pickPreferredPath(paths)
    if (preferred) return [getOverviewPathKey(preferred)]
  }
  return []
}

function selectedIdsForPaths(
  paths: PathListItem[],
  activePathKeys: readonly string[],
): string[] {
  if (activePathKeys.length === 0) return []
  const keySet = new Set(activePathKeys)
  return paths
    .filter((path) => keySet.has(getOverviewPathKey(path)))
    .map((path) => path.id)
}

function deriveSelections(
  catalog: PathCatalog,
  activePathKeys: readonly string[],
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [scenarioId, paths] of Object.entries(catalog)) {
    next[scenarioId] = selectedIdsForPaths(paths, activePathKeys)
  }
  return next
}

function toggleKeyInList(keys: string[], pathKey: string): string[] {
  if (keys.includes(pathKey)) {
    return keys.filter((key) => key !== pathKey)
  }
  return [...keys, pathKey]
}

/**
 * Every field of a path, in a stable order.
 *
 * The comparison used to name three of the five fields, so `description` and
 * `note` edits never reached the catalog and the sidebar kept rendering the
 * old text for the life of the session. Deriving the signature from the whole
 * record instead of a hand-written field list means adding a sixth field
 * cannot silently reopen that — the field is compared because it exists.
 */
function pathSignature(path: PathListItem): string {
  return JSON.stringify(
    Object.keys(path)
      .sort()
      .map((key) => [key, path[key as keyof PathListItem]]),
  )
}

function samePaths(a: PathListItem[] | undefined, b: PathListItem[]): boolean {
  return (
    a !== undefined &&
    a.length === b.length &&
    a.every((path, index) => {
      const other = b[index]
      return other !== undefined && pathSignature(path) === pathSignature(other)
    })
  )
}

function mergeCatalog(
  prev: PathCatalog,
  pathsByScenario: Map<string, PathListItem[]>,
  /** The scenarios the caller asked about — see the prune below. */
  scope?: readonly string[],
): { catalog: PathCatalog; changed: boolean } {
  let changed = false
  const catalog = { ...prev }

  for (const [scenarioId, paths] of pathsByScenario) {
    if (paths.length === 0) continue
    if (!samePaths(prev[scenarioId], paths)) {
      catalog[scenarioId] = paths
      changed = true
    }
  }

  /*
    The prune, and why it needs `scope`.

    Without one, a deleted scenario — or a duplicate that was reverted — stays
    in the catalog for the life of the session: it keeps emitting selections,
    keeps offering its dead paths to the PATHS filter and to the agent's
    `toggle_path_filter`, and can be picked as the happy-path default.

    But absence from `pathsByScenario` does not mean "gone". Every caller syncs
    a *view's worth* of scenarios (one phase, or the overview), and two of them
    can be mounted at once — so pruning everything absent would have one view
    empty the other's selections and make its paths vanish from the board.

    `scope` is the caller naming the scenarios it asked about. A scenario in
    that set with no entry in the map has no paths, which for these queries
    means it no longer exists. Nothing outside the set is touched.
  */
  if (scope) {
    for (const scenarioId of scope) {
      if (pathsByScenario.get(scenarioId)?.length) continue
      if (!(scenarioId in catalog)) continue
      delete catalog[scenarioId]
      changed = true
    }
  }

  return { catalog: changed ? catalog : prev, changed }
}

export function PathSelectionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PathSelectionState>({
    catalog: {},
    activePathKeys: null,
    selections: {},
  })

  const syncScenarioPaths = useCallback(
    (pathsByScenario: Map<string, PathListItem[]>, scope?: readonly string[]) => {
      setState((prev) => {
        const { catalog, changed: catalogChanged } = mergeCatalog(
          prev.catalog,
          pathsByScenario,
          scope,
        )
        // Stay uninitialized until the catalog has paths — an empty first sync
        // must not lock in "nothing selected" and skip the happy-path default.
        let activePathKeys = prev.activePathKeys
        if (activePathKeys === null) {
          const defaults = defaultPathKeysFromCatalog(catalog)
          if (defaults.length > 0) activePathKeys = defaults
        }
        const keysChanged = activePathKeys !== prev.activePathKeys
        const selections = deriveSelections(
          catalog,
          activePathKeys ?? [],
        )

        if (!catalogChanged && !keysChanged) {
          // Still refresh selections when path lists are unchanged but keys
          // already set — covers re-entry into a scenario with the same catalog.
          const selectionUnchanged =
            Object.keys(selections).length ===
              Object.keys(prev.selections).length &&
            Object.entries(selections).every(([id, ids]) => {
              const prior = prev.selections[id]
              return (
                prior &&
                prior.length === ids.length &&
                prior.every((pathId, index) => pathId === ids[index])
              )
            })
          if (selectionUnchanged) return prev
        }

        return { catalog, activePathKeys, selections }
      })
    },
    [],
  )

  const togglePathKey = useCallback((pathKey: string) => {
    setState((prev) => {
      const currentKeys =
        prev.activePathKeys ?? defaultPathKeysFromCatalog(prev.catalog)
      const activePathKeys = toggleKeyInList(currentKeys, pathKey)
      return {
        ...prev,
        activePathKeys,
        selections: deriveSelections(prev.catalog, activePathKeys),
      }
    })
  }, [])

  const restoreDefaultPathKeys = useCallback(() => {
    setState((prev) => {
      const activePathKeys = defaultPathKeysFromCatalog(prev.catalog)
      if (activePathKeys.length === 0) return prev
      return {
        ...prev,
        activePathKeys,
        selections: deriveSelections(prev.catalog, activePathKeys),
      }
    })
  }, [])

  const getSelectedPathIds = useCallback(
    (scenarioId: string) => state.selections[scenarioId] ?? [],
    [state.selections],
  )

  const togglePathSelection = useCallback(
    (scenarioId: string, pathId: string) => {
      setState((prev) => {
        const path = prev.catalog[scenarioId]?.find(
          (entry) => entry.id === pathId,
        )
        if (!path) {
          const current = prev.selections[scenarioId] ?? []
          const next = current.includes(pathId)
            ? current.filter((id) => id !== pathId)
            : [...current, pathId]
          return {
            ...prev,
            selections: { ...prev.selections, [scenarioId]: next },
          }
        }

        const currentKeys =
          prev.activePathKeys ?? defaultPathKeysFromCatalog(prev.catalog)
        const activePathKeys = toggleKeyInList(
          currentKeys,
          getOverviewPathKey(path),
        )
        return {
          ...prev,
          activePathKeys,
          selections: deriveSelections(prev.catalog, activePathKeys),
        }
      })
    },
    [],
  )

  const setSelectedPathIds = useCallback(
    (scenarioId: string, pathIds: string[]) => {
      setState((prev) => {
        const paths = prev.catalog[scenarioId] ?? []
        const activePathKeys = [
          ...new Set(
            pathIds
              .map((id) => paths.find((path) => path.id === id))
              .filter((path): path is PathListItem => path !== undefined)
              .map((path) => getOverviewPathKey(path)),
          ),
        ]
        return {
          ...prev,
          activePathKeys,
          selections: deriveSelections(prev.catalog, activePathKeys),
        }
      })
    },
    [],
  )

  // Agent parity: the PATHS filter checkboxes. Reads the live catalog via
  // a ref so registration stays stable.
  const catalogRef = useRef(state.catalog)
  useEffect(() => {
    catalogRef.current = state.catalog
  })
  useEffect(() => {
    const unregister = [
      registerAgentUiCommand({
        name: 'toggle_path_filter',
        description:
          'Toggle a path variant\'s visibility (the PATHS checkboxes). arg: the path key (type:name, e.g. "happy:Happy Path") or a path name.',
        run: (arg) => {
          if (!arg) throw new Error('arg required: path key or name')
          const keys = [
            ...new Set(
              Object.values(catalogRef.current)
                .flat()
                .map((path) => getOverviewPathKey(path)),
            ),
          ]
          const match =
            keys.find((key) => key === arg) ??
            keys.find((key) => key.toLowerCase().includes(arg.toLowerCase()))
          if (!match) throw new Error(`No path matches "${arg}". Known: ${keys.join(', ')}`)
          togglePathKey(match)
          return `Toggled path "${match}".`
        },
      }),
      registerAgentUiCommand({
        name: 'restore_default_paths',
        description: 'Reset the path filter to its defaults.',
        run: () => {
          restoreDefaultPathKeys()
          return 'Path filter restored to defaults.'
        },
      }),
    ]
    return () => unregister.forEach((fn) => fn())
  }, [togglePathKey, restoreDefaultPathKeys])

  const value = useMemo(() => {
    const defaultPathKeys = defaultPathKeysFromCatalog(state.catalog)
    return {
      catalog: state.catalog,
      // While uninitialized, surface the happy-path default from whatever is
      // already in the catalog so filters don't flash as empty.
      activePathKeys: state.activePathKeys ?? defaultPathKeys,
      defaultPathKeys,
      selections: state.selections,
      getSelectedPathIds,
      togglePathKey,
      togglePathSelection,
      setSelectedPathIds,
      restoreDefaultPathKeys,
      syncScenarioPaths,
    }
  }, [
    state.activePathKeys,
    state.catalog,
    state.selections,
    getSelectedPathIds,
    togglePathKey,
    togglePathSelection,
    setSelectedPathIds,
    restoreDefaultPathKeys,
    syncScenarioPaths,
  ])

  return (
    <PathSelectionContext.Provider value={value}>
      {children}
    </PathSelectionContext.Provider>
  )
}

export function usePathSelectionContext() {
  const context = useContext(PathSelectionContext)
  if (!context) {
    throw new Error(
      'usePathSelectionContext must be used within PathSelectionProvider',
    )
  }
  return context
}

/** Shared per-scenario selections — same store for overview, phase, and scenario. */
export function usePathSelectionsByScenario(
  pathsByScenario: Map<string, PathListItem[]>,
  /**
   * The scenarios this view asked about. Passing it lets the store prune the
   * ones that came back empty — a deleted scenario, or a duplicate that was
   * reverted — instead of carrying them for the rest of the session.
   */
  scopeIds?: readonly string[],
) {
  const {
    selections,
    getSelectedPathIds,
    togglePathSelection,
    togglePathKey,
    activePathKeys,
    syncScenarioPaths,
  } = usePathSelectionContext()

  const pathsKey = useMemo(
    () =>
      [...pathsByScenario.entries()]
        .map(([id, paths]) => `${id}:${pathIdsKey(paths)}`)
        .sort()
        .join('|'),
    [pathsByScenario],
  )

  useLayoutEffect(() => {
    syncScenarioPaths(pathsByScenario, scopeIds)
    // `pathsByScenario` by identity, deliberately, and not `pathsKey` alone:
    // that key is built from path *ids*, so a rename leaves it unchanged and
    // the effect would never re-run — the catalog would keep the old name for
    // the life of the session, which is exactly the staleness the signature
    // comparison in `mergeCatalog` exists to catch. The refetched map is a new
    // object, so identity is the signal that new data arrived. `syncScenarioPaths`
    // is idempotent and bails when nothing changed, so the extra runs are free.
  }, [pathsByScenario, pathsKey, scopeIds, syncScenarioPaths])

  return {
    selections,
    getSelectedPathIds,
    togglePathSelection,
    togglePathKey,
    activePathKeys,
  }
}

/** Scenario-detail selection bound to the shared store for that scenario id. */
export function usePathSelection(
  scenarioId: string | undefined,
  paths: PathListItem[],
) {
  const {
    getSelectedPathIds,
    togglePathSelection: toggleForScenario,
    setSelectedPathIds: setForScenario,
    syncScenarioPaths,
  } = usePathSelectionContext()

  const pathsKey = useMemo(() => pathIdsKey(paths), [paths])

  useLayoutEffect(() => {
    if (!scenarioId || paths.length === 0) return
    syncScenarioPaths(new Map([[scenarioId, paths]]))
  }, [scenarioId, paths, pathsKey, syncScenarioPaths])

  const selectedPathIds = scenarioId ? getSelectedPathIds(scenarioId) : []

  const togglePathSelection = useCallback(
    (pathId: string) => {
      if (!scenarioId) return
      toggleForScenario(scenarioId, pathId)
    },
    [scenarioId, toggleForScenario],
  )

  const setSelectedPathIds = useCallback(
    (pathIds: string[] | ((prev: string[]) => string[])) => {
      if (!scenarioId) return
      if (typeof pathIds === 'function') {
        setForScenario(scenarioId, pathIds(getSelectedPathIds(scenarioId)))
        return
      }
      setForScenario(scenarioId, pathIds)
    },
    [scenarioId, setForScenario, getSelectedPathIds],
  )

  return { selectedPathIds, setSelectedPathIds, togglePathSelection }
}
