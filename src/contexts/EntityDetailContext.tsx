import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import {
  claimPanel,
  getPanelOwner,
  releasePanel,
  subscribePanelOwner,
} from '@/lib/openPanelStore'

/**
 * The levels of the tree that own spec fields and are not a cell.
 *
 * `service` joined on 2026-08-21 when the tier was unpinned. It is the only
 * member whose `id` the opener does not need to know — there is one service —
 * but it carries one anyway so every member of the union has the same shape.
 */
export type EntityDetailKind =
  | 'service'
  | 'lane'
  | 'phase'
  | 'scenario'
  | 'step'

export type EntityDetailSelection = {
  kind: EntityDetailKind
  /** The row's id — the panel reads everything else from the database. */
  id: string
}

type EntityDetailContextValue = {
  selection: EntityDetailSelection | null
  openEntity: (selection: EntityDetailSelection) => void
  /**
   * Open it, or close it if it is already the one open.
   *
   * The canvas's own grammar: a bare click on the cell the panel is showing
   * closes it. An affordance that only ever opens leaves the reader hunting
   * for the ✕ after every glance.
   */
  toggleEntity: (selection: EntityDetailSelection) => void
  closeEntity: () => void
  isOpen: boolean
}

const EntityDetailContext = createContext<EntityDetailContextValue | null>(null)

export function EntityDetailProvider({
  children,
  /** Clears the open panel when the active scenario or slide changes. */
  resetKey,
}: {
  children: ReactNode
  resetKey?: string
}) {
  const [selection, setSelection] = useState<EntityDetailSelection | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate reset-on-key: the entity a panel is describing may not exist in the new workspace
    setSelection(null)
  }, [resetKey])

  const openEntity = useCallback((next: EntityDetailSelection) => {
    claimPanel('entity')
    setSelection(next)
  }, [])

  const toggleEntity = useCallback(
    (next: EntityDetailSelection) => {
      setSelection((current) => {
        if (current && current.kind === next.kind && current.id === next.id) {
          releasePanel('entity')
          return null
        }
        claimPanel('entity')
        return next
      })
    },
    [],
  )

  const closeEntity = useCallback(() => {
    setSelection(null)
    releasePanel('entity')
  }, [])

  // One panel at a time: when the cell panel takes the drawer, this one drops
  // its selection. Render-phase guarded set, the codebase's
  // derive-during-render idiom — and only the selection, because ownership has
  // already moved and releasing it here would take the drawer away from the
  // panel that just claimed it.
  const owner = useSyncExternalStore(subscribePanelOwner, getPanelOwner)
  if (owner !== 'entity' && selection !== null) setSelection(null)

  const value = useMemo<EntityDetailContextValue>(
    () => ({
      selection,
      openEntity,
      toggleEntity,
      closeEntity,
      isOpen: selection !== null,
    }),
    [selection, openEntity, toggleEntity, closeEntity],
  )

  return (
    <EntityDetailContext.Provider value={value}>
      {children}
    </EntityDetailContext.Provider>
  )
}

/**
 * Read the entity panel. Returns a closed, inert value outside the provider so
 * an affordance can sit on chrome that renders in both the canvas and the
 * places the provider does not reach, without every call site guarding.
 */
export function useEntityDetail(): EntityDetailContextValue {
  const value = useContext(EntityDetailContext)
  return value ?? INERT
}

const INERT: EntityDetailContextValue = {
  selection: null,
  openEntity: () => {},
  toggleEntity: () => {},
  closeEntity: () => {},
  isOpen: false,
}
