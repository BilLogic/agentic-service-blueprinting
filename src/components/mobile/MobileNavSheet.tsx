import { ChevronRight, LayoutGrid } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { getSlideDisplayLabel } from '@/types/nav'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/nav'
import type { ReactNode } from 'react'

/**
 * The drawer IS the index: the same phase → scenario IA as the desktop
 * sidebar. One divergence from desktop: a phase row is purely an accordion
 * header — label and caret both just toggle — because on a phone "tap
 * phase" navigating somewhere reads as a misfire. Scenarios (and the
 * overview row) are the only navigators here.
 *
 * This component only reports WHAT was tapped. What a tap means for the
 * visible view is the shell's decision.
 *
 * Adapted from uno-blueprint's MobileNavSheet: the rail (Blueprints ◫ /
 * Slices ◇ surfaces, theme toggle) is not carried — this template has a
 * single blueprints surface and no slice library, so a one-item radio
 * would be chrome with no question to answer.
 */
function SheetRow({
  label,
  selected,
  onSelect,
  icon,
  size = 'md',
  className,
}: {
  label: string
  selected?: boolean
  onSelect: () => void
  icon?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      className={cn(
        'flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-left',
        size === 'sm' ? 'text-xs' : 'text-sm',
        selected
          ? 'bg-accent font-medium text-accent-foreground'
          : 'text-sidebar-foreground/90 hover:bg-accent/50',
        className,
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  )
}

export function MobileNavSheet({
  open,
  onOpenChange,
  phases,
  scenariosByPhase,
  slides,
  expandedPhaseIds,
  onPhaseExpandedChange,
  isHome,
  selectedScenarioId,
  onSelectOverview,
  onSelectScenario,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  phases: NavItem[]
  scenariosByPhase: Map<string, NavItem[]>
  slides: NavItem[]
  expandedPhaseIds: ReadonlySet<string>
  onPhaseExpandedChange: (phaseId: string, open: boolean) => void
  isHome: boolean
  selectedScenarioId: string | null
  onSelectOverview: () => void
  onSelectScenario: (scenarioId: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        aria-label="Blueprint contents"
        className="flex w-80 flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="border-b border-border px-4 py-3">
          <SheetTitle className="text-sm">Blueprints</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <div className="flex flex-col gap-0.5">
            {/* The way back out to the whole board — the desktop keeps this
                on its workspace header; the phone keeps it in the index. */}
            <SheetRow
              label="Service overview"
              icon={<LayoutGrid className="size-4 shrink-0" aria-hidden />}
              selected={isHome}
              onSelect={onSelectOverview}
            />
            {phases.map((phase) => {
              const children = scenariosByPhase.get(phase.id) ?? []
              const hasChildren = children.length > 0
              const isOpen = hasChildren && expandedPhaseIds.has(phase.id)
              const phaseLabel = getSlideDisplayLabel(phase, slides)
              return (
                <div key={phase.id}>
                  <div className="flex items-center">
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${phaseLabel}`}
                        onClick={() => onPhaseExpandedChange(phase.id, !isOpen)}
                        className="flex size-11 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60"
                      >
                        <ChevronRight
                          className={cn(
                            'size-3.5 transition-transform duration-(--motion-micro) motion-reduce:transition-none',
                            isOpen && 'rotate-90',
                          )}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <span className="size-11 shrink-0" aria-hidden />
                    )}
                    {/* One touch space, one meaning: a phase row is an
                        accordion header, nothing more — tapping it toggles
                        its scenarios and never moves the camera. */}
                    <SheetRow
                      label={phaseLabel}
                      onSelect={() => {
                        if (hasChildren) onPhaseExpandedChange(phase.id, !isOpen)
                      }}
                      className="px-1 font-medium"
                    />
                  </div>
                  {hasChildren && isOpen ? (
                    <ul className="flex flex-col gap-0.5 pl-11">
                      {children.map((item) => (
                        <li key={item.id}>
                          <SheetRow
                            label={getSlideDisplayLabel(item, slides)}
                            onSelect={() => onSelectScenario(item.id)}
                            selected={item.id === selectedScenarioId}
                            size="sm"
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
