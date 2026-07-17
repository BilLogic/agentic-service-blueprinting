import { useCallback, useState, type ReactElement } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const PATH_DESCRIPTION_PLACEHOLDER =
  'Description needs to be added to database.'

/** Below this on-screen height the path label is treated as zoomed-out / too small to read. */
const SMALL_PATH_TITLE_HEIGHT_PX = 18

export function pathDescriptionText(
  description: string | null | undefined,
): string {
  const trimmed = description?.trim()
  return trimmed || PATH_DESCRIPTION_PLACEHOLDER
}

type PathDescriptionTooltipProps = {
  description: string | null | undefined
  pathName?: string
  /** When true, tooltip always shows the name above the description. */
  showNameInTooltip?: boolean
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function PathDescriptionTooltip({
  description,
  pathName,
  showNameInTooltip = false,
  children,
  side = 'top',
}: PathDescriptionTooltipProps) {
  const [includeTitle, setIncludeTitle] = useState(false)
  const text = pathDescriptionText(description)
  const hasDescription = Boolean(description?.trim())

  const updateIncludeTitle = useCallback(
    (element: HTMLElement) => {
      setIncludeTitle(
        Boolean(pathName?.trim()) &&
          element.getBoundingClientRect().height < SMALL_PATH_TITLE_HEIGHT_PX,
      )
    },
    [pathName],
  )

  return (
    <Tooltip>
      <TooltipTrigger
        render={children}
        onPointerEnter={(event) => updateIncludeTitle(event.currentTarget)}
        onFocus={(event) => updateIncludeTitle(event.currentTarget)}
      />
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-xs text-left leading-relaxed"
      >
        {includeTitle || showNameInTooltip ? (
          pathName ? (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{pathName}</span>
            <span className={cn(!hasDescription && 'italic opacity-80')}>
              {text}
            </span>
          </div>
          ) : (
          <span className={cn(!hasDescription && 'italic opacity-80')}>
            {text}
          </span>
          )
        ) : (
          <span className={cn(!hasDescription && 'italic opacity-80')}>
            {text}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
