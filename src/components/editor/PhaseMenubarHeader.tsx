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
import {
  getSlideDisplayLabel,
  showsBlueprintFilters,
  isSubslide,
  type NavItem,
} from '@/types/nav'
import { cn } from '@/lib/utils'

type PhaseMenubarHeaderProps = {
  slide: NavItem
  slides: NavItem[]
  paths?: PathOption[]
  selectedPathIds?: string[]
  onTogglePath?: (pathId: string) => void
  showFilters?: boolean
  className?: string
}

function resolveHeaderDescription(
  slide: NavItem,
  paths: PathOption[],
  selectedPathIds: string[],
): string | null | undefined {
  if (isSubslide(slide)) {
    if (slide.description?.trim()) return slide.description

    const selectedPath = paths.find((path) => selectedPathIds.includes(path.id))
    return selectedPath?.description ?? paths[0]?.description ?? null
  }

  return (
    slide.description ?? 'Scenarios in this phase and how they connect.'
  )
}

/** Phase or scenario title bar using the shadcn Menubar component. */
export function PhaseMenubarHeader({
  slide,
  slides,
  paths = [],
  selectedPathIds = [],
  onTogglePath,
  showFilters = false,
  className,
}: PhaseMenubarHeaderProps) {
  const label = getSlideDisplayLabel(slide, slides)
  const description = resolveHeaderDescription(slide, paths, selectedPathIds)
  const showFilterMenus =
    showFilters && showsBlueprintFilters(slide, slides) && onTogglePath

  return (
    <Menubar
      modal={false}
      data-phase-menubar-header
      className={cn(BLUEPRINT_MENUBAR_HEADER_CLASS, className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className={BLUEPRINT_MENUBAR_TITLE_CLASS}>
        <div className="flex min-w-0 shrink-0 items-center gap-1.5">
          <span className={BLUEPRINT_MENUBAR_TITLE_TEXT_CLASS}>{label}</span>
        </div>
        {description ? (
          <>
            <span className={BLUEPRINT_MENUBAR_SEPARATOR_CLASS} aria-hidden>
              ·
            </span>
            <p className={BLUEPRINT_MENUBAR_DESCRIPTION_CLASS}>{description}</p>
          </>
        ) : null}
      </div>

      {showFilterMenus ? (
        <StackHeaderFilterMenu
          paths={paths}
          selectedPathIds={selectedPathIds}
          onTogglePath={onTogglePath}
        />
      ) : null}
    </Menubar>
  )
}
