import { CellPanelEditor } from '@/components/blueprint/CellPanelEditor'
import { PanelHeader } from '@/components/blueprint/panelShell'
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
      <PanelHeader
        title="New cell"
        titleShown
        description={[
          draft.phaseName,
          draft.scenarioName,
          `${draft.stepIndex + 1}. ${draft.stepName}`,
        ]
          .filter(Boolean)
          .join(' · ')}
        descriptionShown
        closeLabel="Discard this new cell"
        closeAriaLabel="Discard new cell"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {laneBadge}
        <CellPanelEditor cellId={null} draft={draft} onDone={onClose} />
      </div>
    </>
  )
}
