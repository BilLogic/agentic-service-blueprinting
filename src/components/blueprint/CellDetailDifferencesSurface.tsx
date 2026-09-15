import { CompareDifferencesSurface } from '@/components/blueprint/CompareDifferencesSurface'
import { PanelHeader } from '@/components/blueprint/panelShell'
import { PanelSurfaceSwitcher } from '@/components/blueprint/PanelSurfaceSwitcher'
import type { BlueprintPanelSurface } from '@/contexts/BlueprintCellDetailContext'
import type { CompareReviewRegistration } from '@/lib/compareReviewStore'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import type { ReactNode } from 'react'

/**
 * The Differences surface — the compare ledger, a true sibling of the
 * cell-detail view inside the same drawer. Needs no selection, which is why
 * it takes no cell: the panel routes to it on surface alone.
 */
export function CellDetailDifferencesSurface({
  comparing,
  registration,
  expandToggle,
  onSurfaceChange,
  onClose,
  onOpenCell,
}: {
  comparing: boolean
  registration: CompareReviewRegistration | null
  expandToggle: ReactNode
  onSurfaceChange: (surface: BlueprintPanelSurface) => void
  onClose: () => void
  onOpenCell: (selection: BlueprintCellSelection) => void
}) {
  return (
    <>
      <PanelHeader
        banded
        title="Path differences"
        description="Every difference between the compared paths, grouped by step"
        lead={
          comparing ? (
            <PanelSurfaceSwitcher
              value="differences"
              onValueChange={onSurfaceChange}
            />
          ) : (
            <span className="min-w-0 text-sm font-semibold text-foreground">
              Differences
            </span>
          )
        }
        actions={expandToggle}
        closeLabel="Close the difference ledger"
        closeAriaLabel="Close differences"
        onClose={onClose}
      />
      {registration ? (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          <CompareDifferencesSurface
            registration={registration}
            onOpenCell={onOpenCell}
          />
        </div>
      ) : (
        // Reachable only during the exit animation after a comparison
        // ended — the provider is already routing panelState away.
        <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-8">
          <p className="text-center text-xs text-muted-foreground">
            No comparison is active.
          </p>
        </div>
      )}
    </>
  )
}
