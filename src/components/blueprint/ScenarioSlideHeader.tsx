import { NotionPropertyRow } from '@/components/blueprint/NotionPropertyRow'
import { ScenarioTitleDefinition } from '@/components/blueprint/ScenarioTitleDefinition'
import { ScenarioSlideFilters } from '@/components/blueprint/ScenarioSlideFilters'
import { PathMultiSelect, type PathOption } from '@/components/blueprint/PathMultiSelect'
import { cn } from '@/lib/utils'
import type { NavItem } from '@/types/nav'

type ScenarioSlideHeaderProps = {
  title: string
  /** The row the title names, for the aside its definition card carries. */
  slide?: Pick<NavItem, 'note'>
  summary?: string | null
  phaseLabel?: string
  paths?: PathOption[]
  selectedPathIds?: string[]
  onTogglePath?: (pathId: string) => void
  compact?: boolean
  showFilters?: boolean
  variant?: 'default' | 'notion'
  className?: string
}

/** Sticky header above a scenario grid: title badge, summary tooltip and path filters. */
export function ScenarioSlideHeader({
  title,
  slide,
  summary,
  phaseLabel,
  paths = [],
  selectedPathIds = [],
  onTogglePath,
  compact = false,
  showFilters = true,
  variant = 'default',
  className,
}: ScenarioSlideHeaderProps) {
  const showPathPicker = paths.length > 0 && onTogglePath

  if (variant === 'notion') {
    return (
      <header
        className={cn('w-full max-w-3xl shrink-0', className)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {phaseLabel && (
          <p className="mb-1 text-sm text-muted-foreground">{phaseLabel}</p>
        )}
        <div className="flex items-center gap-2">
          <ScenarioTitleDefinition slide={slide}>
            <h1
              className={cn(
                // geometry: 5xl is a display title; 1.15 is tighter than the rung's box so the scenario name stays one line on the slide.
                'w-fit rounded-sm text-5xl font-semibold leading-[1.15] tracking-tight text-foreground outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring/50',
              )}
            >
              {title}
            </h1>
          </ScenarioTitleDefinition>
        </div>
        {summary && (
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">
            {summary}
          </p>
        )}

        {showFilters && showPathPicker ? (
          <div className="mt-6">
            <NotionPropertyRow label="Paths">
              <PathMultiSelect
                paths={paths}
                selectedPathIds={selectedPathIds}
                onToggle={onTogglePath}
                layout="notion"
                hideLabel
              />
            </NotionPropertyRow>
          </div>
        ) : null}
      </header>
    )
  }

  return (
    <header
      className={cn(
        'flex w-full min-w-full shrink-0 flex-col border-b border-border',
        compact ? 'mb-3 pb-3' : 'mb-6 pb-6',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="min-w-0">
        {phaseLabel && (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {phaseLabel}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-2',
            phaseLabel && 'mt-1',
          )}
        >
          <ScenarioTitleDefinition slide={slide}>
            <h1
              className={cn(
                'w-fit rounded-sm font-semibold tracking-tight text-foreground outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring/50',
                compact ? 'text-xl' : 'text-3xl md:text-4xl',
              )}
            >
              {title}
            </h1>
          </ScenarioTitleDefinition>
        </div>
        {summary && (
          <p
            className={cn(
              'mt-2 max-w-3xl text-muted-foreground',
              compact ? 'text-xs' : 'text-base',
            )}
          >
            {summary}
          </p>
        )}
      </div>

      {showFilters ? (
        <ScenarioSlideFilters
          paths={paths}
          selectedPathIds={selectedPathIds}
          onTogglePath={onTogglePath}
          layout="vertical"
          className={cn(compact ? 'mt-3 gap-4' : 'mt-4')}
        />
      ) : null}
    </header>
  )
}
