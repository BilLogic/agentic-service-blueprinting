import { useState, type CSSProperties } from 'react'
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
import { SidebarProvider } from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'

export function EditorShell() {
  const { view, goHome } = useEditor()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const isDetail = view === 'detail'
  const isHome = view === 'home'

  return (
    <div
      className="relative flex h-svh overflow-hidden bg-background"
      data-editor-shell
    >
      <aside
        className={cn(
          'flex shrink-0 flex-col overflow-hidden border-r border-border bg-muted/20 transition-[width,border-color,opacity] duration-300 ease-in-out dark:bg-muted/10',
          sidebarCollapsed
            ? EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS
            : EDITOR_SIDEBAR_WIDTH_CLASS,
        )}
      >
        {!sidebarCollapsed && (
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
              onHome={goHome}
            />
            <SlideModeSidebarNav />
          </SidebarProvider>
        )}
      </aside>

      <main className="relative min-h-0 min-w-0 flex-1">
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
      </main>

      <EditorChrome
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((collapsed) => !collapsed)}
        isHome={isHome}
        onHome={goHome}
      />
    </div>
  )
}
