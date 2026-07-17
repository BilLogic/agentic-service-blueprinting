import { BlueprintVisualPlayButton } from '@/components/blueprint/BlueprintVisualPlayButton'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/visualWalkthrough'
import type { BlueprintData } from '@/types/blueprint'
import { cn } from '@/lib/utils'

type VisualRowPlayOverlayProps = {
  stepIndex: number
  /** Single-path play target. */
  blueprint?: BlueprintData
  /** All paths available in the walkthrough picker. */
  walkthroughBlueprints?: BlueprintData[]
  /** Integrated view: one play control per path in the first visual cell. */
  pathBlueprints?: BlueprintData[]
  className?: string
}

export function VisualRowPlayOverlay({
  stepIndex,
  blueprint,
  walkthroughBlueprints,
  pathBlueprints,
  className,
}: VisualRowPlayOverlayProps) {
  if (!isBlueprintVisualWalkthroughEnabled()) return null

  if (stepIndex !== 0) return null

  const playTargets =
    pathBlueprints?.length
      ? pathBlueprints
      : blueprint
        ? [blueprint]
        : []

  if (playTargets.length === 0) return null

  const availableBlueprints =
    walkthroughBlueprints?.length ? walkthroughBlueprints : playTargets

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 z-10', className)}
      aria-hidden={false}
      data-print-hide
    >
      <div
        className={cn(
          'pointer-events-auto absolute left-1.5 top-1.5 flex gap-1',
          playTargets.length > 1 && 'flex-col',
        )}
      >
        {playTargets.map((target) => (
          <BlueprintVisualPlayButton
            key={target.path.id}
            blueprint={target}
            blueprints={availableBlueprints}
            className="rounded-full bg-background/85 p-0.5 shadow-sm ring-1 ring-border/50 backdrop-blur-[2px]"
          />
        ))}
      </div>
    </div>
  )
}
