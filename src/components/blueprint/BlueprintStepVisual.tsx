import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { getVisualCellButtonMaxHeight } from '@/lib/blueprintLayout'
import { BLUEPRINT_CELL_PALETTE } from '@/lib/blueprintTheme'
import { hasEmbeddedVisualFrame } from '@/lib/visualWalkthrough'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

export type BlueprintStepVisualPicture = {
  picture: string
  label?: string
}

type BlueprintStepVisualProps = {
  compact?: boolean
  className?: string
  fill?: string
  selection?: BlueprintCellSelection
  cellId?: string
  stepIndex?: number
  opacity?: number
  pictures?: readonly string[] | readonly BlueprintStepVisualPicture[]
  /** Larger walkthrough/presentation layout — images scale to fit without clipping. */
  presentation?: boolean
}

function normalizePictures(
  pictures: readonly string[] | readonly BlueprintStepVisualPicture[],
): BlueprintStepVisualPicture[] {
  return pictures.map((entry) =>
    typeof entry === 'string' ? { picture: entry } : entry,
  )
}

function VisualPictureStrip({
  pictures,
  className,
}: {
  pictures: readonly BlueprintStepVisualPicture[]
  className?: string
}) {
  const showLabels =
    pictures.some((entry) => Boolean(entry.label?.trim()))

  return (
    <div
      className={cn(
        'flex h-full min-h-0 max-h-full w-full items-stretch justify-center gap-0.5 overflow-hidden',
        className,
      )}
    >
      {pictures.map((entry, index) => (
        <div
          key={`${entry.picture}-${entry.label ?? index}`}
          className="flex h-full min-h-0 max-h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 self-stretch overflow-hidden"
        >
          <div className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
            <img
              src={entry.picture}
              alt=""
              className={cn(
                'max-h-full max-w-full rounded-sm object-contain object-center',
                hasEmbeddedVisualFrame(entry.picture) && 'scale-[1.08]',
              )}
            />
          </div>
          {showLabels && entry.label?.trim() ? (
            <p className="w-full shrink-0 whitespace-nowrap px-0.5 text-center text-[8px] font-medium leading-none tracking-tight text-foreground/80">
              {entry.label}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function BlueprintStepVisual({
  compact = false,
  className,
  fill = BLUEPRINT_CELL_PALETTE.visual,
  selection,
  cellId,
  stepIndex,
  opacity,
  pictures,
  presentation = false,
}: BlueprintStepVisualProps) {
  const displayPictures = normalizePictures(pictures ?? [])
  const hasRealPictures = displayPictures.length > 0
  const ariaLabel = hasRealPictures
    ? `Step visuals for ${displayPictures.length} users`
    : 'Empty step visual'
  const inlineMaxHeight = getVisualCellButtonMaxHeight(compact)

  if (!hasRealPictures) {
    return null
  }

  if (presentation) {
    return (
      <div
        className={cn(
          'flex w-full items-stretch justify-center gap-2 rounded-xl p-3 ring-1 ring-border/60',
          'h-[min(16rem,35vh)] min-h-[12.5rem]',
          className,
        )}
        style={{ backgroundColor: fill }}
        role="img"
        aria-label={ariaLabel}
      >
        <VisualPictureStrip pictures={displayPictures} />
      </div>
    )
  }

  return (
    <BlueprintCellButton
      fill={fill}
      compact={compact}
      variant="visual"
      className={cn(
        'h-full min-h-0 max-h-full w-full overflow-hidden',
        'items-stretch justify-stretch p-1',
        className,
      )}
      style={{
        maxHeight: inlineMaxHeight,
        '--blueprint-cell-bg-panel': 'transparent',
      } as CSSProperties}
      selection={selection}
      cellId={cellId}
      stepIndex={stepIndex}
      opacity={opacity}
      aria-label={ariaLabel}
    >
      <VisualPictureStrip pictures={displayPictures} />
    </BlueprintCellButton>
  )
}
