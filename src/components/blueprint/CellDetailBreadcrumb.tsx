import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { CellDetailFacts } from '@/components/blueprint/cellDetailFacts'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

/**
 * Where the open cell sits, as a trail: phase, scenario, path, step.
 *
 * The scenario collapses to an ellipsis with its name on hover — the three
 * names together do not fit the panel's width, and the step is the one the
 * reader came for, so it is the crumb that stays whole.
 */
export function CellDetailBreadcrumb({
  selection,
  pathEntry,
}: {
  selection: BlueprintCellSelection
  pathEntry: CellDetailFacts['pathEntry']
}) {
  const pathName = pathEntry?.pathName.trim() ?? ''
  const scenarioName = selection.scenarioName.trim()
  const phaseName = selection.phaseName?.trim() ?? ''
  const hasPath = Boolean(pathName && pathEntry)
  const hasScenario = Boolean(scenarioName)
  const stepCrumbLabel = `Step ${selection.stepIndex + 1}`

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap gap-0.5 text-xs text-muted-foreground">
        {phaseName ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {phaseName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
          </>
        ) : null}
        {hasScenario ? (
          <>
            <BreadcrumbItem className="shrink-0">
              <span title={scenarioName} className="cursor-default">
                <BreadcrumbEllipsis className="size-4 text-muted-foreground [&>svg]:size-3.5" />
                <span className="sr-only">{scenarioName}</span>
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        {hasPath ? (
          <>
            <BreadcrumbItem className="min-w-0">
              <span className="block max-w-[5.5rem] truncate font-normal">
                {pathName}
              </span>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="shrink-0 [&>svg]:size-3" />
          </>
        ) : null}
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate font-medium tracking-tight text-foreground">
            {stepCrumbLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
