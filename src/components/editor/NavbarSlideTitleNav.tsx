import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useEditor } from '@/contexts/EditorContext'
import {
  getMainSlides,
  getSlideDisplayLabel,
  getSubslides,
} from '@/types/nav'
import { cn } from '@/lib/utils'

/** Flip to `true` to re-enable the title jump menu. */
const NAVBAR_TITLE_NAV_ENABLED = false

/**
 * Plain breadcrumb-ish navbar title — reads as static context text, not a
 * floating pill (description stays reachable via the badge tooltip).
 */
const NAVBAR_TITLE_BADGE_CLASS =
  'h-5 max-w-full border-transparent bg-transparent px-0 py-0.5 text-sm font-semibold text-foreground shadow-none'

type NavbarSlideTitleNavProps = {
  label: string
  description?: string | null
  /** Optional info note rendered as an icon inside the title badge. */
  infoTooltip?: string | null
  /** Overview title has no slide of its own — it maps to the home view. */
  isOverview?: boolean
  className?: string
}

/**
 * Navbar title using the shared scenario/phase title badge + description tooltip.
 * Optionally doubles as an overview/phase/scenario switcher when enabled.
 */
export function NavbarSlideTitleNav({
  label,
  description,
  infoTooltip,
  isOverview = false,
  className,
}: NavbarSlideTitleNavProps) {
  const { activeSlideId, openDetail, goHome, slides, view } = useEditor()
  const [open, setOpen] = useState(false)
  const mains = getMainSlides(slides)
  const isHome = view === 'home' || view === 'landing'

  if (!NAVBAR_TITLE_NAV_ENABLED) {
    return (
      <ScenarioTitleBadge
        name={label}
        description={description}
        infoTooltip={infoTooltip}
        side="bottom"
        className={cn(NAVBAR_TITLE_BADGE_CLASS, className)}
      />
    )
  }

  const go = (action: () => void) => {
    action()
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          'group/title inline-flex min-w-0 outline-none',
          'focus-visible:ring-2 focus-visible:ring-ring/50',
          className,
        )}
        aria-label={`Jump to another phase or scenario (current: ${label})`}
      >
        <ScenarioTitleBadge
          name={label}
          description={description}
          infoTooltip={infoTooltip}
          side="bottom"
          className={cn(NAVBAR_TITLE_BADGE_CLASS, 'pointer-events-none')}
        />
        <ChevronDown
          className="ml-0.5 size-3 shrink-0 text-muted-foreground opacity-70 transition-transform group-aria-expanded/title:rotate-180"
          aria-hidden
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="max-h-[min(28rem,70vh)] w-72 overflow-y-auto p-1.5"
      >
        <NavItem
          label="Overview"
          active={isHome || isOverview}
          onSelect={() => go(goHome)}
        />
        {mains.map((main) => {
          const children = getSubslides(main.id, slides)

          return (
            <div key={main.id} className="flex flex-col">
              <NavItem
                label={getSlideDisplayLabel(main, slides)}
                active={!isHome && activeSlideId === main.id}
                onSelect={() => go(() => openDetail(main.id))}
              />
              {children.length > 0 ? (
                <div className="mb-0.5 ml-2 flex flex-col border-l border-muted pl-2">
                  {children.map((child) => (
                    <NavItem
                      key={child.id}
                      label={getSlideDisplayLabel(child, slides)}
                      active={!isHome && activeSlideId === child.id}
                      onSelect={() => go(() => openDetail(child.id))}
                      nested
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </PopoverContent>
    </Popover>
  )
}

function NavItem({
  label,
  active,
  onSelect,
  nested = false,
}: {
  label: string
  active: boolean
  onSelect: () => void
  nested?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        // Focus was previously `focus-visible:bg-muted focus-visible:outline-none`
        // — a background-only indicator. `--muted` computes past L=1 in the light
        // theme and clamps to #FFFFFF, identical to this row's surround, so the
        // focus state was invisible (SC 2.4.7).
        'hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring',
        nested ? 'text-xs' : 'text-sm font-medium',
        active ? 'text-foreground' : 'text-foreground/80',
      )}
      aria-current={active ? 'true' : undefined}
    >
      <span className="min-w-0 truncate">{label}</span>
      {active ? (
        <Check className="size-3.5 shrink-0 text-foreground" aria-hidden />
      ) : null}
    </button>
  )
}
