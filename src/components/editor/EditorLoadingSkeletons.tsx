import { Skeleton } from '@/components/ui/skeleton'
import { COMPARE_MIN_PANEL_HEIGHT } from '@/lib/sideBySideCompareLayout'
import { cn } from '@/lib/utils'

type BlueprintPanelLoadingSkeletonProps = {
  className?: string
  /** Approximate panel height (defaults to compare min). */
  height?: number
  /**
   * Fixed width in px. Pass `null` for fluid/`w-full` (pair with className).
   * Defaults to 640.
   */
  width?: number | null
  /** Show a title chip above the panel. */
  showTitle?: boolean
}

/** Single scenario/blueprint panel placeholder. */
export function BlueprintPanelLoadingSkeleton({
  className,
  height = COMPARE_MIN_PANEL_HEIGHT,
  width = 640,
  showTitle = true,
}: BlueprintPanelLoadingSkeletonProps) {
  const isFluid = width == null

  return (
    <div className={cn('flex shrink-0 flex-col gap-2', className)} aria-hidden>
      {showTitle ? <Skeleton className="h-5 w-40 rounded-full" /> : null}
      <Skeleton
        className={cn('rounded-2xl', isFluid && 'w-full min-h-[320px]')}
        style={{
          height,
          ...(isFluid ? {} : { width }),
        }}
      />
    </div>
  )
}
