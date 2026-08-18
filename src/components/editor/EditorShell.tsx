import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Diamond, Info, LayoutGrid, Sparkles, X } from 'lucide-react'
import { MobileShell } from '@/components/mobile/MobileShell'
import { useMobileShell } from '@/hooks/useMobileShell'
import { useEditor } from '@/contexts/EditorContext'
import { ServiceOverviewView } from '@/components/editor/ServiceOverviewView'
import {
  EditorChrome,
  EditorSidebarWorkspaceHeader,
} from '@/components/editor/EditorChrome'
import {
  EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS,
  EDITOR_SIDEBAR_WIDTH_CLASS,
} from '@/components/editor/EditorSidebarRail'
import { VisualWalkthroughShell } from '@/components/blueprint/VisualWalkthroughShell'
import { SlideModeMain, SlideModeSidebarNav } from '@/components/editor/SlideModeView'
import { SlicePresentation } from '@/components/editor/SlicePresentation'
import { SliceView } from '@/components/editor/SliceView'
import { SlicesSidebarSection } from '@/components/editor/SlicesSidebarSection'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useSlices } from '@/hooks/useSlices'
import { tabKey, useViewState } from '@/contexts/viewStateStore'
import { AgentDock, AgentDockDivider } from '@/components/editor/AgentDock'
import { AgentSettingsButton } from '@/components/editor/AgentPanel'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { toggleAgentOpen, useAgentPlacement } from '@/lib/agent/placement'
import {
  registerAgentUiBridge,
  registerAgentUiContext,
} from '@/lib/agent/uiBridge'
import { cn } from '@/lib/utils'

export function EditorShell() {
  const mobile = useMobileShell()
  return mobile ? <MobileShell /> : <DesktopEditorShell />
}

/**
 * Resolves the boot `?slice=` deep link once the slice list has loaded: the
 * reducer opens the named tab (or records `missingSliceId`) exactly once.
 * Mounted by both shells so a phone and a desktop read the same link.
 */
export function SliceUrlBootResolver() {
  const { pendingUrlState, resolvePending } = useViewState()
  const slicesQuery = useSlices()
  const status = slicesQuery.status
  const ids = (
    status === 'ready'
      ? slicesQuery.data
      : status === 'error'
        ? (slicesQuery.fallback ?? [])
        : []
  ).map((slice) => slice.id)
  const idsKey = ids.join(',')

  useEffect(() => {
    if (pendingUrlState === null) return
    if (status === 'loading') return
    resolvePending(idsKey ? idsKey.split(',') : [])
  }, [pendingUrlState, resolvePending, status, idsKey])

  return null
}

/** A dead `?slice=` link — say so rather than the link silently doing nothing. */
export function MissingSliceNotice() {
  const { missingSliceId, dismissMissingSlice } = useViewState()
  if (missingSliceId === null) return null
  return (
    <div className="shrink-0 border-b border-border bg-sidebar px-2 py-1.5">
      <Alert className="relative items-center">
        <Info className="size-3.5" aria-hidden />
        <AlertDescription className="text-xs">
          That link points to a slice that no longer exists — it may have been
          deleted.
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-1 right-1"
          aria-label="Dismiss"
          onClick={dismissMissingSlice}
        >
          <X className="size-3" />
        </Button>
      </Alert>
    </div>
  )
}

type SidebarSurface = 'blueprints' | 'slices'

/** The sidebar's surface radio — Blueprints ◫ / Slices ◇. */
function SidebarSurfaceToggle({
  surface,
  onSurfaceChange,
  trailing,
}: {
  surface: SidebarSurface
  onSurfaceChange: (surface: SidebarSurface) => void
  /** Toggles that accompany the radio (the agent ✦ and its ⚙). */
  trailing?: ReactNode
}) {
  const surfaces: Array<{
    id: SidebarSurface
    label: string
    icon: typeof LayoutGrid
  }> = [
    { id: 'blueprints', label: 'Blueprints', icon: LayoutGrid },
    { id: 'slices', label: 'Slices', icon: Diamond },
  ]
  return (
    <div
      role="group"
      aria-label="Sidebar surfaces"
      className="flex items-center gap-1 border-b border-border/60 px-2 py-1.5"
    >
      {surfaces.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={surface === id}
          onClick={() => onSurfaceChange(id)}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            surface === id
              ? 'bg-accent text-accent-foreground'
              : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
          )}
        >
          <Icon className="size-3.5" aria-hidden />
          {label}
        </button>
      ))}
      {trailing}
    </div>
  )
}

/**
 * ✦ is a TOGGLE, not a surface swap — the chat docks under whichever panel
 * is open (or floats), so Blueprints/Slices keeps its own highlight while
 * the agent is showing. It wears a tint and a presence dot, never the
 * selected state.
 */
function AgentToggleButton() {
  const placement = useAgentPlacement()
  const active = placement.open
  return (
    <IconTooltip label={active ? 'Hide the agent' : 'Show the agent'} side="bottom">
      <button
        type="button"
        aria-label={active ? 'Hide the agent' : 'Show the agent'}
        aria-pressed={active}
        onClick={() => toggleAgentOpen()}
        className={cn(
          'relative flex size-6 shrink-0 items-center justify-center rounded-md transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          active
            ? 'bg-accent text-accent-foreground after:absolute after:right-0.5 after:top-0.5 after:size-1.5 after:rounded-full after:bg-primary'
            : 'text-sidebar-foreground/60 hover:text-sidebar-foreground',
        )}
      >
        <Sparkles className="size-3.5" aria-hidden />
      </button>
    </IconTooltip>
  )
}

function DesktopEditorShell() {
  const { view, goHome, openDetail, activeSlide } = useEditor()
  const { activeTab, activateTab, openTab } = useViewState()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const placement = useAgentPlacement()
  const sidebarColumnRef = useRef<HTMLDivElement>(null)
  const isDetail = view === 'detail'
  const isHome = view === 'home'

  // The agent's hands (navigation) and eyes (get_ui_state) on this shell.
  useEffect(
    () =>
      registerAgentUiBridge({
        selectPhase: (phaseId) => {
          activateTab(null)
          openDetail(phaseId)
        },
        selectScenario: (scenarioId) => {
          activateTab(null)
          openDetail(scenarioId)
        },
        openAgentSurface: () => toggleAgentOpen(true),
      }),
    [activateTab, openDetail],
  )

  useEffect(
    () =>
      registerAgentUiContext('editor-shell', () => {
        const lines = [
          `View level: ${view === 'home' ? 'service overview (all phases)' : 'detail'}`,
        ]
        if (view === 'detail')
          lines.push(
            `Open slide: "${activeSlide.label}" (${activeSlide.id})${activeSlide.parentId ? ' — a scenario' : ' — a phase'}`,
          )
        lines.push(
          activeTab
            ? `Active tab: ${activeTab.kind === 'present' ? 'presenting slice' : 'slice'} ${activeTab.sliceId}`
            : 'Active tab: base blueprint view (no slice tab)',
        )
        return lines.join('\n')
      }),
    [view, activeSlide, activeTab],
  )

  const activeTabKind = activeTab?.kind ?? null

  // The sidebar picks a surface. Slice/present activation auto-selects ◇
  // (initializer covers remounts while a tab is already active, e.g. a
  // `?slice=` boot).
  const [surface, setSurface] = useState<SidebarSurface>(
    activeTabKind !== null ? 'slices' : 'blueprints',
  )
  const [lastTabKind, setLastTabKind] = useState(activeTabKind)
  if (lastTabKind !== activeTabKind) {
    setLastTabKind(activeTabKind)
    if (activeTabKind !== null) setSurface('slices')
  }

  // Presentation is full-bleed: the whole sidebar hides — Return is the way
  // back.
  const presenting = activeTabKind === 'present'

  const contentKey = activeTab ? tabKey(activeTab) : 'blueprint'

  return (
    <div
      className="relative flex h-svh overflow-hidden bg-background"
      data-editor-shell
    >
      <SliceUrlBootResolver />
      <aside
        data-editor-sidebar
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-border bg-muted/20 transition-[width,border-color,opacity] duration-300 ease-in-out dark:bg-muted/10',
          sidebarCollapsed || presenting
            ? EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS
            : EDITOR_SIDEBAR_WIDTH_CLASS,
        )}
      >
        {!sidebarCollapsed && !presenting && (
          <div
            ref={sidebarColumnRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <SidebarProvider
              style={
                {
                  '--sidebar-width': '15rem',
                } as CSSProperties
              }
              className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <EditorSidebarWorkspaceHeader
                sidebarCollapsed={sidebarCollapsed}
                onToggleSidebar={() =>
                  setSidebarCollapsed((collapsed) => !collapsed)
                }
                isHome={isHome}
                onHome={() => {
                  activateTab(null)
                  goHome()
                }}
              />
              <SidebarSurfaceToggle
                surface={surface}
                onSurfaceChange={setSurface}
                trailing={
                  <div className="ml-0.5 flex items-center gap-0.5 border-l border-border/60 pl-1.5">
                    <AgentToggleButton />
                    <AgentSettingsButton />
                  </div>
                }
              />
              {surface === 'slices' ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <SlicesSidebarSection />
                </div>
              ) : (
                <SlideModeSidebarNav />
              )}
            </SidebarProvider>
            {placement.open && placement.mode === 'docked' ? (
              <AgentDockDivider columnRef={sidebarColumnRef} />
            ) : null}
            <AgentDock visible />
          </div>
        )}
      </aside>

      {/* A floating agent must survive the sidebar collapsing (its normal
          mount lives inside the expanded sidebar column). Exactly one
          instance exists at a time. */}
      {(sidebarCollapsed || presenting) && placement.mode === 'floating' ? (
        <AgentDock visible />
      ) : null}

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <MissingSliceNotice />
        <div className="relative min-h-0 min-w-0 flex-1">
          {activeTab === null ? (
            <VisualWalkthroughShell>
              <div
                className={cn(
                  'absolute inset-0 flex min-h-0 flex-col transition-opacity duration-300 ease-in-out',
                  isDetail ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
                aria-hidden={!isDetail}
                data-editor-view
              >
                <SlideModeMain />
              </div>
              <div
                className={cn(
                  'absolute inset-0 flex min-h-0 flex-col transition-opacity duration-300 ease-in-out',
                  isDetail ? 'pointer-events-none opacity-0' : 'opacity-100',
                )}
                aria-hidden={isDetail}
                data-editor-view
              >
                <ServiceOverviewView />
              </div>
            </VisualWalkthroughShell>
          ) : (
            <div key={contentKey} className="absolute inset-0" data-editor-view>
              {activeTab.kind === 'slice' ? (
                <SliceView key={tabKey(activeTab)} sliceId={activeTab.sliceId} />
              ) : (
                <SlicePresentation
                  key={tabKey(activeTab)}
                  sliceId={activeTab.sliceId}
                  onReturn={() =>
                    openTab({ kind: 'slice', sliceId: activeTab.sliceId })
                  }
                />
              )}
            </div>
          )}
        </div>
      </main>

      {!presenting ? (
        <EditorChrome
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
          isHome={isHome && activeTab === null}
          onHome={() => {
            activateTab(null)
            goHome()
          }}
        />
      ) : null}
    </div>
  )
}
