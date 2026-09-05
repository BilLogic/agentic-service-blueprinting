import { useState } from 'react'
import {
  PHASE_PANEL_FOOTER_ID,
  PanelFooterControls,
  PanelFooterHost,
  PanelHeader,
  PanelIdentity,
  PanelKindBadge,
} from '@/components/blueprint/panelShell'
import { PhasePanelLoading } from '@/components/blueprint/panelLoading'
import { PanelTextareaField } from '@/components/blueprint/PanelTextareaField'
import { usePhaseSpec, type PhaseSpec } from '@/hooks/usePhaseSpec'
import { usePanelFooterHost } from '@/hooks/usePanelFooterHost'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { updatePhaseSpec } from '@/lib/phaseSpecMutations'

/**
 * The phase's properties: what this stage is, what it is worth, and what has
 * to be true for it to run.
 *
 * `business_impact` and `operational_requirements` have existed since July
 * with no way to read or write them outside SQL. Their hints are lifted
 * verbatim from the columns' own comments, which until now were the only
 * documentation either field had.
 */
export function PhasePanel({
  phaseId,
  onClose,
}: {
  phaseId: string
  onClose: () => void
}) {
  const result = usePhaseSpec(phaseId)
  const phase = result.status === 'ready' ? result.data : null

  return (
    <>
      <PanelHeader
        // The ancestor, not the kind: "Phase" is the badge's job now, and a
        // crumb that repeated the heading below it said nothing.
        crumbs={[phase?.serviceName ?? '']}
        title="Phase properties"
        description="Summary, business impact and operational requirements"
        closeLabel="Close phase properties"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {phase ? (
          <PhasePanelBody key={phase.id} phase={phase} onDone={onClose} />
        ) : result.status === 'error' ? (
          <p className="text-sm text-muted-foreground">
            That phase could not be loaded: {result.message}
          </p>
        ) : (
          <PhasePanelLoading />
        )}
      </div>
      <PanelFooterHost id={PHASE_PANEL_FOOTER_ID} />
    </>
  )
}

type FormState = {
  summary: string
  businessImpact: string
  operationalRequirements: string
}

function PhasePanelBody({
  phase,
  onDone,
}: {
  phase: PhaseSpec
  onDone: () => void
}) {
  const { client, canWrite } = useSupabase()
  const canEdit = useCanvasModeValue() === 'design' && canWrite

  // Frozen at mount — see the cell editor: a revert landing mid-edit would
  // otherwise let Save write the reverted values straight back.
  const [baseline] = useState<FormState>({
    summary: phase.summary,
    businessImpact: phase.businessImpact,
    operationalRequirements: phase.operationalRequirements,
  })
  const [form, setForm] = useState<FormState>(baseline)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const footerHost = usePanelFooterHost(PHASE_PANEL_FOOTER_ID)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const changed =
    form.summary !== baseline.summary ||
    form.businessImpact !== baseline.businessImpact ||
    form.operationalRequirements !== baseline.operationalRequirements

  const handleSave = async () => {
    if (!client || busy || !changed) return
    setBusy(true)
    setError(null)
    try {
      await updatePhaseSpec(client, phase.id, form, baseline)
      invalidateQueries(`phase-spec:${phase.id}`)
      // `phases.summary` is also cached under `service-phases`, which feeds the
      // overview, the phase menubar and the sticky header. Without this the
      // drawer shows the new sentence and everything around it shows the old
      // one until a reload.
      invalidateQueries('service-phases')
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-4"
      data-panel-editor=""
      data-busy={busy || undefined}
    >
      <PanelIdentity
        badge={<PanelKindBadge label="Phase" />}
        title={phase.name}
        // The scenarios are in the sidebar; the loop is the one relationship
        // a reader cannot see from the canvas.
        meta={phase.loopsToName ? `Loops back to ${phase.loopsToName}` : ''}
      />

      <PanelTextareaField
        label="Summary"
        hint="What this stage of the service is."
        value={form.summary}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('summary', next)}
      />
      <PanelTextareaField
        label="Business impact"
        // Verbatim from the column comment — the only documentation this
        // field has ever had.
        hint="Commercial impact notes: opex, NPS, brand, retention, growth."
        value={form.businessImpact}
        disabled={!canEdit}
        onChange={(next) => set('businessImpact', next)}
      />
      <PanelTextareaField
        label="Operational requirements"
        hint="Process / system / people / legal requirements for this phase."
        value={form.operationalRequirements}
        disabled={!canEdit}
        onChange={(next) => set('operationalRequirements', next)}
      />

      {canEdit ? (
        <PanelFooterControls
          footerHost={footerHost}
          busy={busy}
          changed={changed}
          error={error}
          onSave={handleSave}
          onCancel={onDone}
        />
      ) : null}
    </div>
  )
}
