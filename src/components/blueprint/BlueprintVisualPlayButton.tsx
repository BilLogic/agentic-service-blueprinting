import { Play } from 'lucide-react'
import { useVisualWalkthrough } from '@/contexts/VisualWalkthroughContext'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/visualWalkthrough'
import { pickWalkthroughBlueprint } from '@/lib/visualWalkthrough'
import type { BlueprintData } from '@/types/blueprint'
import { cn } from '@/lib/utils'

type BlueprintVisualPlayButtonProps = {
  blueprint?: BlueprintData | null
  blueprints?: BlueprintData[]
  className?: string
}

export function BlueprintVisualPlayButton({
  blueprint,
  blueprints,
  className,
}: BlueprintVisualPlayButtonProps) {
  const { openWalkthrough } = useVisualWalkthrough()
  const walkthroughBlueprints =
    blueprints?.length ? blueprints : blueprint ? [blueprint] : []
  const activeBlueprint =
    blueprint ?? pickWalkthroughBlueprint(walkthroughBlueprints)
  const pathLabel = activeBlueprint?.path.name?.trim()

  if (!isBlueprintVisualWalkthroughEnabled()) return null

  return (
    <button
      type="button"
      className={cn(
        'inline-flex size-5 shrink-0 items-center justify-center text-foreground transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30',
        className,
      )}
      aria-label={
        pathLabel
          ? `Play ${pathLabel} visual walkthrough`
          : 'Play visual walkthrough'
      }
      disabled={!activeBlueprint}
      onClick={(event) => {
        event.stopPropagation()
        if (activeBlueprint) {
          openWalkthrough(activeBlueprint, walkthroughBlueprints)
        }
      }}
    >
      <Play className="size-3.5 fill-current" aria-hidden />
    </button>
  )
}
