import { useCallback, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery, invalidateStructure } from '@/hooks/useSupabaseQuery'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { createScenario } from '@/lib/authoringRpc'
import { clientToDbViewType } from '@/lib/viewTypeVocabulary'
import {
  DEFAULT_LANE_SET,
  VIEW_TYPE_LABELS,
  MAX_STEP_COUNT,
  MIN_STEP_COUNT,
  VIEW_TYPES,
  VIEW_TYPE_HINTS,
  laneSetFor,
  validateDraftBlueprint,
  type DraftBlueprint,
} from '@/lib/blueprintValidation'

/** A version that lanes can be copied from, labelled by where it lives. */
type LaneSource = {
  pathId: string
  label: string
  laneCount: number
}

/**
 * Every version in the database, as somewhere to copy lanes from.
 *
 * Read rather than typed: the whole point of copying is to land on the lane
 * vocabulary that already exists, so the list has to come from what is there.
 */
function useLaneSources() {
  const fallback = useCallback((): LaneSource[] => [], [])
  return useSupabaseQuery<LaneSource[]>(
    'lane-sources',
    async (client) => {
      const { data, error } = await client
        .from('paths')
        .select(
          'id,name,layers(id),service_scenario:service_scenarios(name,phase:phases(name))',
        )
      if (error) throw new Error(error.message)
      return (data ?? [])
        .map((row) => {
          const scenario = row.service_scenario as {
            name?: string
            phase?: { name?: string } | null
          } | null
          const lanes = (row.layers as unknown[] | null) ?? []
          return {
            pathId: row.id as string,
            label: [scenario?.phase?.name, scenario?.name, row.name as string]
              .filter(Boolean)
              .join(' · '),
            laneCount: lanes.length,
          }
        })
        .filter((source) => source.laneCount > 0)
        .sort((a, b) => a.label.localeCompare(b.label))
    },
    fallback,
  )
}

const EMPTY_DRAFT: DraftBlueprint = {
  phaseId: null,
  name: '',
  // DraftBlueprint speaks DB vocabulary (it feeds `createScenario` directly),
  // so the client default crosses the write seam through the vocabulary map.
  viewType: clientToDbViewType['stacked'],
  laneSourcePathId: null,
  stepCount: 5,
  pathName: 'Happy Path',
}

/**
 * Create a scenario: where it lives, what it is called, what lanes it starts
 * with, and how many columns.
 *
 * Columns are created empty and named "Step 1…n" — naming them here would be
 * five text fields answering a question nobody can answer before they have
 * seen the grid. The lane set is the decision worth making up front, because
 * lanes are what a scenario is compared along.
 */
export function CreateBlueprintDialog({
  open,
  onOpenChange,
  onCreated,
  fixedPhaseId = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (scenarioId: string) => void
  /**
   * Set when the dialog was opened from a phase's own `+` in the sidebar.
   * The phase is then already chosen, so the picker becomes a label: asking
   * again invites answering differently from the row that was clicked.
   */
  fixedPhaseId?: string | null
}) {
  const { client } = useSupabase()
  const phases = useLifecyclePhases()
  const laneSources = useLaneSources()
  const [draft, setDraft] = useState<DraftBlueprint>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof DraftBlueprint>(
    key: K,
    value: DraftBlueprint[K],
  ) => setDraft((current) => ({ ...current, [key]: value }))

  // Adopt the phase the `+` was attached to, during render rather than in an
  // effect so the dialog never paints one frame with no phase chosen.
  const [lastFixed, setLastFixed] = useState(fixedPhaseId)
  if (lastFixed !== fixedPhaseId) {
    setLastFixed(fixedPhaseId)
    if (fixedPhaseId) setDraft((current) => ({ ...current, phaseId: fixedPhaseId }))
  }

  // Both reads are discriminated unions, so the ready branch is where the
  // rows live. An errored lane-source read is not fatal — the standard set is
  // still offered — but a phase list that never arrives is, because a
  // blueprint has to belong to a phase.
  const phaseRows = phases.phases
  const sources = laneSources.status === 'ready' ? laneSources.data : []
  const problems = validateDraftBlueprint(draft)

  const handleCreate = async () => {
    if (!client || busy || problems.length > 0 || !draft.phaseId) return
    setBusy(true)
    setError(null)
    try {
      const created = await createScenario(client, {
        phaseId: draft.phaseId,
        name: draft.name,
        viewType: draft.viewType,
        laneSourcePathId: draft.laneSourcePathId,
        laneSet: laneSetFor(draft),
        stepCount: draft.stepCount,
        pathName: draft.pathName,
      })
      invalidateStructure()
      setDraft(EMPTY_DRAFT)
      onOpenChange(false)
      onCreated?.(created.scenario_id)
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : String(createError),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setError(null)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New scenario</DialogTitle>
          <DialogDescription>
            Lanes down the side, steps across — both changeable afterwards.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-6"
          data-create-blueprint-fields=""
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Name</span>
            <Input
              value={draft.name}
              autoFocus
              placeholder="Intake Call"
              onChange={(event) => set('name', event.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Phase</span>
            {fixedPhaseId ? (
              <p className="text-sm text-foreground/80">
                {phaseRows.find(
                  (phase: { id: string; name: string }) => phase.id === fixedPhaseId,
                )?.name ?? 'This phase'}
              </p>
            ) : phaseRows.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {phases.loading
                  ? 'Loading phases…'
                  : 'No phases found — a scenario has to belong to one.'}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {phaseRows.map((phase: { id: string; name: string }) => (
                  <Button
                    key={phase.id}
                    type="button"
                    size="sm"
                    variant={draft.phaseId === phase.id ? 'default' : 'outline'}
                    className="h-7 text-xs"
                    onClick={() => set('phaseId', phase.id)}
                  >
                    {phase.name}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Layout</span>
            {/*
              Buttons rather than a ToggleGroup, matching the phase row above.
              The toggle's pressed state is `bg-muted`, which resolves to white
              in this theme — invisible on a white dialog, so the chosen layout
              could not be seen. Two selection controls side by side also have
              no business looking different from each other.
            */}
            <div className="flex flex-wrap gap-1.5">
              {VIEW_TYPES.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={draft.viewType === type ? 'default' : 'outline'}
                  className="h-7 text-xs"
                  onClick={() => set('viewType', type)}
                >
                  {VIEW_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {VIEW_TYPE_HINTS[draft.viewType]}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Lanes</span>
            <p className="text-xs text-muted-foreground">
              Copying from an existing blueprint keeps the lane names the same,
              which is what lets two blueprints be read side by side.
            </p>
            <select
              value={draft.laneSourcePathId ?? ''}
              onChange={(event) =>
                set('laneSourcePathId', event.target.value || null)
              }
              className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
              aria-label="Copy lanes from"
            >
              <option value="">
                Standard set ({DEFAULT_LANE_SET.length} lanes)
              </option>
              {sources.map((source: LaneSource) => (
                <option key={source.pathId} value={source.pathId}>
                  {source.label} ({source.laneCount})
                </option>
              ))}
            </select>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">
              First version
            </span>
            <Input
              value={draft.pathName}
              placeholder="Happy Path"
              onChange={(event) => set('pathName', event.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">Columns</span>
            <Input
              type="number"
              min={MIN_STEP_COUNT}
              max={MAX_STEP_COUNT}
              value={String(draft.stepCount)}
              onChange={(event) =>
                set('stepCount', Number.parseInt(event.target.value, 10))
              }
            />
            <span className="text-xs text-muted-foreground">
              Created empty and named Step 1–{
                Number.isInteger(draft.stepCount) ? draft.stepCount : '…'
              }. Rename them in the grid.
            </span>
          </label>

          {problems.length > 0 ? (
            <ul
              className="flex flex-col gap-1 text-xs text-muted-foreground"
              data-create-blueprint-problems=""
            >
              {problems.map((problem) => (
                <li key={problem}>· {problem}</li>
              ))}
            </ul>
          ) : null}

          {error ? (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={busy || problems.length > 0}
            onClick={handleCreate}
          >
            {busy ? 'Creating…' : 'Create blueprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
