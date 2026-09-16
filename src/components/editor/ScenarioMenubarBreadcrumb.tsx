import { Fragment } from 'react'
import { EntityTitleAffordance } from '@/components/blueprint/EntityTitleAffordance'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useEditor } from '@/contexts/EditorContext'
import {
  getSlideBreadcrumbs,
  isSubslide,
  WORKSPACE_BREADCRUMB_ID,
  type NavItem,
} from '@/types/nav'

type ScenarioMenubarBreadcrumbProps = {
  slide: NavItem
  slides: NavItem[]
}

/**
 * The scenario header's trail, and the header's ONLY title.
 *
 * `Phase › Scenario` on one baseline, both crumbs on the same rung
 * (`text-sm`, 13px on this ladder) with the vendored 14px chevron between
 * them. The current crumb is not a quieter echo of a title printed beside it —
 * it IS the title, so it carries the semibold ink and the affordance that
 * opens the entity panel. The header used to render the phase as a lone grey
 * word next to a separate title, which said the same name twice and read as a
 * floating label rather than a hierarchy.
 *
 * The workspace crumb is dropped. Its label is this template's own name, and
 * a deployment's header must not print it — see `deploymentOwnedContent`.
 */
export function ScenarioMenubarBreadcrumb({
  slide,
  slides,
}: ScenarioMenubarBreadcrumbProps) {
  const { openDetail, goHome } = useEditor()
  const visibleCrumbs = getSlideBreadcrumbs(slide, slides).filter(
    (crumb) => crumb.id !== WORKSPACE_BREADCRUMB_ID,
  )

  if (visibleCrumbs.length === 0) return null

  const navigateToCrumb = (crumbId: string) => {
    if (crumbId === WORKSPACE_BREADCRUMB_ID) {
      goHome()
      return
    }

    openDetail(crumbId)
  }

  return (
    <Breadcrumb className="min-w-0">
      {/* `text-sm` on the list, so both crumbs inherit one size; the chevron
          keeps the vendored `size-3.5`. `flex-nowrap` because a trail that
          wraps inside a bar pinned to two lines pushes the summary out. */}
      <BreadcrumbList className="flex-nowrap gap-1 text-sm text-muted-foreground">
        {visibleCrumbs.map((crumb, index) => {
          const isLast = index === visibleCrumbs.length - 1

          return (
            <Fragment key={crumb.id}>
              {/* The current crumb FILLS what the phase crumb leaves; the
                  phase crumb is capped, so a long phase name cannot squeeze
                  the name of the thing you are looking at. */}
              <BreadcrumbItem className={isLast ? 'min-w-0 flex-1' : undefined}>
                {isLast ? (
                  <EntityTitleAffordance
                    kind={isSubslide(slide) ? 'scenario' : 'phase'}
                    id={crumb.id}
                    label={crumb.label}
                  />
                ) : (
                  <BreadcrumbLink
                    render={<button type="button" />}
                    // The cap clips the label, so the full name has to live
                    // somewhere the reader can still reach it.
                    title={crumb.label}
                    onClick={() => navigateToCrumb(crumb.id)}
                    className="max-w-[10rem] truncate font-normal"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
