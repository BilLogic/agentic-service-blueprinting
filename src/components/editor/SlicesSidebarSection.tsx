import { useState } from 'react'
import { ChevronRight, Play } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { useViewState } from '@/contexts/viewStateStore'
import { useSlices, type SliceListEntry } from '@/hooks/useSlices'
import { groupSlicesByType } from '@/lib/sliceGroups'
import { cn } from '@/lib/utils'

/**
 * Slices sidebar section — the lifecycle's slices grouped by `slice_type`
 * into collapsible groups (JOURNEY / STEP / LANE / CELL / CUSTOM; only
 * non-empty groups render, all open by default). Click opens the slice
 * focus view; the row's hover action presents it. Read-only in this
 * template — creating and editing slices belongs to the agent tiers
 * (`/sb:slice`), so the section carries no authoring affordances.
 */
export function SlicesSidebarSection() {
  const slices = useSlices()
  const { openTab, activeKey, tabs } = useViewState()
  // Tracked as the *collapsed* set rather than the open one: a group the
  // user never touched stays open even when it first appears (slices load
  // late), while an explicit collapse survives the list changing under it.
  const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  )

  const rows: SliceListEntry[] =
    slices.status === 'ready'
      ? slices.data
      : slices.status === 'error'
        ? (slices.fallback ?? [])
        : []

  const groups = groupSlicesByType(rows)

  if (groups.length === 0) {
    return (
      // Teaching tone: say what a slice is and the real route to one in
      // this template (the sb:slice skill against your own documents).
      <p className="px-3 py-1.5 text-xs leading-relaxed text-sidebar-foreground/50">
        No slices yet — a slice is a stakeholder view cut from the blueprint.
        Ask the agent with /sb:slice, or import one through the adapter.
      </p>
    )
  }

  return (
    <SidebarGroup data-slices-sidebar-section="">
      <SidebarGroupContent>
        <SidebarMenu>
          {groups.map((group) => {
            const isOpen = !collapsedGroups.has(group.type)
            return (
              <Collapsible
                key={group.type}
                open={isOpen}
                onOpenChange={(open) =>
                  setCollapsedGroups((collapsed) => {
                    const next = new Set(collapsed)
                    if (open) next.delete(group.type)
                    else next.add(group.type)
                    return next
                  })
                }
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton className="font-mono text-2xs tracking-wide text-sidebar-foreground/60 uppercase" />
                    }
                    aria-label={
                      isOpen
                        ? `Collapse ${group.type} slices`
                        : `Expand ${group.type} slices`
                    }
                  >
                    <ChevronRight
                      className={cn('transition-transform', isOpen && 'rotate-90')}
                    />
                    <span>{group.type}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="flex flex-col gap-0.5 py-0.5">
                      {group.slices.map((slice) => {
                        const isActive =
                          activeKey === `slice:${slice.id}` ||
                          activeKey === `present:${slice.id}`
                        const isOpenInactive =
                          !isActive &&
                          tabs.some((tab) => tab.sliceId === slice.id)
                        return (
                          <li key={slice.id} className="group/slice-row relative">
                            <SidebarMenuButton
                              isActive={isActive}
                              onClick={() =>
                                openTab({ kind: 'slice', sliceId: slice.id })
                              }
                              className="pl-6"
                            >
                              <span aria-hidden className="shrink-0 text-xs">
                                ◇
                              </span>
                              <span className="min-w-0 flex-1 truncate">
                                {slice.title}
                              </span>
                              {isOpenInactive ? (
                                <span
                                  aria-hidden
                                  className="size-1.5 shrink-0 rounded-full bg-sidebar-foreground/40"
                                />
                              ) : null}
                            </SidebarMenuButton>
                            <SidebarMenuAction
                              aria-label={`Present ${slice.title}`}
                              onClick={() =>
                                openTab({ kind: 'present', sliceId: slice.id })
                              }
                            >
                              <Play />
                            </SidebarMenuAction>
                          </li>
                        )
                      })}
                    </ul>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
