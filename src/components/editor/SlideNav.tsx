import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import {
  NavChildren,
  NavRow,
  NavRowAction,
} from '@/components/editor/SidebarNav'
import { StructureRowContextMenu } from '@/components/editor/StructureRowMenu'
import {
  Collapsible,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import {
  getMainSlides,
  getSlideDisplayLabel,
  getSubslides,
  type NavItem,
} from '@/types/nav'

type SlideNavProps = {
  slides: NavItem[]
  /** Selected phase, or the parent of the selected scenario. */
  selectedPhaseId: string | null
  /** Selected scenario; null means the phase itself is the camera target. */
  selectedScenarioId: string | null
  /** True when no phase/scenario should appear selected (landing or overview). */
  isHome?: boolean
  /**
   * Expanded phases. Owned by EditorContext, not this component: local
   * expansion state died on every mode switch, skeleton swap, and
   * presentation tab, since all of those unmount the sidebar. It is also
   * deliberately never derived from selection — that is what makes
   * collapsing a phase leave the camera alone (nav plan D3).
   */
  expandedPhaseIds: ReadonlySet<string>
  onSelectPhase: (phaseId: string) => void
  onSelectScenario: (scenarioId: string) => void
  onSetExpanded: (phaseId: string, open: boolean) => void
  /**
   * Start a new scenario inside a phase. Absent for sessions that cannot
   * write, which is what hides the `+` rather than disabling it.
   */
  onAddScenario?: (phaseId: string) => void
  /** Bumped by every nav click; re-scrolls the selected row into view. */
  focusNonce: number
}

/** Marks the row a `scrollIntoView` effect looks for after a selection. */
const NAV_ROW_ATTR = 'data-nav-row'

export function SlideNav({
  slides,
  selectedPhaseId,
  selectedScenarioId,
  isHome = false,
  expandedPhaseIds,
  onSelectPhase,
  onSelectScenario,
  onSetExpanded,
  onAddScenario,
  focusNonce,
}: SlideNavProps) {
  const mains = getMainSlides(slides)
  const selectedRowId = isHome ? null : (selectedScenarioId ?? selectedPhaseId)

  // Keep the selected row visible — it may sit below the fold after a deep
  // link, a phase auto-expansion, or a long scenario list.
  useEffect(() => {
    if (selectedRowId === null) return
    const row = document.querySelector(
      `[${NAV_ROW_ATTR}="${CSS.escape(selectedRowId)}"]`,
    )
    row?.scrollIntoView({ block: 'nearest' })
  }, [selectedRowId, focusNonce])

  // An empty list renders as blank space that reads like a loading state that
  // never ends. (A load *failure* is reported separately, by the Alert above
  // this nav.)
  if (mains.length === 0) {
    return (
      <p className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
        No phases in this workspace yet.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      {mains.map((main) => {
        const children = getSubslides(main.id, slides)
        const hasChildren = children.length > 0
        const isOpen = hasChildren && expandedPhaseIds.has(main.id)
        const mainLabel = getSlideDisplayLabel(main, slides)
        // Selected = this phase is the camera target. Ancestor = the
        // selection lives inside it; those get a marker, never the fill.
        const isSelected =
          !isHome && selectedPhaseId === main.id && selectedScenarioId === null
        const isAncestor =
          !isHome && selectedPhaseId === main.id && selectedScenarioId !== null
        const panelId = `phase-panel-${main.id}`

        return (
          <div key={main.id}>
            {/* Rename lives on right-click now — the row's hover state is
                the affordance, not a per-row ⋯ button. The `+` stays: it is
                an action right-click cannot imply. */}
            <StructureRowContextMenu kind="phase" id={main.id} name={mainLabel}>
            <NavRow
              rowId={main.id}
              label={mainLabel}
              toggleLabel={mainLabel}
              panelId={hasChildren ? panelId : undefined}
              // The chevron is a real control, not decoration: expansion must
              // not require selecting the phase first. Clicking the label
              // still expands *and* focuses, so the common case is one click.
              open={hasChildren ? isOpen : undefined}
              onToggle={
                hasChildren ? () => onSetExpanded(main.id, !isOpen) : undefined
              }
              onSelect={() => {
                if (hasChildren) onSetExpanded(main.id, true)
                onSelectPhase(main.id)
              }}
              selected={isSelected}
              ancestor={isAncestor}
              trailing={
                onAddScenario ? (
                  <NavRowAction
                    label={`New scenario in ${mainLabel}`}
                    onClick={() => {
                      onSetExpanded(main.id, true)
                      onAddScenario(main.id)
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden />
                  </NavRowAction>
                ) : undefined
              }
            />
            </StructureRowContextMenu>
            {hasChildren ? (
              <PhaseScenarios
                panelId={panelId}
                open={isOpen}
                onOpenChange={(open) => onSetExpanded(main.id, open)}
                phaseId={main.id}
                items={children.map((child) => ({
                  id: child.id,
                  label: getSlideDisplayLabel(child, slides),
                  selected: !isHome && selectedScenarioId === child.id,
                }))}
                onSelect={onSelectScenario}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/**
 * The scenario list. Rendered through the same height-transitioned panel as
 * every other sidebar disclosure so a phase opens and closes with the same
 * 200 ms ease as the sections above it.
 */
function PhaseScenarios({
  panelId,
  open,
  onOpenChange,
  phaseId,
  items,
  onSelect,
}: {
  panelId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Where a sibling created from a scenario's right-click menu lands. */
  phaseId: string
  items: Array<{ id: string; label: string; selected: boolean }>
  onSelect: (scenarioId: string) => void
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleContent id={panelId}>
        <NavChildren>
          {items.map((item) => (
            <li key={item.id}>
              <StructureRowContextMenu
                kind="scenario"
                id={item.id}
                name={item.label}
                phaseId={phaseId}
              >
                <NavRow
                  rowId={item.id}
                  label={item.label}
                  onSelect={() => onSelect(item.id)}
                  selected={item.selected}
                  size="sm"
                />
              </StructureRowContextMenu>
            </li>
          ))}
        </NavChildren>
      </CollapsibleContent>
    </Collapsible>
  )
}
