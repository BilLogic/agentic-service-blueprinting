import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { OwnerTagSelect } from '@/components/blueprint/OwnerTagSelect'
import { StatusSelect } from '@/components/blueprint/StatusSelect'
import {
  CELL_PANEL_FOOTER_ID,
  Field,
  PANEL_TEXTAREA_CLASS,
} from '@/components/blueprint/panelShell'
import { usePanelFooterHost } from '@/hooks/usePanelFooterHost'
import { invalidateCanvasBlueprintsForPath } from '@/hooks/useCanvasBlueprints'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import { useBlueprintCell } from '@/hooks/useBlueprintCell'
import { useValueAudiences } from '@/hooks/useValueAudiences'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { useNameOnlyPlacements } from '@/hooks/useRegistryTouchpoints'
import { upsertCell } from '@/lib/authoringRpc'
import {
  cellBudgetKindForLane,
  getCellContentLengthGuidance,
  type CellBudgetKind,
} from '@/lib/cellContentLimits'
import { updateCellContent } from '@/lib/cellContentMutations'
import {
  DEFAULT_ENTITY_STATUS,
  type EntityStatus,
} from '@/lib/entityStatus'
import { RegistryLink } from '@/components/blueprint/RegistryLink'
import { RoleSelect } from '@/components/blueprint/RoleSelect'
import { PlacementResourcesList } from '@/components/blueprint/PlacementResourcesList'
import {
  placementSurvivesContent,
  updateTouchpointPlacement,
  type PlacementDetailColumns,
  type PlacementDetailDraft,
} from '@/lib/touchpointMutations'
import { errorMessage } from '@/lib/utils'
import type { BlueprintData, CellResource, CellTouchpoint } from '@/types/blueprint'
import { updateCellSpec } from '@/lib/cellSpecMutations'
import { parseCellContentItems } from '@/lib/parseCellContent'
import { parseValueProps, type ValueProp } from '@/lib/valueProps'

/** Where a not-yet-created cell would go — the draft the editor writes on Save. */
export type DraftCellTarget = {
  pathId: string
  laneId: string
  stepId: string
  laneName: string
  stepName: string
  stepIndex: number
  scenarioName?: string
  phaseName?: string
}

type FormState = {
  content: string
  summary: string
  owner: string
  perceivedOwner: string
  functionText: string
  formText: string
  valueProps: ValueProp[]
  /** How far along the thing this cell describes is (`cells.status`). */
  status: EntityStatus
  /**
   * The selected touchpoint's own detail, when a touchpoint was clicked to
   * open this panel. Part of the SAME form state as the cell's fields, and
   * deliberately so: the panel is showing one cell and one of its
   * placements, and two Save buttons for what a reader experiences as one
   * screen is the arrangement this editor was built to end.
   */
  placement: PlacementDetailDraft
}

/** An unmarked, unwritten placement — the state a cell with none selected sits in. */
const EMPTY_PLACEMENT: PlacementDetailDraft = {
  summary: '',
  role: null,
}

/**
 * Which per-kind budget a panel field is measured against.
 *
 * A draft names its lane; an existing cell looks the lane up on the board
 * the panel was opened from. Either missing falls through to prose, matching
 * the agent tool's fallback when it cannot see a role.
 */
function budgetKindForEditor(
  cellId: string | null,
  draft: DraftCellTarget | undefined,
  blueprints: BlueprintData[] | undefined,
): CellBudgetKind {
  if (draft) return cellBudgetKindForLane({ name: draft.laneName })
  if (!cellId || !blueprints) return cellBudgetKindForLane(null)
  for (const blueprint of blueprints) {
    const cell = blueprint.cells.find((entry) => entry.id === cellId)
    if (!cell) continue
    const lane = blueprint.lanes?.find((entry) => entry.id === cell.lane_id)
    if (lane) return cellBudgetKindForLane(lane)
  }
  return cellBudgetKindForLane(null)
}

/**
 * The columns to restore, read back out of the FROZEN baseline draft.
 *
 * Not off the `placement` prop, which keeps tracking the live query: a revert
 * of this same cell refetches it and changes the prop mid-edit, and an
 * inverse captured from it would then promise to restore values that were
 * already gone when editing began. Same reason the baseline is frozen at all.
 *
 * The round trip through the draft normalises an empty string to null, which
 * is the shape the column holds anyway — the read path checks for null, and
 * restoring `''` where the row had NULL would be restoring a second spelling
 * of empty that nothing else in the app writes.
 */
function placementColumns(draft: PlacementDetailDraft): PlacementDetailColumns {
  return {
    summary: draft.summary || null,
    role: draft.role,
  }
}

/**
 * The form's fields for a placement, seeded from its OWN values.
 *
 * Never from `resolveTouchpointDetail`'s resolved text, which falls back to
 * the cell's summary when the placement has none: seeding with that would
 * copy the cell's sentence onto the placement the first time anybody pressed
 * Save, and the two would then say the same thing forever without anyone
 * having decided that they should.
 */
function placementDraft(placement: CellTouchpoint): PlacementDetailDraft {
  return {
    summary: placement.summary ?? '',
    role: placement.role,
  }
}


/**
 * The whole cell in one form, one Save.
 *
 * This replaced two stacked editors (content/owners and function/form/
 * value proposition) that each carried their own Save and Cancel — four buttons for one cell,
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
  placement = null,
  placementResources = [],
  fallbackSummary = '',
  onDone,
}: {
  /** Existing cell to edit; null when creating from a draft target. */
  cellId: string | null
  draft?: DraftCellTarget
  /**
   * The touchpoint placement the panel was opened on, when a touchpoint was
   * clicked. Its detail fields join this form.
   *
   * A placement with no `id` is not editable and is passed through as absent:
   * that is a board with no database behind it, where the placements come out
   * of the bundled sample content and there is no row to write into.
   */
  placement?: CellTouchpoint | null
  /**
   * The cell's resources, from which the placement's list keeps its own. Read
   * here, written by `PlacementResourcesList` on its own button — see the
   * note at the list.
   */
  placementResources?: readonly CellResource[]
  /**
   * What the panel displays as this cell's summary when the column is
   * empty (tech cells keep prose in `links`). Seeded into the field so the
   * editor shows the same text the reader saw — saving moves it into the
   * column, which takes precedence from then on.
   */
  fallbackSummary?: string
  onDone: () => void
}) {
  const { configured } = useSupabase()
  // The whole cell, off the board the panel was opened from. Two per-cell
  // queries used to fetch nine columns here — content, summary, the owner
  // pair, the spec block — and the board query now selects every one of them,
  // so the values are in memory before the panel opens. There is no loading
  // state left to render around and no request left to fail.
  const cell = useBlueprintCell(configured && cellId ? cellId : null)
  // A placement is editable only when it has a row behind it.
  const editable = placement?.id ? placement : null

  if (cellId) {
    // Null means the board does not hold this cell, and there is nothing to
    // edit — the same case the fetch answered with no row.
    if (!cell) return null

    const baseline: FormState = {
      content: cell.content,
      // The DB truth. The *field* may be seeded with the links-derived
      // fallback below, but diffs and reverts compare against this — an
      // owner-only edit must not smuggle the fallback prose into the
      // summary column, and undo must restore what the DB actually held.
      summary: cell.summary ?? '',
      owner: cell.owner ?? '',
      perceivedOwner: cell.perceived_owner ?? '',
      functionText: cell.function ?? '',
      formText: cell.form ?? '',
      valueProps: parseValueProps(cell.value_props ?? null),
      status: cell.status ?? DEFAULT_ENTITY_STATUS,
      placement: editable ? placementDraft(editable) : EMPTY_PLACEMENT,
    }

    return (
      <CellPanelEditorForm
        // Keyed on the placement as well as the cell: clicking a second
        // touchpoint on the same cell keeps the same cell id, and without the
        // placement in the key the frozen baseline below would still describe
        // the touchpoint the author had finished with.
        key={editable ? `${cellId}:${editable.id}` : cellId}
        cellId={cellId}
        draft={undefined}
        placement={editable}
        placementResources={placementResources}
        baseline={baseline}
        seededSummary={cell.summary ?? fallbackSummary}
        onDone={onDone}
      />
    )
  }

  if (!draft) return null
  return (
    <CellPanelEditorForm
      key={`${draft.laneId}:${draft.stepId}`}
      cellId={null}
      draft={draft}
      baseline={{
        content: '',
        summary: '',
        owner: '',
        perceivedOwner: '',
        functionText: '',
        formText: '',
        valueProps: [],
        // The column's own default, so a cell created without touching the
        // control reads the same as one the importer wrote.
        status: DEFAULT_ENTITY_STATUS,
        // A cell that does not exist yet holds no placements: its touchpoints
        // come into being when its text is first saved and synced.
        placement: EMPTY_PLACEMENT,
      }}
      seededSummary=""
      placement={null}
      placementResources={[]}
      onDone={onDone}
    />
  )
}

function CellPanelEditorForm({
  cellId,
  draft,
  placement,
  placementResources,
  baseline: baselineProp,
  seededSummary,
  onDone,
}: {
  cellId: string | null
  draft: DraftCellTarget | undefined
  /** Non-null only when it carries a row id — see CellPanelEditor. */
  placement: CellTouchpoint | null
  placementResources: readonly CellResource[]
  baseline: FormState
  seededSummary: string
  onDone: () => void
}) {
  const { client } = useSupabase()
  const detail = useBlueprintCellDetailOptional()
  const audiencesResult = useValueAudiences()
  const nameOnlyResult = useNameOnlyPlacements(cellId)
  const nameOnly = nameOnlyResult.status === 'ready' ? nameOnlyResult.data : []
  const audiences =
    audiencesResult.status === 'ready' ? audiencesResult.data : []
  // The footer host mounts in the same commit as this form; looked up once
  // after mount so the portal lands below the scroll region.
  const footerHost = usePanelFooterHost(CELL_PANEL_FOOTER_ID)
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
    summary: seededSummary,
  })
  // Only a deliberate edit persists the seeded fallback prose into the
  // summary column; an untouched field keeps whatever the DB held.
  const [summaryTouched, setSummaryTouched] = useState(false)
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

  const setPlacement = <K extends keyof PlacementDetailDraft>(
    key: K,
    value: PlacementDetailDraft[K],
  ) =>
    setForm((current) => ({
      ...current,
      placement: { ...current.placement, [key]: value },
    }))

  const blocked = !form.content.trim()
  const budgetKind = budgetKindForEditor(cellId, draft, detail?.blueprints)
  const lengthGuidance = getCellContentLengthGuidance(form.content, budgetKind)

  const effectiveSummary = summaryTouched
    ? form.summary
    : baseline.summary
  const contentChanged =
    form.content !== baseline.content ||
    effectiveSummary !== baseline.summary ||
    form.owner !== baseline.owner ||
    form.perceivedOwner !== baseline.perceivedOwner ||
    form.status !== baseline.status
  const specChanged =
    form.functionText !== baseline.functionText ||
    form.formText !== baseline.formText ||
    JSON.stringify(form.valueProps) !== JSON.stringify(baseline.valueProps)
  const placementChanged =
    Boolean(placement) &&
    (form.placement.summary !== baseline.placement.summary ||
      form.placement.role !== baseline.placement.role)

  const handleSave = async () => {
    if (!client || busy || blocked) return
    setBusy(true)
    setError(null)
    try {
      let targetId = cellId ?? createdId
      const creating = targetId === null
      if (targetId === null) {
        // The draft becomes real here and only here. Cancel never writes.
        // The draft is a slot the editor already knows is empty — there is
        // no cell id — so this is the upsert's insert half. It says so itself
        // now; the id is what this caller wants either way.
        targetId = (
          await upsertCell(client, {
            pathId: draft!.pathId,
            laneId: draft!.laneId,
            stepId: draft!.stepId,
            content: form.content.trim(),
          })
        ).id
        setCreatedId(targetId)
      }

      const draftExtras =
        !cellId &&
        Boolean(
          form.summary.trim() ||
            form.owner.trim() ||
            form.perceivedOwner.trim() ||
            form.status !== DEFAULT_ENTITY_STATUS,
        )
      if ((cellId && contentChanged) || (!cellId && (draftExtras || !creating))) {
        await updateCellContent(
          client,
          targetId,
          {
            content: form.content,
            summary: cellId ? effectiveSummary : form.summary,
            owner: form.owner,
            perceivedOwner: form.perceivedOwner,
            status: form.status,
          },
          cellId
            ? {
                content: baseline.content,
                summary: baseline.summary,
                owner: baseline.owner,
                perceivedOwner: baseline.perceivedOwner,
                // The status as it stood, so the inverse restores five fields
                // and not four. `CellContentUpdate` requires it, which is what
                // makes that a compile error rather than a quiet omission.
                status: baseline.status,
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

      /*
        The placement, after the cell — and after the sync the cell's save
        runs, which is what makes the order load-bearing rather than tidy.

        `updateCellContent` calls `sync_cell_touchpoints`, and a save that
        removed this touchpoint's name from the text deletes its placement
        along with everything written about it. Writing the detail first would
        write words onto a row about to be destroyed; writing it afterwards
        without asking would fail on zero rows, on a save that did exactly
        what the author asked for. So it asks.
      */
      if (
        placement?.id &&
        placementChanged &&
        placementSurvivesContent(form.content, placement.name)
      ) {
        await updateTouchpointPlacement(
          client,
          { id: placement.id, cellId: targetId, name: placement.name },
          form.placement,
          placementColumns(baseline.placement),
        )
      }

      invalidateQueries('service-phases')
      // Content edit: only the edited path's scenario is stale.
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
        setError(errorMessage(saveError))
      }
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-panel-editor=""
      // Read by the panel's dismiss paths: Escape while a save is in flight
      // must not close the drawer — "cancelled" a beat after clicking Create
      // would otherwise materialize the cell into a panel-less silence.
      data-busy={busy || undefined}
    >
      {/*
        One card per placement the registry lacks, above the fields, because
        deciding what a name-only placement IS comes before editing the words
        around it. Unlike everything else on this form these write straight
        through — they are the placement's identity, not one of its fields —
        so they refresh the board themselves. Removing one does not close the
        panel: the panel is the cell's here, and the cell is still there.
      */}
      {cellId
        ? nameOnly.map((placement) => (
            <RegistryLink
              key={placement.id}
              placement={placement}
              cellId={cellId}
              shown={parseCellContentItems(form.content)}
              onWritten={() => {
                invalidateQueries(`name-only-placements:${cellId}`)
                invalidateQueries(`registry-touchpoints:${cellId}`)
                invalidateQueries(`cell-content:${cellId}`)
                invalidateQueries('service-phases')
                if (draft) invalidateCanvasBlueprintsForPath(draft.pathId)
                // An existing cell's panel does not know its path, so every
                // board query refetches — the way the editor's own save does.
                else invalidateQueries('canvas-blueprints')
              }}
            />
          ))
        : null}
      <Field label="Content" hint="What this cell says on the grid." required>
        <Input
          value={form.content}
          autoFocus={cellId === null}
          // Advice, not a gate. The same note the agent receives in its
          // tool result lands under this field at the same thresholds;
          // stopping the box used to contradict that (cellContentLimits).
          onChange={(event) => set('content', event.target.value)}
        />
        {lengthGuidance.message ? (
          <p role="status" className="text-2xs font-normal leading-tight text-muted-foreground">
            {lengthGuidance.message}
          </p>
        ) : null}
      </Field>

      {/*
        The placement, directly under the text that lists it.

        Enclosed and headed rather than mixed into the cell's fields, because
        these belong to a DIFFERENT thing: the cell is the moment, the
        placement is one touchpoint used at it, and the same tool at the next
        step keeps its own words. Two fields called Summary on one screen is
        exactly why the group draws a border and says whose it is.

        Directly under Content and not at the bottom because the author
        reached this panel by clicking that touchpoint. Making them scroll
        past six of the cell's fields to reach the thing they clicked is how
        an editor teaches people it is not for them.
      */}
      {placement ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-2xs font-medium text-muted-foreground">
              “{placement.name}” at this step
            </span>
            <p className="text-3xs text-muted-foreground">
              This touchpoint’s own words here. The same tool at another
              step keeps its own.
            </p>
          </div>
          <Field
            label="Summary"
            hint="What this touchpoint does at this moment — the screen, the message, the part of it being used."
          >
            <textarea
              value={form.placement.summary}
              rows={3}
              onChange={(event) => setPlacement('summary', event.target.value)}
              className={PANEL_TEXTAREA_CLASS}
            />
          </Field>
          <Field
            label="Role"
            hint="Whether the moment happens through this touchpoint or merely alongside it. Most placements are never marked, and leaving it unmarked is not the same as calling it peripheral."
          >
            <RoleSelect
              value={form.placement.role}
              aria-label="Role"
              onChange={(next) => setPlacement('role', next)}
            />
          </Field>
          {/*
            The one exception to "one Save": the list has its own. A reorder
            is a whole-list fact and featuring is one row's flag that the
            database settles in its own transaction — folding either into the
            field Save would make that button write things it cannot show as
            unsaved. The list says so on its own button.
          */}
          {placement.id && cellId ? (
            <PlacementResourcesList
              placement={{ id: placement.id, cellId, name: placement.name }}
              resources={placementResources}
            />
          ) : null}
        </div>
      ) : null}

      {/* The tl;dr that consolidates what the detailed fields (function,
          form, value proposition) spell out. Label and column are the same
          word here; references/interface-schema-map.md says which are not.
          A leftover of the description→summary rename used to sit here
          saying "Summary", not "Summary" — both halves swept. */}
      <Field label="Summary" hint="The tl;dr — what the detailed fields below add up to.">
        <textarea
          value={form.summary}
          rows={3}
          onChange={(event) => {
            setSummaryTouched(true)
            set('summary', event.target.value)
          }}
          className={PANEL_TEXTAREA_CLASS}
        />
      </Field>

      <Field
        label="Status"
        hint="How far along the thing this cell describes is, from proposed to live to on its way out."
      >
        <StatusSelect
          value={form.status}
          onChange={(next) => set('status', next)}
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
          className={PANEL_TEXTAREA_CLASS}
        />
      </Field>
      <Field label="Form" hint="How it comes across.">
        <textarea
          value={form.formText}
          rows={2}
          onChange={(event) => set('formText', event.target.value)}
          className={PANEL_TEXTAREA_CLASS}
        />
      </Field>

      <Field label="Value proposition" hint="Who gets what from it.">
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
              <IconTooltip label="Remove this value proposition">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Remove value proposition"
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
            className="self-start px-2 text-muted-foreground hover:text-foreground"
            onClick={() =>
              set('valueProps', [...form.valueProps, { for: '', value: '' }])
            }
          >
            <Plus className="size-3" />
            Add value proposition
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
          A cell needs content.
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
