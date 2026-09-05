import { useState } from 'react'
import {
  Field,
  PANEL_TEXTAREA_CLASS,
  PanelEmpty,
  PanelFooterControls,
  PanelFooterHost,
  PanelHeader,
  PanelIdentity,
  PanelKindBadge,
} from '@/components/blueprint/panelShell'
import { ServicePanelLoading } from '@/components/blueprint/panelLoading'
import { PanelSectionLabel } from '@/components/blueprint/PanelSectionLabel'
import { PanelTextareaField } from '@/components/blueprint/PanelTextareaField'
import { cn } from '@/lib/utils'
import { useServiceSpec, type ServiceSpec } from '@/hooks/useServiceSpec'
import { usePanelFooterHost } from '@/hooks/usePanelFooterHost'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import {
  ENTITY_KIND_DEFINITIONS,
  ENTITY_KIND_ORDER,
  type EntityExamples,
  type EntityKindTerm,
} from '@/lib/panelTerms'
import {
  updateBusinessModel,
  updateServiceEntityExamples,
  updateServiceSummary,
} from '@/lib/serviceSpecMutations'

export const SERVICE_PANEL_FOOTER_ID = 'service-panel-footer'

/**
 * The service's own properties — its sentence, and its business model.
 *
 * Pinned on 2026-08-20 with the service tier and unpinned on 2026-08-21. It is
 * the fourth caller of the same shell the lane, phase and scenario panels use,
 * which is the point: three callers exercised a parameterised shell as well as
 * four, and adding the fourth needed no change to it.
 *
 * No Contents tab, per the plan: the service's children are six phases already
 * listed in the sidebar, and duplicating navigation inside a properties panel
 * is noise.
 */
export function ServicePanel({ onClose }: { onClose: () => void }) {
  const result = useServiceSpec()
  const service = result.status === 'ready' ? result.data : null

  return (
    <>
      <PanelHeader
        crumbs={[]}
        title="Service properties"
        description="What this service is, and how it is funded"
        closeLabel="Close service properties"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {service ? (
          <ServicePanelBody key={service.id} service={service} onDone={onClose} />
        ) : result.status === 'error' ? (
          <p className="text-sm text-muted-foreground">
            The service could not be loaded: {result.message}
          </p>
        ) : result.status === 'ready' ? (
          // Resolved, and there is no service row. Without this branch the
          // panel falls through to the skeleton and animates forever, telling
          // the reader it is still loading something that will never arrive.
          <p className="text-sm text-muted-foreground">
            No service has been created yet.
          </p>
        ) : (
          <ServicePanelLoading />
        )}
      </div>
      <PanelFooterHost id={SERVICE_PANEL_FOOTER_ID} />
    </>
  )
}

/** The six example inputs, one per kind, blank until a deployer writes one. */
type ExamplesForm = Record<EntityKindTerm, string>

type FormState = {
  summary: string
  funding: string
  pricing: string
  deliveryCost: string
  revenueModel: string
  partners: string
  // Spells its column: `entity_examples` on `services`, one jsonb map. The
  // per-kind inputs live inside it.
  entityExamples: ExamplesForm
}

/** The stored map spread into all six inputs, blanks for the unwritten kinds. */
function buildExamplesForm(examples: EntityExamples): ExamplesForm {
  return Object.fromEntries(
    ENTITY_KIND_ORDER.map((kind) => [kind, examples[kind] ?? '']),
  ) as ExamplesForm
}

function buildBaseline(service: ServiceSpec): FormState {
  return {
    summary: service.summary,
    funding: service.funding,
    pricing: service.pricing,
    deliveryCost: service.deliveryCost,
    revenueModel: service.revenueModel,
    partners: service.partners,
    entityExamples: buildExamplesForm(service.entityExamples),
  }
}

/** Nothing an author has said about the service yet. */
function isServiceEmpty(form: FormState): boolean {
  const { entityExamples, ...fields } = form
  return [...Object.values(fields), ...Object.values(entityExamples)].every(
    (value) => !value.trim(),
  )
}

function ServicePanelBody({
  service,
  onDone,
}: {
  service: ServiceSpec
  onDone: () => void
}) {
  const { client, canWrite } = useSupabase()
  const canEdit = useCanvasModeValue() === 'design' && canWrite

  // Frozen at mount, like every other panel: the query keeps tracking the
  // database, and a revert landing mid-edit would let Save write it back.
  const [baseline] = useState<FormState>(buildBaseline(service))
  const [form, setForm] = useState<FormState>(baseline)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const footerHost = usePanelFooterHost(SERVICE_PANEL_FOOTER_ID)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const setExample = (kind: EntityKindTerm, value: string) =>
    setForm((current) => ({
      ...current,
      entityExamples: { ...current.entityExamples, [kind]: value },
    }))

  const summaryChanged = form.summary !== baseline.summary
  const modelChanged =
    form.funding !== baseline.funding ||
    form.pricing !== baseline.pricing ||
    form.deliveryCost !== baseline.deliveryCost ||
    form.revenueModel !== baseline.revenueModel ||
    form.partners !== baseline.partners
  const examplesChanged = ENTITY_KIND_ORDER.some(
    (kind) => form.entityExamples[kind] !== baseline.entityExamples[kind],
  )
  const changed = summaryChanged || modelChanged || examplesChanged

  if (isServiceEmpty(baseline) && !canEdit) {
    return <PanelEmpty subject="service" />
  }

  const handleSave = async () => {
    if (!client || busy || !changed) return
    setBusy(true)
    setError(null)
    try {
      // Two rows, two ledger entries — the summary and the business model
      // revert separately, and one "edited the service" entry could not put
      // either back on its own.
      if (summaryChanged) {
        await updateServiceSummary(
          client,
          service.id,
          form.summary,
          baseline.summary,
        )
      }
      if (modelChanged) {
        await updateBusinessModel(client, service.id, form, baseline)
      }
      // The six examples are one column, one ledger entry — a third row on the
      // service, reverting on its own like the summary and the model do.
      if (examplesChanged) {
        await updateServiceEntityExamples(
          client,
          service.id,
          form.entityExamples,
          baseline.entityExamples,
        )
      }
      invalidateQueries(`service-spec:first`)
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
        badge={<PanelKindBadge label="Service" />}
        title={service.name}
        // The one relationship a reader cannot see from the canvas: how much
        // board there is. The phases themselves are in the sidebar.
        meta={`${service.phaseCount} phases · ${service.scenarioCount} scenarios`}
      />

      <PanelTextareaField
        label="Summary"
        hint="What this service is, in the words a newcomer needs."
        value={form.summary}
        rows={3}
        disabled={!canEdit}
        onChange={(next) => set('summary', next)}
      />

      <PanelTextareaField
        label="Funding"
        hint="Where the money to run it comes from."
        value={form.funding}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('funding', next)}
      />
      <PanelTextareaField
        label="Pricing"
        hint="What the recipient pays, if anything."
        value={form.pricing}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('pricing', next)}
      />
      <PanelTextareaField
        label="Delivery cost"
        hint="What one unit of the service costs to deliver."
        value={form.deliveryCost}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('deliveryCost', next)}
      />
      <PanelTextareaField
        label="Revenue model"
        hint="How it sustains itself over time."
        value={form.revenueModel}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('revenueModel', next)}
      />
      <PanelTextareaField
        label="Partners"
        hint="Who outside the organisation it depends on."
        value={form.partners}
        rows={2}
        disabled={!canEdit}
        onChange={(next) => set('partners', next)}
      />

      {/*
        The six examples, authored here and nowhere else (#302). Path has no
        detail panel of its own, so a per-kind edit home would leave its
        example homeless; one section on the service is where all six live. The
        input labels are the KIND names — they name a kind, not a column, so
        they carry no interface→schema row; the section heading "Examples" is
        the one label bound to `services.entity_examples`.
      */}
      <PanelSectionLabel>Examples</PanelSectionLabel>
      {ENTITY_KIND_ORDER.map((kind) => (
        <ServiceExampleField
          key={kind}
          kind={kind}
          value={form.entityExamples[kind]}
          disabled={!canEdit}
          onChange={(next) => setExample(kind, next)}
        />
      ))}

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

/**
 * One example input, labelled by its kind.
 *
 * A `Field` with the same textarea treatment `PanelTextareaField` gives every
 * other field here — not `PanelTextareaField` itself, because its label would
 * have to be the KIND name as a literal, and a literal label on a scanned
 * component is read as a column binding by
 * `scripts/tests/labels-name-their-columns.test.mjs`. The kind is not a column;
 * the one label that names one is the "Examples" section heading. So the kind
 * name arrives as an expression on a `Field` wrapping its own children, the
 * shape that check reads as "not a column label".
 */
function ServiceExampleField({
  kind,
  value,
  disabled,
  onChange,
}: {
  kind: EntityKindTerm
  value: string
  disabled: boolean
  onChange: (next: string) => void
}) {
  const term = ENTITY_KIND_DEFINITIONS[kind]

  return (
    <Field
      label={term.label}
      hint={`An example ${term.label.toLowerCase()} from this service, shown under its definition.`}
    >
      {disabled ? (
        <p className="text-sm whitespace-pre-wrap text-foreground/80">
          {value || <span className="text-muted-foreground">Not specified.</span>}
        </p>
      ) : (
        <textarea
          value={value}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
          className={cn(PANEL_TEXTAREA_CLASS, 'focus-visible:ring-inset')}
        />
      )}
    </Field>
  )
}
