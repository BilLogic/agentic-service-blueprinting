import { NotionPropertyRow } from '@/components/blueprint/NotionPropertyRow'
import { ScenarioParallelInfoTooltip } from '@/components/blueprint/ScenarioParallelInfoTooltip'
import { ScenarioSlideFilters } from '@/components/blueprint/ScenarioSlideFilters'
import { PathMultiSelect, type PathOption } from '@/components/blueprint/PathMultiSelect'
import { cn } from '@/lib/utils'
import type { Slide } from '@/types/slides'

type ScenarioSlideHeaderProps = {
  title: string
  slide?: Pick<Slide, 'id' | 'label'>
  description?: string | null
  phaseLabel?: string
  paths?: PathOption[]
  selectedPathIds?: string[]
  onTogglePath?: (pathId: string) => void
  compact?: boolean
  showFilters?: boolean
  variant?: 'default' | 'notion'
  className?: string
}

export function ScenarioSlideHeader({
  title,
  slide,
  description,
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
          {slide ? (
            <ScenarioParallelInfoTooltip slide={slide} iconClassName="size-4" />
          ) : null}
          <h1 className="text-[2.5rem] font-bold leading-[1.15] tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {description}
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
          <p
            className={cn(
              'font-medium uppercase tracking-wide text-muted-foreground',
              compact ? 'text-[10px]' : 'text-xs',
            )}
          >
            {phaseLabel}
          </p>
        )}
        <div
          className={cn(
            'flex items-center gap-2',
            phaseLabel && 'mt-1',
          )}
        >
          {slide ? (
            <ScenarioParallelInfoTooltip
              slide={slide}
              iconClassName={compact ? 'size-3.5' : 'size-4'}
            />
          ) : null}
          <h1
            className={cn(
              'font-semibold tracking-tight text-foreground',
              compact ? 'text-xl' : 'text-3xl md:text-4xl',
            )}
          >
            {title}
          </h1>
        </div>
        {description && (
          <p
            className={cn(
              'mt-2 max-w-3xl text-muted-foreground',
              compact ? 'text-xs leading-relaxed' : 'text-base leading-relaxed',
            )}
          >
            {description}
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
