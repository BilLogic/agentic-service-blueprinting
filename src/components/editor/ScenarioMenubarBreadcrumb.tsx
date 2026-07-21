import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useEditor } from '@/contexts/EditorContext'
import {
  getSlideBreadcrumbs,
  WORKSPACE_BREADCRUMB_ID,
  type NavItem,
} from '@/types/nav'

type ScenarioMenubarBreadcrumbProps = {
  slide: NavItem
  slides: NavItem[]
  /** Omit the active slide — shown separately as the title below. */
  excludeCurrent?: boolean
}

/** Phase and scenario trail for the detail menubar at scenario level. */
export function ScenarioMenubarBreadcrumb({
  slide,
  slides,
  excludeCurrent = false,
}: ScenarioMenubarBreadcrumbProps) {
  const { openDetail, goHome } = useEditor()
  const crumbs = getSlideBreadcrumbs(slide, slides)
  const visibleCrumbs = excludeCurrent ? crumbs.slice(0, -1) : crumbs

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
      <BreadcrumbList className="flex-nowrap gap-0.5 text-[11px] leading-tight text-muted-foreground">
        {visibleCrumbs.map((crumb, index) => {
          const isLast = index === visibleCrumbs.length - 1

          return (
            <Fragment key={crumb.id}>
              <BreadcrumbItem className={isLast ? 'min-w-0' : undefined}>
                {isLast && !excludeCurrent ? (
                  <BreadcrumbPage className="truncate font-medium tracking-tight">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    render={<button type="button" />}
                    onClick={() => navigateToCrumb(crumb.id)}
                    className="max-w-[8rem] truncate font-normal sm:max-w-[10rem]"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast ? (
                <BreadcrumbSeparator className="[&>svg]:size-3" />
              ) : null}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
