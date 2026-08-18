import { Button } from '@/components/ui/button'
import { usePathSelectionContext } from '@/hooks/usePathSelection'
import { cn } from '@/lib/utils'

type CanvasEmptyStateProps = {
  className?: string
  title?: string
  description?: string
  /**
   * `canvas` — full viewport placeholder (no paths selected).
   * `panel` — inside a scenario compare card.
   * `phase` — inside a phase frame with no matching scenarios.
   */
  variant?: 'canvas' | 'panel' | 'phase'
  /** One-click way out of "no paths selected"; canvas variant only by default. */
  showRestoreAction?: boolean
}

/**
 * Restores the happy-path default selection, reusing the same derivation
 * `PathSelectionContext` applies on its first sync (no second definition of
 * "the default path"). Hidden until the catalog has something to restore.
 */
function RestoreDefaultPathsButton() {
  const { defaultPathKeys, restoreDefaultPathKeys } = usePathSelectionContext()
  if (defaultPathKeys.length === 0) return null

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-1 self-start"
      onClick={restoreDefaultPathKeys}
    >
      Show the default path
    </Button>
  )
}

/** Empty-canvas / empty-panel placeholder for path filter states. */
export function CanvasEmptyState({
  className,
  title = 'No paths selected',
  description = 'Pick one under Paths in the sidebar.',
  variant = 'canvas',
  showRestoreAction,
}: CanvasEmptyStateProps) {
  const isCanvas = variant === 'canvas'
  const isPanel = variant === 'panel'
  const isPhase = variant === 'phase'

  return (
    <div
      className={cn(
        'flex',
        isCanvas && 'min-h-0 flex-1 items-center justify-center px-6',
        isPanel && 'h-full min-h-[220px] w-[640px] items-stretch p-1',
        isPhase && 'min-h-[220px] w-full items-stretch',
        className,
      )}
      data-canvas-empty-state={variant}
    >
      <div
        className={cn(
          'flex flex-col justify-center',
          isCanvas && 'max-w-sm gap-2',
          // Board chrome, not app chrome: the empty state sits on the frozen
          // blueprint palette, so its fallbacks are board tokens rather than
          // hexes (`--secondary` when no panel override is set) and its border
          // hairline is `--border` like every other hairline.
          isPanel &&
            'w-full flex-1 gap-1.5 rounded-2xl border border-dashed border-border bg-[color:var(--background-blueprint-panel-section,var(--secondary))] px-5 py-6',
          isPhase &&
            'w-full flex-1 gap-1.5 rounded-2xl border border-dashed border-border bg-[color:var(--background-blueprint-panel-canvas,var(--secondary))] px-6 py-7',
        )}
      >
        <p
          className={cn(
            'font-medium tracking-tight text-foreground/90',
            isCanvas ? 'text-sm' : 'text-xs',
          )}
        >
          {title}
        </p>
        <p
          className={cn(
            'text-muted-foreground',
            isCanvas
              ? 'text-xs leading-relaxed'
              : 'max-w-[18rem] text-2xs leading-snug',
          )}
        >
          {description}
        </p>
        {(showRestoreAction ?? isCanvas) ? <RestoreDefaultPathsButton /> : null}
      </div>
    </div>
  )
}
