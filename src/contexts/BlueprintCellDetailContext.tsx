import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import type { BlueprintData } from '@/types/blueprint'

type BlueprintCellDetailContextValue = {
  enabled: boolean
  blueprints: BlueprintData[]
  selection: BlueprintCellSelection | null
  selectCell: (selection: BlueprintCellSelection) => void
  clearSelection: () => void
  isOpen: boolean
}

const BlueprintCellDetailContext =
  createContext<BlueprintCellDetailContextValue | null>(null)

type BlueprintCellDetailProviderProps = {
  children: ReactNode
  /** Clears the open panel when the active scenario or slide changes. */
  resetKey?: string
  enabled?: boolean
  blueprints?: BlueprintData[]
}

export function BlueprintCellDetailProvider({
  children,
  resetKey,
  enabled = false,
  blueprints = [],
}: BlueprintCellDetailProviderProps) {
  const [selection, setSelection] = useState<BlueprintCellSelection | null>(null)

  useEffect(() => {
    setSelection(null)
  }, [resetKey])

  const selectCell = useCallback((next: BlueprintCellSelection) => {
    setSelection(next)
  }, [])

  const clearSelection = useCallback(() => {
    setSelection(null)
  }, [])

  const value = useMemo(
    () => ({
      enabled,
      blueprints,
      selection,
      selectCell,
      clearSelection,
      isOpen: enabled && selection !== null,
    }),
    [enabled, blueprints, selection, selectCell, clearSelection],
  )

  return (
    <BlueprintCellDetailContext.Provider value={value}>
      {children}
    </BlueprintCellDetailContext.Provider>
  )
}

export function useBlueprintCellDetail() {
  const context = useContext(BlueprintCellDetailContext)
  if (!context) {
    throw new Error(
      'useBlueprintCellDetail must be used within BlueprintCellDetailProvider',
    )
  }
  return context
}

export function useBlueprintCellDetailOptional() {
  return useContext(BlueprintCellDetailContext)
}
