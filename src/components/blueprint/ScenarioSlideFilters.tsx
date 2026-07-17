import {
  PathMultiSelect,
  type PathOption,
} from '@/components/blueprint/PathMultiSelect'
import { cn } from '@/lib/utils'

type ScenarioSlideFiltersProps = {
  paths?: PathOption[]
  selectedPathIds?: string[]
  onTogglePath?: (pathId: string) => void
  layout?: 'horizontal' | 'vertical' | 'bar'
  className?: string
  variant?: 'default' | 'bar' | 'toolbar' | 'panel'
}

export function ScenarioSlideFilters({
  paths = [],
  selectedPathIds = [],
  onTogglePath,
  layout = 'horizontal',
  className,
  variant = 'default',
}: ScenarioSlideFiltersProps) {
  const showPathPicker = paths.length > 0 && onTogglePath
  if (!showPathPicker) return null

  if (variant === 'panel') {
    return (
      <div
        className={cn('flex flex-col gap-4', className)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Paths</span>
          <PathMultiSelect
            paths={paths}
            selectedPathIds={selectedPathIds}
            onToggle={onTogglePath}
            layout="vertical"
            hideLabel
          />
        </div>
      </div>
    )
  }

  if (variant === 'toolbar') {
    return (
      <div
        className={cn('flex flex-wrap items-center justify-start gap-2', className)}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <PathMultiSelect
          paths={paths}
          selectedPathIds={selectedPathIds}
          onToggle={onTogglePath}
          layout="toolbar"
          hideLabel
        />
      </div>
    )
  }

  if (variant === 'bar') {
    return (
      <div
        className={cn(
          'flex flex-row flex-wrap items-center gap-x-3 gap-y-1',
          className,
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-md bg-muted/40 px-2 py-0.5">
          <PathMultiSelect
            paths={paths}
            selectedPathIds={selectedPathIds}
            onToggle={onTogglePath}
            layout="bar"
            hideLabel
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn('flex flex-row flex-wrap items-start gap-6', className)}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <PathMultiSelect
        paths={paths}
        selectedPathIds={selectedPathIds}
        onToggle={onTogglePath}
        layout={layout}
      />
    </div>
  )
}
