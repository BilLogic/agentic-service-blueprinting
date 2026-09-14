import { X } from 'lucide-react'
import { CompareDifferencesSurface } from '@/components/blueprint/CompareDifferencesSurface'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
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
      <DrawerHeader className="flex-row items-center justify-between gap-2 border-b border-muted px-4 py-2 text-left">
        <DrawerTitle className="sr-only">Path differences</DrawerTitle>
        <DrawerDescription className="sr-only">
          Every difference between the compared paths, grouped by step
        </DrawerDescription>
        {comparing ? (
          <PanelSurfaceSwitcher
            value="differences"
            onValueChange={onSurfaceChange}
          />
        ) : (
          <span className="min-w-0 text-sm font-semibold text-foreground">
            Differences
          </span>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {expandToggle}
          <IconTooltip label="Close the difference ledger" side="left">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Close differences"
              onClick={onClose}
            >
              <X />
            </Button>
          </IconTooltip>
        </div>
      </DrawerHeader>
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
