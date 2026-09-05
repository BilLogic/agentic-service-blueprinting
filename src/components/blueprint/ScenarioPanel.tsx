import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  SCENARIO_PANEL_FOOTER_ID,
  PanelFooterControls,
  PanelFooterHost,
  PanelHeader,
  PanelIdentity,
  PanelKindBadge,
} from '@/components/blueprint/panelShell'
import { ScenarioPanelLoading } from '@/components/blueprint/panelLoading'
import { PanelTextareaField } from '@/components/blueprint/PanelTextareaField'
import { useScenarioSpec, type ScenarioSpec } from '@/hooks/useScenarioSpec'
import { usePanelFooterHost } from '@/hooks/usePanelFooterHost'
import { invalidateQueries } from '@/hooks/useSupabaseQuery'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import {
  updatePathSpec,
  updateScenarioSummary,
} from '@/lib/scenarioSpecMutations'
import { PathKindColorKey } from '@/components/blueprint/PathKindColorKey'
import { StatusBadge } from '@/components/blueprint/StatusBadge'
import { StatusSelect } from '@/components/blueprint/StatusSelect'
import type { EntityStatus } from '@/lib/entityStatus'
import { PanelSectionLabel } from '@/components/blueprint/PanelSectionLabel'

/**
 * The scenario's properties — and the only surface its PATHS have.
 *
 * The scenario itself owns one editable field, which on its own would not earn
 * a drawer. Its paths are why this exists: 38 of them across the blueprint,
 * each owning `summary` (when this route applies) and `note` (the author's
 * aside), and a path is a label rather than a shape, so there is nowhere on
 * the canvas to hang an affordance for it.
 */
export function ScenarioPanel({
  scenarioId,
  onClose,
}: {
  scenarioId: string
  onClose: () => void
}) {
  const result = useScenarioSpec(scenarioId)
  const scenario = result.status === 'ready' ? result.data : null

  return (
    <>
      <PanelHeader
        crumbs={[scenario?.phaseName ?? '']}
        title="Scenario properties"
        description="Summary, and the paths in this scenario"
        closeLabel="Close scenario properties"
        onClose={onClose}
      />
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 blueprint-scroll">
        {scenario ? (
          /*
            Keyed on the PATH LIST, not just the scenario.

            The body freezes a baseline and a per-path form at mount, and the
            paths under a scenario are not fixed while the drawer is open: the
            canvas agent's `create_path` and `duplicate_path` both invalidate
            every query, so this panel refetches and re-renders against a
            scenario carrying a path the form has never heard of. Keyed on the
            id alone the body did not remount, and the first render of the new
            path read `form.paths[id].status` on `undefined` — a TypeError, the
            error boundary, and the whole drawer gone.

            Remounting resets any unsaved edit in the panel, which is the
            deliberate trade: a path list that changed underneath the author is
            a different form, and silently keeping half of it — some rows from
            the old baseline, some from the new — is the worse answer. The
            common case is untouched, because nothing re-keys unless a path is
            actually added or removed.
          */
          <ScenarioPanelBody
            key={`${scenario.id}:${scenario.paths.map((path) => path.id).join(',')}`}
            scenario={scenario}
            onDone={onClose}
          />
        ) : result.status === 'error' ? (
          <p className="text-sm text-muted-foreground">
            That scenario could not be loaded: {result.message}
          </p>
        ) : (
          <ScenarioPanelLoading />
        )}
      </div>
      <PanelFooterHost id={SCENARIO_PANEL_FOOTER_ID} />
    </>
  )
}

type PathForm = { summary: string; note: string; status: EntityStatus }
type FormState = {
  summary: string
  paths: Record<string, PathForm>
}

function buildBaseline(scenario: ScenarioSpec): FormState {
  return {
    summary: scenario.summary,
    paths: Object.fromEntries(
      scenario.paths.map((path) => [
        path.id,
        { summary: path.summary, note: path.note, status: path.status },
      ]),
    ),
  }
}

function ScenarioPanelBody({
  scenario,
  onDone,
}: {
  scenario: ScenarioSpec
  onDone: () => void
}) {
  const { client, canWrite } = useSupabase()
  const canEdit = useCanvasModeValue() === 'design' && canWrite

  const [baseline] = useState<FormState>(() => buildBaseline(scenario))
  const [form, setForm] = useState<FormState>(baseline)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // The first path opens; the rest are one click away and stay open once
  // opened. A scenario averages under two paths, so nothing here is a space
  // problem.
  const [openPath, setOpenPath] = useState<string[]>(
    scenario.paths[0] ? [scenario.paths[0].id] : [],
  )
  const footerHost = usePanelFooterHost(SCENARIO_PANEL_FOOTER_ID)

  const setPath = <K extends keyof PathForm>(
    pathId: string,
    key: K,
    value: PathForm[K],
  ) =>
    setForm((current) => ({
      ...current,
      paths: {
        ...current.paths,
        [pathId]: { ...current.paths[pathId], [key]: value },
      },
    }))

  /**
   * The form's row for a path, or the path's own values.
   *
   * The key on this component means the two agree on every ordinary render.
   * This is the guard for the render BETWEEN a refetch landing and the
   * remount — one frame in which `scenario.paths` is already the new list and
   * `form.paths` is still the old one. Falling back to the row's stored values
   * renders that frame correctly instead of throwing out of it.
   */
  const pathForm = (path: ScenarioSpec['paths'][number]): PathForm =>
    form.paths[path.id] ?? {
      summary: path.summary,
      note: path.note,
      status: path.status,
    }

  // Only the paths the form and the scenario BOTH know about can have been
  // edited: a path that appeared after mount has no baseline to differ from,
  // and one that disappeared has no row left to write to.
  const changedPaths = scenario.paths.filter((path) => {
    const now = form.paths[path.id]
    const was = baseline.paths[path.id]
    if (!now || !was) return false
    return (
      now.summary !== was.summary ||
      now.note !== was.note ||
      now.status !== was.status
    )
  })
  const summaryChanged = form.summary !== baseline.summary
  const changed = summaryChanged || changedPaths.length > 0

  const handleSave = async () => {
    if (!client || busy || !changed) return
    setBusy(true)
    setError(null)
    try {
      // One ledger entry per row that actually moved: the scenario and each
      // path are separate rows with separate reverts, and a single "edited the
      // scenario" entry could not put any one of them back.
      if (summaryChanged) {
        await updateScenarioSummary(
          client,
          scenario.id,
          form.summary,
          baseline.summary,
        )
      }
      for (const path of changedPaths) {
        await updatePathSpec(
          client,
          path.id,
          form.paths[path.id],
          baseline.paths[path.id],
        )
      }
      invalidateQueries(`scenario-spec:${scenario.id}`)
      // The scenario's summary is also cached under `service-phases`, which is
      // where the overview, the phase menubar and the sticky header read it.
      // Without this the drawer shows the new sentence and the canvas behind it
      // shows the old one until a reload — `staleTime` is Infinity, so nothing
      // else ever refetches it.
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
        badge={<PanelKindBadge label="Scenario" />}
        title={scenario.name}
        // The paths are listed below and the steps are the columns on screen;
        // counting them again is noise. Nothing here earns the line.
        meta=""
      />

      {/* Directly under the title. It is the scenario's own sentence — what
          this whole board is about — and a reader arrives wanting it before
          they want the routes through it. It sat under the paths on the
          argument that the paths are why the drawer exists; that was right
          about the paths and wrong about the order, because an accordion of
          six routes pushes the one sentence describing all of them out of
          sight. */}
      <PanelTextareaField
        label="Summary"
        hint="The situation this blueprint covers."
        value={form.summary}
        rows={2}
        disabled={!canEdit}
        onChange={(next) =>
          setForm((current) => ({ ...current, summary: next }))
        }
      />

      <div className="flex flex-col gap-1">
        {/* No ⓘ. It explained where the layout control ISN'T, which is a
            question nobody arrives with — and the label itself is the thing
            worth defining, so the definition hangs off the label. */}
        <PanelSectionLabel>Paths</PanelSectionLabel>
        {/* Several open at once: comparing two routes is the reason to read
            this panel, and an accordion that closes one to open the next
            makes that impossible. */}
        <Accordion multiple value={openPath} onValueChange={setOpenPath}>
          {scenario.paths.map((path) => (
            <AccordionItem key={path.id} value={path.id}>
              <AccordionTrigger className="w-full min-w-0 gap-1.5 py-2 hover:no-underline">
                {/*
                  Dot, name, status — and no type badge.

                  The dot IS the type: green for the scenario's main route, red
                  for an exception, and one of four other hues for a variant.
                  A badge beside it saying "Happy" would be that same fact a
                  second time, which is what the plain-text type here used to
                  be. The dash pattern carries it for a reader who cannot
                  separate the hues (SC 1.4.1).
                */}
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <PathKindColorKey type={path.pathKind} name={path.name} />
                  <span className="truncate text-sm font-medium text-foreground">
                    {path.name}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-3 pb-3">
                  {/* A property of the route, listed with its other
                      properties — not a badge on the header. The header is a
                      dot and a name; everything you can say ABOUT the route
                      lives inside it. */}
                  <div className="flex flex-col gap-0.5">
                    <PanelSectionLabel>Status</PanelSectionLabel>
                    <div className="flex min-w-0">
                      {canEdit ? (
                        <StatusSelect
                          value={pathForm(path).status}
                          onChange={(next) => setPath(path.id, 'status', next)}
                        />
                      ) : (
                        <StatusBadge status={pathForm(path).status} />
                      )}
                    </div>
                  </div>
                  <PanelTextareaField
                    label="Summary"
                    hint="The condition that puts someone on this route rather than one of its siblings."
                    placeholder="e.g. the student joins on time"
                    value={pathForm(path).summary}
                    rows={2}
                    disabled={!canEdit}
                    onChange={(next) => setPath(path.id, 'summary', next)}
                  />
                  {/*
                    The note is the author's aside, and it is styled quieter so
                    it can never be mistaken for a fact about the service. That
                    distinction is the whole reason the two columns both exist.
                  */}
                  <PanelTextareaField
                    label="Author note"
                    hint="An open question, provenance, working state. Not a fact about the service."
                    placeholder="e.g. confirm the 10-minute hold with ops"
                    value={pathForm(path).note}
                    rows={2}
                    disabled={!canEdit}
                    onChange={(next) => setPath(path.id, 'note', next)}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

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
