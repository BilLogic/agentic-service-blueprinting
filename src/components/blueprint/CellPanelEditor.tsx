import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { OwnerTagSelect } from '@/components/blueprint/OwnerTagSelect'
import { invalidateCanvasBlueprintsForPath } from '@/hooks/useCanvasBlueprints'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCellContent } from '@/hooks/useCellContent'
import { useCellSpec } from '@/hooks/useCellSpec'
import { useValueAudiences } from '@/hooks/useValueAudiences'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { upsertCell } from '@/lib/authoringRpc'
import {
  CELL_CONTENT_TARGET,
  CELL_CONTENT_WARNING,
  TECH_PILL_LABEL_TARGET,
  TECH_PILL_LABEL_WARNING,
} from '@/lib/cellContentLimits'
import { parseCellContentItems } from '@/lib/parseCellContent'
import { updateCellContent } from '@/lib/cellContentMutations'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import { parseValueProps, type ValueProp } from '@/lib/valueProps'
import { cn } from '@/lib/utils'

/**
 * The one place the panel's Save and Cancel live: a host element pinned to
 * the drawer's bottom edge, below the scroll region and the tabs. The form
 * portals its buttons here so they read as controls for the whole panel —
 * one Save for everything on it — instead of a row buried mid-scroll.
 */
export const CELL_PANEL_FOOTER_ID = 'cell-panel-editor-footer'

/** Where a not-yet-created cell would go — the draft the editor writes on Save. */
export type DraftCellTarget = {
  pathId: string
  layerId: string
  stepId: string
  layerName: string
  stepName: string
  stepIndex: number
  scenarioName?: string
  phaseName?: string
}

/** Label with its explanation folded into a hover tooltip, not inline text. */
function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string
  hint?: string
  /** Draws the asterisk — the only signal a field cannot be left empty. */
  required?: boolean
  children: React.ReactNode
}) {
  const labelText = (
    <span className="w-fit text-2xs font-medium text-muted-foreground">
      {label}
      {required ? <span className="ml-0.5 text-destructive">*</span> : null}
    </span>
  )
  return (
    <div className="flex flex-col gap-1">
      {hint ? (
        <Tooltip>
          <TooltipTrigger render={labelText} />
          <TooltipContent side="left">{hint}</TooltipContent>
        </Tooltip>
      ) : (
        labelText
      )}
      {children}
    </div>
  )
}

type FormState = {
  text: string
  description: string
  owner: string
  perceivedOwner: string
  functionText: string
  formText: string
  valueProps: ValueProp[]
}

/**
 * The whole cell in one form, one Save.
 *
 * This replaced two stacked editors (text/owners and function/form/value)
 * that each carried their own Save and Cancel — four buttons for one cell,
 * and a Save that only saved half of what was on screen. Here Save writes
 * everything that changed and Cancel discards everything, at page level.
 *
 * Two modes share the form: editing an existing cell, and a **draft** — a
 * cell that does not exist yet. The draft writes *nothing* until Save; a
 * cancelled draft never touches the database. That is the fix for creation
 * feeling broken: the row used to be written first and filled in later.
 */
export function CellPanelEditor({
  cellId,
  draft,
  layerName,
  fallbackDescription = '',
  onDone,
}: {
  /** Existing cell to edit; null when creating from a draft target. */
  cellId: string | null
  draft?: DraftCellTarget
  /** Selects narrative-copy versus technology-label guidance. */
  layerName?: string
  /**
   * What the panel displays as this cell's description when the column is
   * empty (tech cells keep prose in `links`). Seeded into the field so the
   * editor shows the same text the reader saw — saving moves it into the
   * column, which takes precedence from then on.
   */
  fallbackDescription?: string
  onDone: () => void
}) {
  const { configured } = useSupabase()
  const contentResult = useCellContent(configured && cellId ? cellId : null)
  const specResult = useCellSpec(configured && cellId ? cellId : null)

  if (cellId) {
    if (contentResult.status === 'loading' || specResult.status === 'loading') {
      return null
    }
    if (contentResult.status === 'error' || specResult.status === 'error') {
      return (
        <p className="text-xs text-destructive">
          This cell's fields could not be loaded — close the panel and try
          again.
        </p>
      )
    }
    const content = contentResult.data
    const spec = specResult.data
    if (!content) return null

    const baseline: FormState = {
      text: content.content,
      // The DB truth. The *field* may be seeded with the links-derived
      // fallback below, but diffs and reverts compare against this — an
      // owner-only edit must not smuggle the fallback prose into the
      // description column, and undo must restore what the DB actually held.
      description: content.description ?? '',
      owner: content.owner ?? '',
      perceivedOwner: content.perceived_owner ?? '',
      functionText: spec?.function ?? '',
      formText: spec?.form ?? '',
      valueProps: parseValueProps(spec?.value_props ?? null),
    }

    return (
      <CellPanelEditorForm
        key={cellId}
        cellId={cellId}
        draft={undefined}
        layerName={layerName}
        baseline={baseline}
        seededDescription={content.description ?? fallbackDescription}
        onDone={onDone}
      />
    )
  }

  if (!draft) return null
  return (
    <CellPanelEditorForm
      key={`${draft.layerId}:${draft.stepId}`}
      cellId={null}
      draft={draft}
      layerName={layerName ?? draft.layerName}
      baseline={{
        text: '',
        description: '',
        owner: '',
        perceivedOwner: '',
        functionText: '',
        formText: '',
        valueProps: [],
      }}
      seededDescription=""
      onDone={onDone}
    />
  )
}

function CellPanelEditorForm({
  cellId,
  draft,
  layerName,
  baseline: baselineProp,
  seededDescription,
  onDone,
}: {
  cellId: string | null
  draft: DraftCellTarget | undefined
  layerName: string | undefined
  baseline: FormState
  seededDescription: string
  onDone: () => void
}) {
  const { client } = useSupabase()
  const audiencesResult = useValueAudiences()
  const audiences =
    audiencesResult.status === 'ready' ? audiencesResult.data : []
  // The footer host mounts in the same commit as this form; looked up once
  // after mount so the portal lands below the scroll region.
  const [footerHost, setFooterHost] = useState<HTMLElement | null>(null)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot DOM lookup of the portal host; it only exists after the panel's first commit
    setFooterHost(document.getElementById(CELL_PANEL_FOOTER_ID))
  }, [])
  /*
    Frozen at mount (state initializer, never re-set). The props keep
    tracking the live query — a ⌘Z revert of this same cell refetches it
    and changes them mid-edit — but the form's diff and its captured
    `previous` must speak about the world as it was when editing began, or
    Save quietly writes reverted values back.
  */
  const [baseline] = useState(baselineProp)
  const [form, setForm] = useState<FormState>({
    ...baseline,
    description: seededDescription,
  })
  // Only a deliberate edit persists the seeded fallback prose into the
  // description column; an untouched field keeps whatever the DB held.
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A save that resolves after this form unmounted (the user switched
  // cells) must not call onDone — that would slam shut whatever panel they
  // are reading now.
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])
  // A draft that created its row but failed a later write resumes on retry
  // instead of upserting a second time (which would log a second "Added a
  // cell" whose revert deletes the same row).
  const [createdId, setCreatedId] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const blocked = !form.text.trim()
  const isTechCell =
    layerName === 'Front Stage Tech' || layerName === 'Back Stage Tech'
  const techItems = isTechCell ? parseCellContentItems(form.text) : []
  const longestTechItem = techItems.reduce(
    (longest, item) => Math.max(longest, item.length),
    0,
  )
  const contentTarget = isTechCell
    ? TECH_PILL_LABEL_TARGET
    : CELL_CONTENT_TARGET
  const contentWarning = isTechCell
    ? TECH_PILL_LABEL_WARNING
    : CELL_CONTENT_WARNING
  const measuredLength = isTechCell ? longestTechItem : form.text.length
  const overContentWarning = measuredLength > contentWarning

  const effectiveDescription = descriptionTouched
    ? form.description
    : baseline.description
  const contentChanged =
    form.text !== baseline.text ||
    effectiveDescription !== baseline.description ||
    form.owner !== baseline.owner ||
    form.perceivedOwner !== baseline.perceivedOwner
  const specChanged =
    form.functionText !== baseline.functionText ||
    form.formText !== baseline.formText ||
    JSON.stringify(form.valueProps) !== JSON.stringify(baseline.valueProps)

  const handleSave = async () => {
    if (!client || busy || blocked) return
    setBusy(true)
    setError(null)
    try {
      let targetId = cellId ?? createdId
      const creating = targetId === null
      if (targetId === null) {
        // The draft becomes real here and only here. Cancel never writes.
        targetId = await upsertCell(client, {
          pathId: draft!.pathId,
          layerId: draft!.layerId,
          stepId: draft!.stepId,
          content: form.text.trim(),
        })
        setCreatedId(targetId)
      }

      const draftExtras =
        !cellId &&
        Boolean(
          form.description.trim() ||
            form.owner.trim() ||
            form.perceivedOwner.trim(),
        )
      if ((cellId && contentChanged) || (!cellId && (draftExtras || !creating))) {
        await updateCellContent(
          client,
          targetId,
          {
            content: form.text,
            description: cellId ? effectiveDescription : form.description,
            owner: form.owner,
            perceivedOwner: form.perceivedOwner,
          },
          cellId
            ? {
                content: baseline.text,
                description: baseline.description,
                owner: baseline.owner,
                perceivedOwner: baseline.perceivedOwner,
              }
            : undefined,
          // The create already logs "Added a cell"; its field fill-in is
          // part of the same user action, not a second change.
          { record: Boolean(cellId) },
        )
      }
      if (specChanged) {
        await updateCellSpec(
          client,
          targetId,
          {
            function: form.functionText,
            form: form.formText,
            valueProps: form.valueProps,
          },
          cellId
            ? {
                function: baseline.functionText,
                form: baseline.formText,
                valueProps: baseline.valueProps,
              }
            : undefined,
          { record: Boolean(cellId) },
        )
      }

      invalidateQueries('lifecycle-phases')
      // Content edit: only the edited path's scenario is stale (todo 029).
      // Existing-cell edits mount with draft undefined and don't know their
      // path, so they fall back to invalidating every scenario's blueprint.
      if (draft) {
        invalidateCanvasBlueprintsForPath(draft.pathId)
      } else {
        invalidateQueries('canvas-blueprints')
      }
      invalidateQueries(`cell-content:${targetId}`)
      invalidateQueries(`cell-spec:${targetId}`)
      invalidateQueries('owner-tags')
      // A save can introduce a new value audience; the autocomplete list
      // caches under its own key and never refetches on its own.
      invalidateQueries('value-audiences')
      if (aliveRef.current) onDone()
    } catch (saveError) {
      if (aliveRef.current) {
        setError(
          saveError instanceof Error ? saveError.message : String(saveError),
        )
      }
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-cell-panel-editor=""
      // Read by the panel's dismiss paths: Escape while a save is in flight
      // must not close the drawer — "cancelled" a beat after clicking Create
      // would otherwise materialize the cell into a panel-less silence.
      data-busy={busy || undefined}
    >
      <Field label="Text" hint="What this cell says on the grid." required>
        <Input
          value={form.text}
          autoFocus={cellId === null}
          onChange={(event) => set('text', event.target.value)}
        />
        <p
          className={cn(
            'text-3xs',
            overContentWarning ? 'text-warning-600' : 'text-muted-foreground',
          )}
          data-cell-content-guidance=""
        >
          {isTechCell
            ? `${measuredLength} characters in the longest pill · ${contentTarget} recommended per label${overContentWarning ? ` · review above ${contentWarning}` : ''}`
            : `${measuredLength} characters · ${contentTarget} recommended${overContentWarning ? ` · review above ${contentWarning}` : ''}`}
        </p>
      </Field>

      {/* "Summary", not "Description": it is the tl;dr that consolidates
          what the detailed fields (function, form, value) spell out. The
          column stays `description` — a label rename is not a migration. */}
      <Field label="Summary" hint="The tl;dr — what the detailed fields below add up to.">
        <textarea
          value={form.description}
          rows={3}
          onChange={(event) => {
            setDescriptionTouched(true)
            set('description', event.target.value)
          }}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Owner" hint="The team accountable for this moment.">
          <OwnerTagSelect
            value={form.owner}
            ariaLabel="Owner"
            onChange={(value) => set('owner', value)}
          />
        </Field>
        <Field
          label="Perceived owner"
          hint="Who the person on the other side thinks they are dealing with. A gap between the two is a finding."
        >
          <OwnerTagSelect
            value={form.perceivedOwner}
            ariaLabel="Perceived owner"
            onChange={(value) => set('perceivedOwner', value)}
          />
        </Field>
      </div>

      <Field label="Function" hint="What this cell has to accomplish.">
        <textarea
          value={form.functionText}
          rows={2}
          onChange={(event) => set('functionText', event.target.value)}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>
      <Field label="Form" hint="How it comes across.">
        <textarea
          value={form.formText}
          rows={2}
          onChange={(event) => set('formText', event.target.value)}
          className="w-full resize-y rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </Field>

      <Field label="Value" hint="Who gets what from it.">
        <div className="flex flex-col gap-1.5">
          {form.valueProps.map((entry, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <Input
                value={entry.for}
                placeholder="For…"
                // Suggests the audiences already in use — same tag logic as
                // owners, lighter control: a datalist suggests, never blocks.
                list="cell-value-audiences"
                className="h-7 w-24 shrink-0 text-xs"
                onChange={(event) =>
                  set(
                    'valueProps',
                    form.valueProps.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, for: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <Input
                value={entry.value}
                placeholder="…gets this"
                className="h-7 min-w-0 flex-1 text-xs"
                onChange={(event) =>
                  set(
                    'valueProps',
                    form.valueProps.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <IconTooltip label="Remove this value">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove value"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    set(
                      'valueProps',
                      form.valueProps.filter(
                        (_, itemIndex) => itemIndex !== index,
                      ),
                    )
                  }
                >
                  <X className="size-3" />
                </Button>
              </IconTooltip>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 self-start px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() =>
              set('valueProps', [...form.valueProps, { for: '', value: '' }])
            }
          >
            <Plus className="size-3" />
            Add value
          </Button>
          <datalist id="cell-value-audiences">
            {audiences.map((audience) => (
              <option key={audience} value={audience} />
            ))}
          </datalist>
        </div>
      </Field>

      {blocked ? (
        <p className="text-xs text-muted-foreground">
          A cell needs text.
        </p>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {(() => {
        const controls = (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy || blocked}
              onClick={handleSave}
            >
              {busy ? 'Saving…' : cellId ? 'Save' : 'Create cell'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onDone}
            >
              Cancel
            </Button>
          </div>
        )
        // Pinned to the drawer bottom when the host exists — shared footing
        // for everything on the panel. Inline only as a fallback.
        return footerHost ? createPortal(controls, footerHost) : controls
      })()}
    </div>
  )
}
