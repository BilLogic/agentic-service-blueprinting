import type { PanelCrumb } from '@/components/blueprint/panelShell'
import type {
  BlueprintCellPathEntry,
  BlueprintCellSelection,
} from '@/types/blueprintCellDetail'

/**
 * Where the open cell sits, as a trail: phase, scenario, path, step.
 *
 * The scenario collapses to an ellipsis with its name on hover — the three
 * names together do not fit the panel's width, and the step is the one the
 * reader came for, so it is the crumb that stays whole. Collapsing is the
 * shared header's now, which is why this is the crumbs and not a second
 * breadcrumb: one trail is drawn, in `panelShell.tsx`, for all six panels.
 *
 * @param selection - the open cell
 * @param pathEntry - the path it was opened from, when it has one
 */
export function cellDetailCrumbs({
  selection,
  pathEntry,
}: {
  selection: BlueprintCellSelection
  pathEntry: BlueprintCellPathEntry | undefined
}): PanelCrumb[] {
  const pathName = pathEntry?.pathName.trim() ?? ''
  return [
    selection.phaseName?.trim() ?? '',
    { label: selection.scenarioName.trim(), collapsed: true },
    pathEntry ? pathName : '',
    `Step ${selection.stepIndex + 1}`,
  ]
}
