import { Home, PanelLeft, Play } from 'lucide-react'
import { DevTierOverrideBadge } from '@/components/editor/DevPortal'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ORG_NAME } from '@/config'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSidebarCollapsedState } from '@/contexts/sidebarCollapsedContext'
import { cn } from '@/lib/utils'

/** The workspace wordmark in app chrome — one seam, set in src/config.ts. */
const EDITOR_TITLE = ORG_NAME

type SidebarCollapseButtonProps = {
  collapsed: boolean
  onToggle: () => void
  className?: string
  size?: 'icon-sm' | 'icon-xs'
}

/** Collapse/expand the sidebar. The chevron rotates on the shared structural ease. */
export function SidebarCollapseButton({
  collapsed,
  onToggle,
  className,
  size = 'icon-xs',
}: SidebarCollapseButtonProps) {
  return (
    <IconTooltip
      label={collapsed ? 'Expand the sidebar' : 'Collapse the sidebar'}
      side="right"
    >
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
            'size-3.5 transition-transform duration-(--motion-structural) ease-structural',
            !collapsed && 'rotate-180',
          )}
        />
      </Button>
    </IconTooltip>
  )
}

type HomeNavButtonProps = {
  isActive?: boolean
  onClick: () => void
  className?: string
  size?: 'icon-sm' | 'icon-xs'
}

/** Route back to the cover page from the tab strip. */
export function HomeNavButton({
  isActive = false,
  onClick,
  className,
  size = 'icon-xs',
}: HomeNavButtonProps) {
  return (
    <IconTooltip label="Back to the cover page" side="bottom">
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
        aria-label="Home"
        aria-current={isActive ? 'page' : undefined}
      >
        <Home className="size-3.5" />
      </Button>
    </IconTooltip>
  )
}

export function WorkspaceBadges() {
  const { isDevAuthoring, isEditPreview } = useSupabase()
  return (
    <>
      {/* Writing with the local authoring key is a privileged state that
          looks exactly like the read-only app otherwise. Say so. */}
      {isDevAuthoring ? (
        <Badge
          variant="warning"
          className="h-auto px-1.5 py-0.5 text-3xs"
          title="Local authoring key in use — writes go to the live database"
        >
          authoring
        </Badge>
      ) : null}
      {/* The opposite state, and it must not look like the one above: the Edit
          surfaces are visible so they can be worked on, and every write will
          be refused. Amber says "careful, this is live"; slate says "nothing
          you do here lands". */}
      {isEditPreview ? (
        <Badge
          variant="secondary"
          className="h-auto bg-muted px-1.5 py-0.5 text-3xs text-muted-foreground"
          title="Edit UI preview — no authoring key, so writes will be refused"
        >
          edit preview
        </Badge>
      ) : null}
      {/* Third state, and the only simulated one: the developer portal's
          tier override. */}
      <DevTierOverrideBadge />
    </>
  )
}

/**
 * The collapsed sidebar's remnant: a floating pill over the canvas
 * (Figma's collapsed-file-chip). Clicking its toggle expands the sidebar
 * back into flow — no hover-peek: one control, one behavior.
 *
 * While collapsed the pill IS the navbar: whatever band would have
 * rendered under it hands over its identity and primary action and draws
 * nothing itself, so there is one header on screen instead of two
 * stacked ones. The pill widens to fit rather than the title truncating
 * to nothing — it is the only place that context lives at this width.
 */
export function FloatingSidebarPill({ onExpand }: { onExpand: () => void }) {
  const { summary } = useSidebarCollapsedState()
  return (
    <div
      className="pointer-events-auto flex max-w-[min(36rem,calc(100vw-6rem))] items-center gap-1.5 rounded-lg border border-border bg-background/95 py-1 pl-3 pr-1 shadow-md backdrop-blur-sm"
      data-editor-sidebar-pill
    >
      <p className="shrink-0 truncate text-xs font-medium text-foreground">
        {EDITOR_TITLE}
      </p>
      {summary ? (
        <>
          <span className="shrink-0 text-border" aria-hidden>
            /
          </span>
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {summary.glyph ? (
              <span aria-hidden>{summary.glyph} </span>
            ) : null}
            {summary.title}
          </p>
          {summary.action ? (
            <Button
              type="button"
              size="sm"
              className="ml-0.5 h-6 shrink-0 px-2 text-2xs"
              onClick={summary.action.onClick}
            >
              <Play className="size-3" aria-hidden />
              {summary.action.label}
            </Button>
          ) : null}
        </>
      ) : null}
      <SidebarCollapseButton collapsed onToggle={onExpand} size="icon-sm" />
    </div>
  )
}
