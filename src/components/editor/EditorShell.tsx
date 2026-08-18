import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useEditor } from '@/contexts/EditorContext'
import { MobileShell } from '@/components/mobile/MobileShell'
import { useMobileShell } from '@/hooks/useMobileShell'
import {
  RAIL_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '@/lib/layoutTokens'
import { CoverPage } from '@/components/cover/CoverPage'
import { coverContent } from '@/content/coverContent'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import {
  FloatingSidebarPill,
  SidebarCollapseButton,
} from '@/components/editor/EditorChrome'
import { AgentDock, AgentDockDivider } from '@/components/editor/AgentDock'
import { EditorRail, type SidebarSurface } from '@/components/editor/EditorRail'
import { AgentSettingsRailButton } from '@/components/editor/AgentPanel'
import { ThemeToggle } from '@/components/editor/ThemeToggle'
import { VisualWalkthroughShell } from '@/components/blueprint/VisualWalkthroughShell'
import { CanvasModeProvider } from '@/components/editor/CanvasModeProvider'
import { SlideModeSidebarNav } from '@/components/editor/SlideModeView'
import { SlicePresentation } from '@/components/editor/SlicePresentation'
import { SliceView } from '@/components/editor/SliceView'
import { TabStrip } from '@/components/editor/TabStrip'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useCellDeepLink } from '@/hooks/useCellDeepLink'
import { setSidebarCollapsedState } from '@/contexts/sidebarCollapsedContext'
import {
  tabKey,
  useViewState,
  type TabDescriptor,
} from '@/contexts/viewStateStore'
import {
  registerAgentUiBridge,
  registerAgentUiContext,
} from '@/lib/agent/uiBridge'
import {
  toggleAgentOpen,
  useAgentPlacement,
} from '@/lib/agent/placement'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import { suppressCanvasResizeRefit } from '@/lib/canvasChromeResize'
import { getSlideDisplayLabel } from '@/types/nav'
import {
  MOTION_STRUCTURAL_EASE,
  MOTION_STRUCTURAL_MS,
  prefersReducedMotion,
} from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * Aside = rail + content panel, drag-resizable from the aside's right edge
 * with one persisted width shared by every surface. Dimensions live in
 * `lib/layoutTokens` — one home for every shell width the runtime does
 * math on.
 */
const WIDTH_STORAGE_KEY = 'sb-sidebar-width'

function loadAsideWidth(): number {
  try {
    const raw = window.localStorage.getItem(WIDTH_STORAGE_KEY)
    const value = raw ? Number(raw) : Number.NaN
    return Number.isFinite(value)
      ? Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, value))
      : SIDEBAR_DEFAULT_WIDTH
  } catch {
    return SIDEBAR_DEFAULT_WIDTH
  }
}

/**
 * The shell gate: one breakpoint decides which app this is. Below `md`
 * (767px) the phone gets the view-only mobile shell — journey reader, touch
 * map, sheets. At or above it, the desktop shell below, untouched. The
 * check is synchronous (`matchMedia` via `useSyncExternalStore`), so a
 * phone never mounts the desktop canvas for even one frame.
 */
export function EditorShell() {
  const mobile = useMobileShell()
  return mobile ? <MobileShell /> : <DesktopEditorShell />
}

/**
 * The app frame: sidebar, tab strip and whichever view the current tab selects.
 *
 * Owns sidebar collapse and the hover-peek rail. Both are timed against
 * `suppressCanvasResizeRefit`, so the canvas does not refit mid-animation.
 */
function DesktopEditorShell() {
  const {
    view,
    goHome,
    selectPhase,
    selectScenario,
    selectedPhaseId,
    selectedScenarioId,
    slides,
    togglePhaseExpanded,
    setScenarioDisplayViewType,
  } = useEditor()
  const { activeTab, activateTab, openTab, closeTab } = useViewState()
  const { canAgent } = useSupabase()
  // `?cell=` boot deep link — the receiving end of the share link the agent
  // hands back with a cited cell. Mounted here because it needs the editor's
  // navigation and the boot URL state, and both live at this level.
  useCellDeepLink()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isLanding = view === 'landing'
  // Home reads as active only on the overview canvas itself, and only while
  // no tab is covering it.
  const isOverview = view === 'home' && activeTab === null

  const activeTabKind = activeTab?.kind ?? null

  // The rail picks a surface. Slice/present tab activation auto-selects ◇,
  // exactly as the old horizontal tabs did (initializer covers remounts
  // while a tab is already active, e.g. returning from a presentation).
  const [surface, setSurface] = useState<SidebarSurface>(
    activeTabKind !== null ? 'slices' : 'blueprints',
  )
  const agentPlacement = useAgentPlacement()
  const agentDocked = agentPlacement.mode === 'docked' && agentPlacement.open
  const panelColumnRef = useRef<HTMLDivElement>(null)
  const [lastTabKind, setLastTabKind] = useState(activeTabKind)
  if (lastTabKind !== activeTabKind) {
    setLastTabKind(activeTabKind)
    if (activeTabKind !== null) setSurface('slices')
  }

  // Leaving presentation runs before the tab actually switches: tabs unmount
  // on switch, so the exit animation has to play while the present tab is
  // still mounted. `leavingPresent` drops the shell back to its non-present
  // pose (sidebar expands) while the presentation surface fades out, then
  // the tab switch lands at the end of the same 320 ms.
  const [leavingPresent, setLeavingPresent] = useState(false)
  const leaveTimer = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)
    },
    [],
  )

  // Presentation is full-bleed: the whole sidebar collapses (the pill hides
  // too — Return is the way back), on the same 320 ms width ease as a manual
  // collapse. It never unmounts, which is what keeps entering smooth.
  const presenting = activeTabKind === 'present' && !leavingPresent

  const railOnly = presenting || sidebarCollapsed

  useEffect(() => {
    // Entering and leaving presentation both resize the canvas container.
    suppressCanvasResizeRefit()
  }, [presenting])

  // Publish the collapsed state so canvas navbars can host the expand
  // control themselves — see sidebarCollapsedContext for why the pill is
  // now the fallback rather than the default.
  const expandSidebar = useCallback(() => {
    suppressCanvasResizeRefit()
    setSidebarCollapsed(false)
  }, [])
  useEffect(() => {
    // NOT `railOnly`: presentation also collapses the sidebar, but it hides
    // the pill too (full-bleed). Telling the bands they are collapsed there
    // would strand a presentation with no header and no Return — the band
    // must keep drawing itself when nothing else can carry it.
    setSidebarCollapsedState({
      collapsed: railOnly && !presenting,
      expand: expandSidebar,
    })
  }, [railOnly, presenting, expandSidebar])

  // Hand the agent its navigation hands: open_phase / open_scenario tools
  // land on the same callbacks the sidebar rows use.
  useEffect(
    () =>
      registerAgentUiBridge({
        selectPhase,
        selectScenario,
        openAgentSurface: () => {
          toggleAgentOpen(true)
          setSidebarCollapsed(false)
        },
        setSidebarCollapsed: (collapsed) => {
          suppressCanvasResizeRefit()
          setSidebarCollapsed(collapsed)
        },
      }),
    [selectPhase, selectScenario],
  )

  // The read side: what the shell itself knows about what's on screen.
  // Ref-refreshed each render, registered once — the collector always sees
  // the latest without effect churn.
  const phaseSlide = slides.find((slide) => slide.id === selectedPhaseId)
  const scenarioSlide = slides.find((slide) => slide.id === selectedScenarioId)
  const shellContext = [
    `View level: ${view}${view === 'home' ? ' (zoomed-out overview of all phases)' : ''}`,
    phaseSlide
      ? `Selected phase: "${getSlideDisplayLabel(phaseSlide, slides)}" (${phaseSlide.id})`
      : 'Selected phase: none',
    scenarioSlide
      ? `Selected scenario: "${getSlideDisplayLabel(scenarioSlide, slides)}" (${scenarioSlide.id})`
      : 'Selected scenario: none',
    activeTab
      ? `Active tab: ${activeTab.kind} for slice ${activeTab.sliceId}`
      : 'Active tab: base blueprint view (no slice tab)',
    `Sidebar: ${surface} surface${railOnly ? ', collapsed' : ''}${presenting ? ', presenting' : ''}`,
    `Agent chat: ${agentPlacement.open ? `${agentPlacement.mode} (visible)` : 'hidden'}`,
  ].join('\n')
  const shellContextRef = useRef(shellContext)
  useEffect(() => {
    shellContextRef.current = shellContext
  })
  useEffect(
    () => registerAgentUiContext('shell', () => shellContextRef.current),
    [],
  )

  // Agent parity: the shell-level controls (tabs, presentation, phase
  // accordion, compare toggle). Ref-snapshotted so registration is stable
  // while the handlers stay current.
  type ShellCommands = {
    goOverview: () => void
    activateBase: () => void
    openSliceTab: (sliceId: string, present: boolean) => void
    closeSliceTab: (sliceId: string) => void
    exitPresent: () => string
    togglePhase: (phaseId: string) => void
    setScenarioView: (view: 'stacked' | 'merged') => string
  }
  const shellCommandsRef = useRef<ShellCommands>({
    goOverview: () => {},
    activateBase: () => {},
    openSliceTab: () => {},
    closeSliceTab: () => {},
    exitPresent: () => 'Shell not ready yet.',
    togglePhase: () => {},
    setScenarioView: () => 'Shell not ready yet.',
  })
  useEffect(() => {
    const commands = shellCommandsRef
    const unregister = [
      registerAgentUiCommand({
        name: 'go_overview',
        description: 'Back to the zoomed-out overview of all phases (Home).',
        run: () => {
          commands.current.goOverview()
          return 'On the overview.'
        },
      }),
      registerAgentUiCommand({
        name: 'activate_base_tab',
        description: 'Bring the base blueprint view forward (deactivate any slice tab).',
        run: () => {
          commands.current.activateBase()
          return 'Base blueprint view is active.'
        },
      }),
      registerAgentUiCommand({
        name: 'open_slice_tab',
        description: 'Open a slice in a tab. arg: slice id (list_slices).',
        run: (arg) => {
          if (!arg) throw new Error('arg required: slice id')
          commands.current.openSliceTab(arg, false)
          return 'Slice tab opened.'
        },
      }),
      registerAgentUiCommand({
        name: 'present_slice',
        description: 'Start presenting a slice full-bleed. arg: slice id.',
        run: (arg) => {
          if (!arg) throw new Error('arg required: slice id')
          commands.current.openSliceTab(arg, true)
          return 'Presenting the slice.'
        },
      }),
      registerAgentUiCommand({
        name: 'exit_presentation',
        description: 'Leave the running presentation back onto its slice tab.',
        run: () => commands.current.exitPresent(),
      }),
      registerAgentUiCommand({
        name: 'close_slice_tab',
        description: 'Close a slice\'s open tab(s). arg: slice id.',
        run: (arg) => {
          if (!arg) throw new Error('arg required: slice id')
          commands.current.closeSliceTab(arg)
          return 'Tab closed.'
        },
      }),
      registerAgentUiCommand({
        name: 'toggle_phase_expanded',
        description: "Expand/collapse a phase's accordion in the sidebar. arg: phase id.",
        run: (arg) => {
          if (!arg) throw new Error('arg required: phase id')
          commands.current.togglePhase(arg)
          return 'Toggled the phase accordion.'
        },
      }),
      registerAgentUiCommand({
        name: 'set_scenario_view',
        description: 'Switch the SELECTED scenario between its two displays. arg: stacked | merged (needs 2+ visible paths). stacked = one full band per path on a shared step axis. merged = the paths combined into ONE blueprint: one lane rail, one step axis, cells the paths agree on drawn once, divergent slots stacking each path\'s version. Entering merged also applies the reading preset — shared steps fold and the difference ledger opens; returning to stacked unfolds. Legacy aliases accepted: side-by-side = stacked, integrated = merged.',
        run: (arg) =>
          // 'side-by-side'/'integrated' are the pre-v3 tokens, kept as
          // documented aliases so older prompts and transcripts still work.
          commands.current.setScenarioView(
            arg === 'merged' || arg === 'integrated' ? 'merged' : 'stacked',
          ),
      }),
    ]
    return () => unregister.forEach((fn) => fn())
  }, [])

  const toggleSidebar = () => {
    // The width ease resizes the canvas container for 320 ms. That is
    // chrome moving, not the user navigating — the camera holds still.
    suppressCanvasResizeRefit()
    setSidebarCollapsed((collapsed) => !collapsed)
  }

  // Shared drag-resize. During a drag the width transition is off —
  // easing against the pointer reads as lag, not motion.
  const [asideWidth, setAsideWidth] = useState(loadAsideWidth)
  const [resizing, setResizing] = useState(false)
  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing(true)
    suppressCanvasResizeRefit()
  }
  const moveResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!resizing) return
    // The aside is flush with the window's left edge, so the pointer's x IS
    // the aside width.
    const next = Math.min(
      SIDEBAR_MAX_WIDTH,
      Math.max(SIDEBAR_MIN_WIDTH, Math.round(event.clientX)),
    )
    suppressCanvasResizeRefit()
    setAsideWidth((width) => (width === next ? width : next))
  }
  const endResize = () => {
    if (!resizing) return
    setResizing(false)
    setAsideWidth((width) => {
      try {
        window.localStorage.setItem(WIDTH_STORAGE_KEY, String(width))
      } catch {
        // Width memory is a nicety; failing to store is fine.
      }
      return width
    })
  }

  /**
   * Return: exit presentation onto that slice's focus tab, creating the tab
   * if it is not already open. The three entry moves play in reverse over
   * the same durations before the switch commits.
   */
  const exitPresentation = useCallback(
    (sliceId: string) => {
      if (leaveTimer.current !== null) return
      const land = () => {
        leaveTimer.current = null
        openTab({ kind: 'slice', sliceId })
        setLeavingPresent(false)
      }
      if (prefersReducedMotion()) {
        land()
        return
      }
      setLeavingPresent(true)
      suppressCanvasResizeRefit()
      leaveTimer.current = window.setTimeout(land, MOTION_STRUCTURAL_MS)
    },
    [openTab],
  )

  // Home (in the tab strip) is the route back to the birds-eye overview
  // canvas — it deactivates any tab, clears the selection and animates the
  // fit, exactly like Escape and the workspace breadcrumb. `goHome` (not
  // `enterCanvas`) so every overview return has the same feel.
  const goOverview = () => {
    activateTab(null)
    goHome()
  }

  // Latest handlers for the registered shell commands (declared above);
  // assigned below everything they close over, inside an every-render
  // effect (refs are not written during render).
  const shellCommands: ShellCommands = {
    goOverview,
    activateBase: () => activateTab(null),
    openSliceTab: (sliceId, present) =>
      openTab({ kind: present ? 'present' : 'slice', sliceId }),
    closeSliceTab: (sliceId) => {
      closeTab(tabKey({ kind: 'slice', sliceId }))
      closeTab(tabKey({ kind: 'present', sliceId }))
    },
    exitPresent: () => {
      if (activeTab?.kind !== 'present') return 'Not presenting right now.'
      exitPresentation(activeTab.sliceId)
      return 'Left the presentation onto the slice tab.'
    },
    togglePhase: (phaseId) => togglePhaseExpanded(phaseId),
    setScenarioView: (viewType) => {
      const scenario = slides.find((slide) => slide.id === selectedScenarioId)
      if (!scenario) return 'No scenario is selected — open one first.'
      setScenarioDisplayViewType(scenario.id, viewType)
      return `Scenario view set to ${viewType === 'merged' ? 'Merged' : 'Stacked'}.`
    },
  }
  useEffect(() => {
    shellCommandsRef.current = shellCommands
  })

  // What counts as a content switch for the crossfade. Navigation *inside*
  // the base canvas (home ⇄ detail) is a camera move, not a screen change,
  // so it deliberately keeps the same key.
  const contentKey = activeTab
    ? tabKey(activeTab)
    : isLanding
      ? 'landing'
      : 'blueprint'

  const sidebarBody = (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-row">
      <EditorRail
        surface={surface}
        agentActive={agentPlacement.open}
        showAgent={canAgent}
        onSelectSurface={(next) => {
          // ✦ toggles the chat's presence; the other two still pick the
          // panel underneath it, so "chat while looking at the nav" is
          // the default posture rather than a swap away from it.
          if (next === 'agent') toggleAgentOpen()
          else setSurface(next)
          if (sidebarCollapsed) {
            suppressCanvasResizeRefit()
            setSidebarCollapsed(false)
          }
        }}
        topSlot={
          <SidebarCollapseButton collapsed={false} onToggle={toggleSidebar} />
        }
        bottomSlot={
          <>
            {/* Theme is a utility toggle, not a surface — it lives in the
                rail's bottom group with the other toggles, not in the
                collapsed pill, which is already the app's tightest 32px. */}
            <ThemeToggle size="icon-sm" />
            <AgentSettingsRailButton />
          </>
        }
      />
      <div ref={panelColumnRef} className="flex min-h-0 min-w-0 flex-1 flex-col">
        <SidebarProvider
          style={
            {
              '--sidebar-width': `${asideWidth - RAIL_WIDTH}px`,
            } as CSSProperties
          }
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          <SlideModeSidebarNav surface={surface === 'agent' ? 'blueprints' : surface} />
        </SidebarProvider>
        {agentDocked ? <AgentDockDivider columnRef={panelColumnRef} /> : null}
        <AgentDock visible={canAgent && agentDocked} />
      </div>
    </div>
  )

  return (
    // The base surface's mode, hoisted to include the sidebar.
    //
    // It used to wrap only the canvas, which left the sidebar unable to answer
    // "are we editing?" — so its `+` and `⋯` were on in View mode, offering to
    // create and rename things on a surface whose whole premise is that it
    // changes nothing. A slice tab still mounts its own provider inside this
    // one and shadows it, which is what keeps the two surfaces independent.
    <CanvasModeProvider>
      <div
        // h-full rides the html/body/#root 100% chain — unlike svh units it
        // tracks the real laid-out viewport in embedded panes that resolve
        // viewport units against a stale size after a resize.
        className="relative flex h-full flex-col overflow-hidden bg-background"
        data-editor-shell
      >
        {/* Full-width top nav: workspace identity, Home, open tabs. */}
        <TabStrip
          isOverview={isOverview}
          onHome={goOverview}
          onBase={() => activateTab(null)}
        />

        <div className="relative flex min-h-0 min-w-0 flex-1">
          <aside
            className={cn(
              'relative z-20 shrink-0 overflow-hidden bg-sidebar',
              !railOnly && 'border-r border-border',
            )}
            style={{
              width: railOnly ? 0 : asideWidth,
              transitionProperty: resizing ? 'none' : 'width',
              transitionDuration: `${MOTION_STRUCTURAL_MS}ms`,
              transitionTimingFunction: MOTION_STRUCTURAL_EASE,
            }}
            data-editor-sidebar=""
            data-collapsed={railOnly ? '' : undefined}
            aria-label="Workspace navigation"
          >
            {/*
              Fixed-width sidebar body (rail + panel). In flow it is clipped
              by the animating aside, so open/close reads as a wipe rather
              than a mount/unmount.
            */}
            <div
              className={cn(
                'flex h-full min-h-0 flex-row',
                'transition-[opacity,transform] duration-(--motion-fade) ease-out motion-reduce:transition-none',
                railOnly
                  ? 'pointer-events-none -translate-x-2 opacity-0'
                  : 'translate-x-0 opacity-100 delay-75',
              )}
              style={{ width: asideWidth }}
              aria-hidden={railOnly}
            >
              {sidebarBody}
            </div>
            {/* Drag the aside's right edge to resize; width is remembered
                per surface. Hidden while collapsed — there is no edge. */}
            {!railOnly ? (
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize sidebar"
                onPointerDown={startResize}
                onPointerMove={moveResize}
                onPointerUp={endResize}
                onPointerCancel={endResize}
                className={cn(
                  'absolute inset-y-0 right-0 z-30 w-1.5 cursor-col-resize',
                  'hover:bg-border/80 active:bg-border',
                  resizing && 'bg-border',
                )}
              />
            ) : null}
          </aside>

          {/*
            The floating posture: portalled to the body so the window
            escapes the sidebar's clip. Hidden while presenting — a
            full-bleed slice is not the place for a chat window.
          */}
          <AgentDock
            visible={canAgent && agentPlacement.mode === 'floating' && !presenting}
          />

          {/*
            Collapsed remnant: the floating pill over the canvas. Hidden
            while presenting (full-bleed; Return is the way back). Its
            toggle is the same single control the rail carries expanded.
          */}
          {railOnly && !presenting ? (
            <div className="pointer-events-none absolute left-3 top-3 z-30">
              <FloatingSidebarPill onExpand={toggleSidebar} />
            </div>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 min-w-0 flex-1">
              {/*
                Only the active tab's content mounts, so switching is a
                fade-through rather than a true crossfade: the keyed wrapper
                remounts and the incoming surface fades up over 200 ms after
                the 75 ms stagger the sidebar already uses.
              */}
              <div
                key={contentKey}
                className="absolute inset-0"
                data-editor-content=""
              >
                <ActiveTabContent
                  tab={activeTab}
                  isLanding={isLanding}
                  leavingPresent={leavingPresent}
                  onReturn={exitPresentation}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </CanvasModeProvider>
  )
}

function ActiveTabContent({
  tab,
  isLanding,
  leavingPresent,
  onReturn,
}: {
  tab: TabDescriptor | null
  isLanding: boolean
  leavingPresent: boolean
  onReturn: (sliceId: string) => void
}) {
  if (tab === null) {
    // Base blueprint view — existing landing / home / detail behavior.
    return isLanding ? (
      <CoverPage content={coverContent} />
    ) : (
      // No provider here: the base surface's mode is the shell's, so the
      // sidebar and this canvas are always in the same one.
      <VisualWalkthroughShell>
        <div
          className="absolute inset-0 flex min-h-0 flex-col"
          data-editor-view
        >
          <ServiceOverviewView />
        </div>
      </VisualWalkthroughShell>
    )
  }
  switch (tab.kind) {
    case 'slice':
      return <SliceView key={tabKey(tab)} sliceId={tab.sliceId} />
    case 'present':
      return (
        <SlicePresentation
          key={tabKey(tab)}
          sliceId={tab.sliceId}
          leaving={leavingPresent}
          onReturn={() => onReturn(tab.sliceId)}
        />
      )
  }
}
