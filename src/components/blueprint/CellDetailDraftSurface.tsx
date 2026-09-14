import { X } from 'lucide-react'
import { CellPanelEditor } from '@/components/blueprint/CellPanelEditor'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { DraftCellTarget } from '@/components/blueprint/CellPanelEditor'
import type { ReactNode } from 'react'

/**
 * Draft creation: the panel opens on an empty slot's target and nothing is
 * written until Save. Closing the drawer (✕, Escape, Cancel) discards the
 * draft entirely — a cancelled cell never existed.
 *
 * The lane badge arrives from the panel rather than being built here: the
 * row a new cell is being written into is the same row, shown the same way,
 * as the one the saved cell sits in.
 */
export function CellDetailDraftSurface({
  draft,
  laneBadge,
  surfaceSwitcher,
  onClose,
}: {
  draft: DraftCellTarget
  laneBadge: ReactNode
  surfaceSwitcher: ReactNode
  onClose: () => void
}) {
  return (
    <>
      {surfaceSwitcher}
      <DrawerHeader className="flex-row items-center justify-between gap-2 pb-3 text-left">
        <div className="min-w-0 flex-1">
          <DrawerTitle className="min-w-0 text-sm font-semibold text-foreground">
            New cell
          </DrawerTitle>
          <DrawerDescription className="text-xs text-muted-foreground">
            {[
              draft.phaseName,
              draft.scenarioName,
              `${draft.stepIndex + 1}. ${draft.stepName}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </DrawerDescription>
        </div>
        <IconTooltip label="Discard this new cell" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Discard new cell"
            onClick={onClose}
          >
            <X />
          </Button>
        </IconTooltip>
      </DrawerHeader>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {laneBadge}
        <CellPanelEditor cellId={null} draft={draft} onDone={onClose} />
      </div>
    </>
  )
}
