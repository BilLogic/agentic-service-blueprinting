import { PanelHeader } from '@/components/blueprint/panelShell'
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
      <PanelHeader
        title="Cell details"
        titleShown
        description="No cell selected"
        closeLabel="Close cell details"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pb-8">
        <p className="text-center text-xs text-muted-foreground">
          No cell selected — click a cell on the board.
        </p>
      </div>
    </>
  )
}
