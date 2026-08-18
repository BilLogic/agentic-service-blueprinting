import { useMemo, useState, type ReactNode } from 'react'
import { Check, Plus } from 'lucide-react'
import { useEditor } from '@/contexts/EditorContext'
import { usePathSelectionContext } from '@/hooks/usePathSelection'
import { NavRowAction, NavSection } from '@/components/editor/SidebarNav'
import { CreateVersionDialog } from '@/components/editor/CreateVersionDialog'
import { StructureRowContextMenu } from '@/components/editor/StructureRowMenu'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useScenarioPaths } from '@/hooks/useScenarioPaths'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  collectOverviewPathOptions,
  collectOverviewPathOptionsForScenarios,
} from '@/lib/overviewPathFilters'
import { cn } from '@/lib/utils'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'

/**
 * The PATHS disclosure, divider included — the rule that decides whether the
 * section renders lives here, so the divider can never outlive it and leave a
 * line floating under the phase list.
 *
 * Local open state (rather than a `defaultValue`) survives the section
 * hiding and coming back within one mount.
 */
function PathsSection({
  children,
  trailing,
}: {
  children: ReactNode
  trailing?: ReactNode
}) {
  const [open, setOpen] = useState(true)

  return (
    <>
      <Separator className="my-1.5" />
      <NavSection
        title="Paths"
        open={open}
        onOpenChange={setOpen}
        trailing={trailing}
      >
        {children}
      </NavSection>
    </>
  )
}

/**
 * The header `+`, and the dialog behind it.
 *
 * Scoped to the selected scenario, which is the only reason this section is on
 * screen at all — a path belongs to exactly one scenario, so there is nothing
 * to disambiguate and no picker to offer.
 */
function NewPathAction({ scenarioId }: { scenarioId: string }) {
  const { canWrite } = useSupabase()
  const mode = useCanvasModeValue()
  const [open, setOpen] = useState(false)
  const paths = useScenarioPaths(canWrite ? scenarioId : null)
  const data = paths.status === 'ready' ? paths.data : null

  // Edit mode only — creating is authoring.
  if (!canWrite || !data || mode !== 'design') return null

  return (
    <>
      <NavRowAction label={`New path in ${data.scenarioName}`} onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
      </NavRowAction>
      <CreateVersionDialog
        scenarioId={scenarioId}
        scenarioName={data.scenarioName}
        versions={data.versions}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

/**
 * Placeholder for "a scenario is selected but its path catalog has not
 * arrived yet". Distinct from the hidden state on purpose: without it the
 * section pops in mid-read as the canvas finishes loading.
 */
function PathsLoadingRows() {
  return (
    <div className="flex flex-col gap-0.5" aria-hidden>
      <Skeleton className="mx-2 my-1 h-3.5 w-28" />
      <Skeleton className="mx-2 my-1 h-3.5 w-20" />
    </div>
  )
}

function PathChecklist({
  options,
  scenarioId,
}: {
  options: PathOption[]
  scenarioId?: string
}) {
  const { activePathKeys, togglePathKey } = usePathSelectionContext()

  return (
    <ul className="flex flex-col gap-0.5">
      {options.map((option) => {
        const selected = activePathKeys.includes(option.id)
        // `option.id` is the filter key (`happy:Happy Path`), which every
        // authoring RPC would reject as a uuid. The row menu gets the real
        // path row — and only when the option names exactly one, which is
        // the scenario-scoped case. The catalog-wide safety valve folds
        // same-named paths from several scenarios into one row, and there is
        // no honest answer to "rename which one", so it carries no menu.
        const pathId =
          option.pathIds?.length === 1 ? option.pathIds[0] : null
        return (
          <li key={option.id}>
          <StructureRowContextMenu
            kind="path"
            id={pathId}
            name={option.name}
            scenarioId={scenarioId}
          >
          <div
            className="group/path-row flex items-center gap-1 rounded-md pr-1 transition-colors hover:bg-sidebar-accent"
          >
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => togglePathKey(option.id)}
              // The check occupies the same 1rem slot the nav rows give their
              // chevron, so path names line up with phase names. A selected
              // path also carries weight and full ink — the check alone was
              // easy to miss at a glance, and this is the row that says what
              // the canvas is currently showing.
              className={cn(
                'flex min-w-0 flex-1 items-center gap-1 rounded-md pl-1 text-left text-xs transition-colors',
                selected
                  ? 'font-medium text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/85 group-hover/path-row:text-sidebar-accent-foreground',
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                <Check
                  className={cn(
                    'size-3.5',
                    selected ? 'text-primary' : 'invisible',
                  )}
                  aria-hidden
                />
              </span>
              <span className="min-w-0 flex-1 truncate py-1.5 pr-2">
                {option.name}
              </span>
            </button>
          </div>
          </StructureRowContextMenu>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Checkmark multi-select of one scenario's paths — one row per path, the
 * Check icon visible only while selected. Wired to the same shared path-key
 * store (`PathSelectionContext`) the removed navbar Paths field used.
 */
function ScenarioPathsChecklist({ scenarioId }: { scenarioId: string }) {
  const { catalog } = usePathSelectionContext()
  const paths = catalog[scenarioId]

  const options = useMemo(
    () =>
      collectOverviewPathOptionsForScenarios(
        new Map(paths ? [[scenarioId, paths]] : []),
        [scenarioId],
      ),
    [paths, scenarioId],
  )

  // The scenario's paths land in the catalog once its canvas loads.
  if (options.length === 0) return <PathsLoadingRows />

  return <PathChecklist options={options} scenarioId={scenarioId} />
}

/**
 * The no-scenario branch. Normally hidden (progressive disclosure), but
 * never while nothing is selected: deselecting every path empties the
 * canvas, and hiding the section there would leave no path control anywhere
 * in the app. In that state the whole known catalog is offered so the user
 * can switch one back on.
 *
 * An *empty* catalog is a different thing — the boot state, before any
 * scenario has loaded its paths. There is nothing to control and no dead
 * end to escape, so the section stays hidden rather than greeting every
 * visitor with an empty Paths header.
 */
function PathsSafetyValve() {
  const { catalog, activePathKeys } = usePathSelectionContext()
  const options = useMemo(
    () => collectOverviewPathOptions(new Map(Object.entries(catalog))),
    [catalog],
  )

  if (activePathKeys.length > 0 || options.length === 0) return null

  return (
    <PathsSection>
      <PathChecklist options={options} />
    </PathsSection>
  )
}

/**
 * Sidebar PATHS section — renders for the base view's selected scenario.
 *
 * Slices deliberately have no path control: a slice is a fixed selection of
 * cells, so there is nothing for a path filter to narrow. The section is
 * mounted inside the Blueprints branch of the sidebar, which is also the only
 * mode that can have a scenario selected.
 */
export function PathsSidebarSection() {
  const { view, selectedScenarioId } = useEditor()

  if (view === 'detail' && selectedScenarioId !== null) {
    return (
      <PathsSection trailing={<NewPathAction scenarioId={selectedScenarioId} />}>
        <ScenarioPathsChecklist scenarioId={selectedScenarioId} />
      </PathsSection>
    )
  }
  return <PathsSafetyValve />
}
