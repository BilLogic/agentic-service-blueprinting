import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { IntegratedBlueprintGrid } from '@/components/blueprint/IntegratedBlueprintGrid'
import { ServiceBlueprintGrid } from '@/components/blueprint/ServiceBlueprintGrid'
import { BLUEPRINT_CANVAS_COMPARE_GAP } from '@/lib/blueprintLayout'
import { cn } from '@/lib/utils'
import type { BlueprintData } from '@/types/blueprint'
import type { IntegratedBlueprintData } from '@/types/integratedBlueprint'
import { getSlideDisplayLabel, type Slide } from '@/types/slides'
import { Skeleton } from '@/components/ui/skeleton'

type CanvasBlueprintArtboardProps = {
  slide: Slide
  slides: Slide[]
  blueprint?: BlueprintData | null
  blueprints?: BlueprintData[]
  integratedBlueprint?: IntegratedBlueprintData | null
  selectedPathIds?: string[]
  useSideBySideLayout?: boolean
  useIntegratedLayout?: boolean
  hasPathFilters?: boolean
  blueprintLoading?: boolean
  isActive?: boolean
  onSelect?: () => void
  className?: string
  style?: CSSProperties
}

export function CanvasBlueprintArtboard({
  slide,
  slides,
  blueprint = null,
  blueprints,
  integratedBlueprint = null,
  selectedPathIds = [],
  useSideBySideLayout = false,
  useIntegratedLayout = false,
  hasPathFilters = false,
  blueprintLoading,
  isActive = false,
  onSelect,
  className,
  style,
}: CanvasBlueprintArtboardProps) {
  const label = getSlideDisplayLabel(slide, slides)
  const noPathsSelected =
    hasPathFilters &&
    !useIntegratedLayout &&
    selectedPathIds.length === 0
  const visibleBlueprints = noPathsSelected
    ? []
    : blueprints && blueprints.length > 0
      ? blueprints
      : blueprint
        ? [blueprint]
        : []
  const hasBlueprint = visibleBlueprints.length > 0
  const showIntegratedGrid =
    useIntegratedLayout && integratedBlueprint !== null

  return (
    <div
      data-canvas-artboard
      data-blueprint-artboard
      data-canvas-blueprint
      data-slide-id={slide.id}
      className={cn(
        'absolute flex flex-col overflow-hidden rounded-md border bg-card text-left shadow-md transition-[box-shadow,border-color]',
        isActive
          ? 'border-primary ring-2 ring-primary/25'
          : 'border-border',
        onSelect && 'hover:border-muted-foreground/40',
        className,
      )}
      style={style}
      aria-label={`${label} blueprint`}
      aria-current={isActive ? 'true' : undefined}
      {...(onSelect
        ? {
            role: 'button' as const,
            tabIndex: 0,
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              onSelect()
            },
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            },
          }
        : {})}
    >
      <div
        className={cn(
          'flex flex-col p-3',
          showIntegratedGrid
            ? 'overflow-visible'
            : 'min-h-0 flex-1 overflow-auto blueprint-scroll',
        )}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!showIntegratedGrid && !noPathsSelected && blueprintLoading && !hasBlueprint ? (
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="flex-1" />
          </div>
        ) : showIntegratedGrid ? (
          <IntegratedBlueprintGrid
            data={integratedBlueprint}
            className="shrink-0"
            compact
            embedded
            selectedPathIds={selectedPathIds}
            walkthroughBlueprints={visibleBlueprints}
          />
        ) : noPathsSelected ? null : hasBlueprint ? (
          <div
            className={cn(
              'flex min-h-0 shrink-0 items-start',
              useSideBySideLayout ? 'flex-row' : 'flex-col',
            )}
            style={
              useSideBySideLayout
                ? { gap: BLUEPRINT_CANVAS_COMPARE_GAP }
                : undefined
            }
          >
            {visibleBlueprints.map((data) => (
              <ServiceBlueprintGrid
                key={data.path.id}
                data={data}
                className="min-h-0 shrink-0"
                compact
                walkthroughBlueprints={visibleBlueprints}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center">
            <span className="text-xs text-muted-foreground">No blueprint data</span>
          </div>
        )}
      </div>
    </div>
  )
}
