import { useEffect, useState } from 'react'
import { ServicePanel } from '@/components/blueprint/ServicePanel'
import { LanePanel } from '@/components/blueprint/LanePanel'
import { PhasePanel } from '@/components/blueprint/PhasePanel'
import { ScenarioPanel } from '@/components/blueprint/ScenarioPanel'
import { StepPanel } from '@/components/blueprint/StepPanel'
import {
  DetailPanelErrorBoundary,
  PANEL_EXIT_MS,
  PanelDrawerShell,
} from '@/components/blueprint/panelShell'
import {
  useEntityDetail,
  type EntityDetailSelection,
} from '@/contexts/EntityDetailContext'
import { useCanvasTopOffset } from '@/hooks/useCanvasTopOffset'

/**
 * The drawer for everything that is not a cell: service, lane, phase,
 * scenario, step.
 *
 * ONE drawer for all three, at one tree position, so switching from a lane to
 * a phase is a content swap inside the open drawer rather than a close and a
 * reopen — the same guarantee the cell panel's four surfaces rely on.
 */
export function EntityDetailPanel() {
  return (
    <DetailPanelErrorBoundary
      logPrefix="entity-detail"
      message="These properties failed to display. The canvas is unaffected."
    >
      <EntityDetailPanelBody />
    </DetailPanelErrorBoundary>
  )
}

function EntityDetailPanelBody() {
  const { selection, closeEntity } = useEntityDetail()
  /*
    Kept only so the exit animation has something to draw. Captured with a
    guarded render-phase set — the codebase's derive-during-render idiom —
    and cleared when the drawer reports it has finished closing. Without it
    the panel empties instantly and then slides out blank.
  */
  const [closing, setClosing] = useState<EntityDetailSelection | null>(selection)
  if (selection && closing !== selection) setClosing(selection)

  /*
    The snapshot's other end. `onClosed` (the drawer's own completion
    callback) does not fire for this popup — measured — so the content would
    otherwise stay rendered forever behind a finished exit transition, leaving
    an invisible 320px drawer over the canvas. See PANEL_EXIT_MS.
  */
  useEffect(() => {
    if (selection !== null || closing === null) return
    const timer = window.setTimeout(() => setClosing(null), PANEL_EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [selection, closing])

  // `closing !== null` too: this hook's cleanup removes the measured top
  // variable, and running it the instant a close begins makes the panel jump
  // upward before it slides out. See the same note on the cell panel.
  useCanvasTopOffset(selection !== null || closing !== null)

  const shown = selection ?? closing
  /*
    Nothing open and nothing leaving: render NOTHING, so the drawer mounts
    with `open` already true the next time one is selected. That is what the
    cell panel does (`if (activeSurface === null) return null`) and the entry
    animation depends on it — animations.css states the pre-insertion values
    through `@starting-style` precisely because base-ui's own `starting` flag
    never fires for a root that mounts open. Rendering the shell permanently
    also left a closed drawer stuck mid-exit, still in the DOM at opacity 0.
  */
  if (shown === null) return null

  return (
    <PanelDrawerShell
      open={selection !== null}
      onCloseRequest={closeEntity}
      onClosed={() => setClosing(null)}
    >
      {shown?.kind === 'service' ? (
        <ServicePanel onClose={closeEntity} />
      ) : null}
      {shown?.kind === 'lane' ? (
        <LanePanel laneId={shown.id} onClose={closeEntity} />
      ) : null}
      {shown?.kind === 'phase' ? (
        <PhasePanel phaseId={shown.id} onClose={closeEntity} />
      ) : null}
      {shown?.kind === 'scenario' ? (
        <ScenarioPanel scenarioId={shown.id} onClose={closeEntity} />
      ) : null}
      {shown?.kind === 'step' ? (
        <StepPanel stepId={shown.id} onClose={closeEntity} />
      ) : null}
    </PanelDrawerShell>
  )
}
