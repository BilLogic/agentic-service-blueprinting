import { useCallback, useState, type ReactElement } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export const PATH_SUMMARY_PLACEHOLDER =
  'Summary needs to be added to database.'

/** Below this on-screen height the path label is treated as zoomed-out / too small to read. */
const SMALL_PATH_TITLE_HEIGHT_PX = 18

export function pathSummaryText(
  summary: string | null | undefined,
): string {
  const trimmed = summary?.trim()
  return trimmed || PATH_SUMMARY_PLACEHOLDER
}

type PathSummaryTooltipProps = {
  summary: string | null | undefined
  pathName?: string
  /** When true, tooltip always shows the name above the summary. */
  showNameInTooltip?: boolean
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Wraps a path label so its summary appears on hover/focus. The name is
 * prepended only when the trigger itself truncates it, so the tooltip does not
 * repeat what is already on screen.
 */
export function PathSummaryTooltip({
  summary,
  pathName,
  showNameInTooltip = false,
  children,
  side = 'top',
}: PathSummaryTooltipProps) {
  const [includeTitle, setIncludeTitle] = useState(false)
  const text = pathSummaryText(summary)
  const hasSummary = Boolean(summary?.trim())

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
            <span className={cn(!hasSummary && 'italic opacity-80')}>
              {text}
            </span>
          </div>
          ) : (
          <span className={cn(!hasSummary && 'italic opacity-80')}>
            {text}
          </span>
          )
        ) : (
          <span className={cn(!hasSummary && 'italic opacity-80')}>
            {text}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
