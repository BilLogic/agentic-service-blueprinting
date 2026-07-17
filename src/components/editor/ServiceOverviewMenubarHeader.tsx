import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { StackHeaderFilterMenu } from '@/components/editor/StackHeaderFilterMenu'
import {
  BLUEPRINT_MENUBAR_DESCRIPTION_CLASS,
  BLUEPRINT_MENUBAR_HEADER_CLASS,
  BLUEPRINT_MENUBAR_SEPARATOR_CLASS,
  BLUEPRINT_MENUBAR_TITLE_CLASS,
  BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS,
} from '@/components/editor/menubarHeaderLayout'
import { Menubar } from '@/components/ui/menubar'
import { cn } from '@/lib/utils'

const OVERVIEW_MENU_TITLE = 'Uno Blueprint'
const OVERVIEW_MENU_DESCRIPTION =
  'An overview of the phases across the PLUS service lifecycle.'

type ServiceOverviewMenubarHeaderProps = {
  paths: PathOption[]
  selectedPathIds: string[]
  onTogglePath: (pathId: string) => void
  className?: string
}

/** Title bar for the service overview canvas. */
export function ServiceOverviewMenubarHeader({
  paths,
  selectedPathIds,
  onTogglePath,
  className,
}: ServiceOverviewMenubarHeaderProps) {
  return (
    <Menubar
      modal={false}
      data-phase-menubar-header
      data-service-overview-menubar
      className={cn(BLUEPRINT_MENUBAR_HEADER_CLASS, className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={BLUEPRINT_MENUBAR_TITLE_CLASS}>
        <span className={BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS}>
          {OVERVIEW_MENU_TITLE}
        </span>
        <span className={BLUEPRINT_MENUBAR_SEPARATOR_CLASS} aria-hidden>
          ·
        </span>
        <p className={BLUEPRINT_MENUBAR_DESCRIPTION_CLASS}>
          {OVERVIEW_MENU_DESCRIPTION}
        </p>
      </div>

      <StackHeaderFilterMenu
        paths={paths}
        selectedPathIds={selectedPathIds}
        onTogglePath={onTogglePath}
      />
    </Menubar>
  )
}

type ServiceOverviewStickyHeaderProps = ServiceOverviewMenubarHeaderProps

/** Fixed overlay header for the service overview, matching phase/scenario detail views. */
export function ServiceOverviewStickyHeader({
  className,
  ...menubarProps
}: ServiceOverviewStickyHeaderProps) {
  return (
    <div
      data-slide-sticky-header
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4',
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="pointer-events-auto w-full">
        <ServiceOverviewMenubarHeader {...menubarProps} />
      </div>
    </div>
  )
}
