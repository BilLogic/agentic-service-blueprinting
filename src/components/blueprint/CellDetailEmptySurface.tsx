import { X } from 'lucide-react'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import type { ReactNode } from 'react'

/**
 * Details surface with nothing selected — a ledger-era state: the drawer
 * can sit open on Details after a surface switch with no cell picked.
 * A quiet placeholder rather than a vanished drawer.
 */
export function CellDetailEmptySurface({
  surfaceSwitcher,
  onClose,
}: {
  surfaceSwitcher: ReactNode
  onClose: () => void
}) {
  return (
    <>
      {surfaceSwitcher}
      <DrawerHeader className="flex-row items-center justify-between gap-2 pb-3 text-left">
        <div className="min-w-0 flex-1">
          <DrawerTitle className="min-w-0 text-sm font-semibold text-foreground">
            Cell details
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            No cell selected
          </DrawerDescription>
        </div>
        <IconTooltip label="Close cell details" side="left">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Close cell details"
            onClick={onClose}
          >
            <X />
          </Button>
        </IconTooltip>
      </DrawerHeader>
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-8">
        <p className="text-center text-xs text-muted-foreground">
          No cell selected — click a cell on the board.
        </p>
      </div>
    </>
  )
}
