import { useState } from 'react'
import {
  STEP_PANEL_FOOTER_ID,
  Field,
  PanelFooterControls,
  PanelFooterHost,
  PanelHeader,
  PanelIdentity,
  PanelKindBadge,
} from '@/components/blueprint/panelShell'
import { StepPanelLoading } from '@/components/blueprint/panelLoading'
import { PanelTextareaField } from '@/components/blueprint/PanelTextareaField'
import { PanelSectionLabel } from '@/components/blueprint/PanelSectionLabel'
import { PANEL_TERMS } from '@/lib/panelTerms'
import { PANEL_TEXT } from '@/lib/panelText'
import { cn } from '@/lib/utils'
import { useStepSpec, type StepSpec } from '@/hooks/useStepSpec'
import { usePanelFooterHost } from '@/hooks/usePanelFooterHost'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { invalidateCanvasBlueprintsForScenario } from '@/hooks/useCanvasBlueprints'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { updateStepSummary } from '@/lib/stepSpecMutations'

/**
 * The step: one moment, read across every lane.
 *
 * `summary` is the only editable field, and it is the one the storyboard row
 * has always needed — the sentence that makes a column legible without
 * reading five cells. The storyboard row itself stays pictures only, so this
 * panel is where that sentence is read and written, and it is why a
 * storyboard cell opens here rather than into a cell panel describing some
 * other lane's text.
 */
export function StepPanel({
  stepId,
  onClose,
}: {
  stepId: string
  onClose: () => void
}) {
  const result = useStepSpec(stepId)
  const step = result.status === 'ready' ? result.data : null

  return (
    <>
      <PanelHeader
        crumbs={[step?.phaseName ?? '', step?.scenarioName ?? '']}
        title="Step properties"
        description="What this moment is, across every lane"
        closeLabel="Close step properties"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {step ? (
          <StepPanelBody key={step.id} step={step} onDone={onClose} />
        ) : result.status === 'error' ? (
          <p className="text-sm text-muted-foreground">
            That step could not be loaded: {result.message}
          </p>
        ) : (
          <StepPanelLoading />
        )}
      </div>
      <PanelFooterHost id={STEP_PANEL_FOOTER_ID} />
    </>
  )
}

function StepPanelBody({
  step,
  onDone,
}: {
  step: StepSpec
  onDone: () => void
}) {
  const { client, canWrite } = useSupabase()
  const canEdit = useCanvasModeValue() === 'design' && canWrite

  const [baseline] = useState(step.summary)
  const [summary, setSummary] = useState(baseline)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const footerHost = usePanelFooterHost(STEP_PANEL_FOOTER_ID)

  const changed = summary !== baseline

  const handleSave = async () => {
    if (!client || busy || !changed) return
    setBusy(true)
    setError(null)
    try {
      await updateStepSummary(client, step.id, summary, baseline)
      invalidateQueries(`step-spec:${step.id}`)
      // The summary is ALSO the storyboard caption, so the grid holding it is
      // now stale — this is the one panel whose save changes the canvas.
      invalidateCanvasBlueprintsForScenario(step.scenarioId)
      onDone()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That did not save.')
    } finally {
      setBusy(false)
    }
  }

  /*
    The meta line says only what a reader could not already see.
    "column 1 of 1 path" is both of those things — the column is on screen and
    the path is in the breadcrumb — so a step that sits where you would expect
    reports its cell count and nothing else. A step that sits at DIFFERENT
    columns on different paths is the one case worth a sentence, and it gets
    the list below as well.
  */
  const distinct = new Set(step.positions.map((entry) => entry.position))
  const positionLabel =
    step.positions.length === 0
      ? 'in no path yet'
      : distinct.size > 1
        ? `different columns on ${step.positions.length} paths`
        : step.positions.length > 1
          ? `${step.positions.length} paths`
          : null

  return (
    <div
      className="flex flex-col gap-4"
      data-panel-editor=""
      data-busy={busy || undefined}
    >
      <PanelIdentity
        badge={<PanelKindBadge label="Step" />}
        title={step.name}
        // Only the surprise: a step that sits at a DIFFERENT column depending
        // on the path. A cell count is bookkeeping, not something a reader of
        // this panel came for.
        meta={positionLabel ?? ''}
      />

      <PanelTextareaField
        label="Summary"
        hint="What happens in this moment, across every lane — the sentence that makes the column legible without reading five cells."
        placeholder="e.g. The student picks a slot; the system holds it 10 minutes."
        value={summary}
        rows={3}
        disabled={!canEdit}
        onChange={setSummary}
      />

      {step.frames.length > 0 ? (
        // A LABELLED field: "Storyboard" reads as plain text beside Summary,
        // not an outline badge (#307). Its definition rides the label's hint
        // popover, the touch/press affordance every other field label uses.
        <Field label="Storyboard" hint={PANEL_TERMS.storyboard}>
          {/*
            A ROW of frames, not a stack of full-width ones. A step is drawn
            once per actor lane, so three frames stacked at 4:3 pushed the
            sentence this panel exists for below the fold. Side by side they
            read as what they are — the same moment from each lane — and the
            row scrolls rather than the page.
          */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 blueprint-scroll">
            {step.frames.map((frame) => (
              <figure
                key={frame.src}
                className="flex w-32 shrink-0 flex-col gap-1"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted/20">
                  <img
                    src={frame.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-contain object-center"
                  />
                </div>
                {/* Provenance, quietly: which lane drew this frame. The
                    frame's MEANING is the summary above it. */}
                <figcaption className={cn(PANEL_TEXT.meta, 'truncate')}>
                  {frame.laneName}
                </figcaption>
              </figure>
            ))}
          </div>
        </Field>
      ) : null}

      {distinct.size > 1 ? (
        <div className="flex flex-col gap-1">
          <PanelSectionLabel>Position</PanelSectionLabel>
          <ul className="flex flex-col gap-0.5">
            {step.positions.map((entry) => (
              <li
                key={`${entry.pathName}-${entry.position}`}
                className={PANEL_TEXT.value}
              >
                <span className="font-medium text-foreground">
                  {entry.pathName}
                </span>{' '}
                · position {entry.position + 1}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
