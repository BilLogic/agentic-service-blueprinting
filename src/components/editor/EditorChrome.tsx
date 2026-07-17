import { Home, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS } from '@/components/editor/EditorSidebarRail'
import { cn } from '@/lib/utils'

function EditorTitleLabel() {
  return (
    <p className="truncate text-sm font-medium leading-tight text-foreground">
      PLUS
    </p>
  )
}

type SidebarCollapseButtonProps = {
  collapsed: boolean
  onToggle: () => void
  className?: string
  size?: 'icon-sm' | 'icon-xs'
}

export function SidebarCollapseButton({
  collapsed,
  onToggle,
  className,
  size = 'icon-xs',
}: SidebarCollapseButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        'shrink-0 text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={onToggle}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <PanelLeft
        className={cn(
          'size-3.5 transition-transform duration-300 ease-in-out',
          !collapsed && 'rotate-180',
        )}
      />
    </Button>
  )
}

type HomeNavButtonProps = {
  isActive?: boolean
  onClick: () => void
  className?: string
  size?: 'icon-sm' | 'icon-xs'
}

export function HomeNavButton({
  isActive = false,
  onClick,
  className,
  size = 'icon-xs',
}: HomeNavButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      className={cn(
        'shrink-0 text-muted-foreground hover:text-foreground',
        isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
        className,
      )}
      onClick={onClick}
      aria-label="Overview"
      aria-current={isActive ? 'page' : undefined}
    >
      <Home className="size-3.5" />
    </Button>
  )
}

type EditorSidebarWorkspaceHeaderProps = {
  sidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  isHome?: boolean
  onHome?: () => void
}

export function EditorSidebarWorkspaceHeader({
  sidebarCollapsed = false,
  onToggleSidebar,
  isHome = false,
  onHome,
}: EditorSidebarWorkspaceHeaderProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-3 py-2"
      data-editor-app-title
    >
      {onHome ? (
        <HomeNavButton isActive={isHome} onClick={onHome} />
      ) : null}
      <div className="min-w-0 flex-1">
        <EditorTitleLabel />
      </div>
      {onToggleSidebar ? (
        <SidebarCollapseButton
          collapsed={sidebarCollapsed}
          onToggle={onToggleSidebar}
        />
      ) : null}
    </div>
  )
}

type EditorChromeProps = {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  isHome?: boolean
  onHome?: () => void
}

export function EditorChrome({
  sidebarCollapsed,
  onToggleSidebar,
  isHome = false,
  onHome,
}: EditorChromeProps) {
  if (!sidebarCollapsed) return null

  return (
    <div
      className={cn(
        'pointer-events-auto absolute left-0 top-0 z-30 flex flex-col items-center gap-1 px-1 py-2 transition-all duration-300 ease-in-out',
        EDITOR_SIDEBAR_COLLAPSED_WIDTH_CLASS,
      )}
      data-editor-chrome
      onPointerDown={(e) => e.stopPropagation()}
    >
      {onHome ? (
        <HomeNavButton isActive={isHome} onClick={onHome} size="icon-sm" />
      ) : null}
      <SidebarCollapseButton
        collapsed={sidebarCollapsed}
        onToggle={onToggleSidebar}
        size="icon-sm"
      />
    </div>
  )
}
