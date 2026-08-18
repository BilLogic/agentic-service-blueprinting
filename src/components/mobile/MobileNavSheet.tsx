import { useState } from 'react'
import { ChevronRight, Diamond, LayoutGrid } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { groupSlicesByType } from '@/lib/sliceGroups'
import { getSlideDisplayLabel } from '@/types/nav'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/nav'
import type { Slice } from '@/types/database'
import type { ReactNode } from 'react'

/**
 * The drawer IS the index: the same phase → scenario IA as the desktop
 * sidebar, plus a rail carrying the surface radio — Blueprints ◫ /
 * Slices ◇ — mirroring uno-blueprint's drawer now that this template has a
 * slice library. One divergence from desktop: a phase row is purely an
 * accordion header — label and caret both just toggle — because on a phone
 * "tap phase" navigating somewhere reads as a misfire. Scenarios, slices
 * (and the overview row) are the only navigators here.
 *
 * This component only reports WHAT was tapped. What a tap means for the
 * visible view is the shell's decision.
 */
export type MobileNavSurface = 'blueprints' | 'slices'

const RAIL_SURFACES: Array<{
  id: MobileNavSurface
  label: string
  icon: typeof LayoutGrid
}> = [
  { id: 'blueprints', label: 'Blueprints', icon: LayoutGrid },
  { id: 'slices', label: 'Slices', icon: Diamond },
]

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

/** Reserves a few rows while the slice list is in flight. */
function SliceListLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1.5" aria-hidden>
      {[1, 2, 3].map((row) => (
        <Skeleton key={row} className="h-8 w-full rounded-md" />
      ))}
    </div>
  )
}

/** The drawer's Slices surface: type groups (open by default), tap opens. */
function SliceGroups({
  slices,
  loading,
  onSelectSlice,
}: {
  slices: Slice[]
  loading: boolean
  onSelectSlice: (sliceId: string) => void
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const groups = groupSlicesByType(slices)

  if (groups.length === 0) {
    // Loading and empty are different states: skeleton rows while the list
    // is in flight, the empty message only once it has truly come back bare.
    if (loading) return <SliceListLoadingSkeleton />
    return (
      <p className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
        No saved slices yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col" data-mobile-slice-groups="">
      {groups.map((group) => {
        const isOpen = !collapsedGroups.has(group.type)
        return (
          <div key={group.type}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() =>
                setCollapsedGroups((collapsed) => {
                  const next = new Set(collapsed)
                  if (isOpen) next.add(group.type)
                  else next.delete(group.type)
                  return next
                })
              }
              className="flex min-h-9 w-full items-center gap-1.5 rounded-md px-2 text-left font-mono text-2xs tracking-wide text-sidebar-foreground/60 uppercase"
            >
              <ChevronRight
                className={cn(
                  'size-3 transition-transform duration-(--motion-micro) motion-reduce:transition-none',
                  isOpen && 'rotate-90',
                )}
                aria-hidden
              />
              {group.type}
            </button>
            {isOpen ? (
              <ul className="flex flex-col gap-0.5 pb-1">
                {group.slices.map((slice) => (
                  <li key={slice.id}>
                    <SheetRow
                      label={slice.title}
                      icon={<Diamond className="size-3 shrink-0" aria-hidden />}
                      onSelect={() => onSelectSlice(slice.id)}
                      size="sm"
                      className="pl-6"
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function MobileNavSheet({
  open,
  onOpenChange,
  surface,
  onSurfaceChange,
  slices,
  slicesLoading,
  phases,
  scenariosByPhase,
  slides,
  expandedPhaseIds,
  onPhaseExpandedChange,
  isHome,
  selectedScenarioId,
  onSelectOverview,
  onSelectScenario,
  onSelectSlice,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  surface: MobileNavSurface
  onSurfaceChange: (surface: MobileNavSurface) => void
  slices: Slice[]
  slicesLoading: boolean
  phases: NavItem[]
  scenariosByPhase: Map<string, NavItem[]>
  slides: NavItem[]
  expandedPhaseIds: ReadonlySet<string>
  onPhaseExpandedChange: (phaseId: string, open: boolean) => void
  isHome: boolean
  selectedScenarioId: string | null
  onSelectOverview: () => void
  onSelectScenario: (scenarioId: string) => void
  onSelectSlice: (sliceId: string) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        aria-label="Blueprint contents"
        className="flex w-80 flex-row bg-sidebar p-0 text-sidebar-foreground"
      >
        {/* The rail: surface radio. size-11 = the 44px touch floor. */}
        <nav
          aria-label="Sidebar surfaces"
          className="flex h-full w-14 shrink-0 flex-col items-center gap-1 border-r border-border/60 px-1.5 py-2"
        >
          {RAIL_SURFACES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-pressed={surface === id}
              onClick={() => onSurfaceChange(id)}
              className={cn(
                'relative flex size-11 items-center justify-center rounded-md',
                surface === id
                  ? 'bg-accent text-accent-foreground'
                  : 'text-sidebar-foreground/60',
              )}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-sm">
              {surface === 'slices' ? 'Slices' : 'Blueprints'}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
            {surface === 'slices' ? (
              <SliceGroups
                slices={slices}
                loading={slicesLoading}
                onSelectSlice={onSelectSlice}
              />
            ) : (
              <div className="flex flex-col gap-0.5">
                {/* The way back out to the whole board — the desktop keeps
                    this on its workspace header; the phone keeps it in the
                    index. */}
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
                            onClick={() =>
                              onPhaseExpandedChange(phase.id, !isOpen)
                            }
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
                            if (hasChildren)
                              onPhaseExpandedChange(phase.id, !isOpen)
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
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
