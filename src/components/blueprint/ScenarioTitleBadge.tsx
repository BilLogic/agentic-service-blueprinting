import type { CSSProperties, MouseEvent } from 'react'
import { Info } from 'lucide-react'
import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PATH_TYPE_COLORS } from '@/lib/pathTypeTheme'
import { cn } from '@/lib/utils'
import type { PathType } from '@/types/database'

type ScenarioTitleBadgeProps = {
  name: string
  description?: string | null
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** When set, badge matches path-type outline color (e.g. happy path on overview). */
  pathType?: PathType
  /** Panel chrome badge — darker gray from label rail, not primary/black. */
  tone?: 'default' | 'panel' | 'phase'
  /** Optional parallel-scenario (or similar) note shown via an info icon in the badge. */
  infoTooltip?: string | null
}

/** Default scenario badge with name + description tooltip (phase overview). */
export function ScenarioTitleBadge({
  name,
  description,
  className,
  style,
  side = 'top',
  pathType,
  tone = 'default',
  infoTooltip,
}: ScenarioTitleBadgeProps) {
  const pathAccent = pathType ? PATH_TYPE_COLORS[pathType] : undefined
  const panelTone = tone === 'panel' && !pathType
  const phaseTone = tone === 'phase' && !pathType
  const infoText = infoTooltip?.trim() || null

  const stopInfoEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <Badge
      data-scenario-panel-title-badge={panelTone ? '' : undefined}
      data-phase-title-badge={phaseTone ? '' : undefined}
      className={cn(
        'h-auto max-w-full cursor-default gap-1 overflow-visible border-transparent',
        pathType && 'font-semibold text-white',
        (panelTone || phaseTone) && 'font-semibold',
        className,
      )}
      style={{
        ...style,
        ...(pathAccent
          ? {
              backgroundColor: pathAccent,
              borderColor: pathAccent,
            }
          : undefined),
      }}
    >
      {infoText ? (
        <Tooltip>
          <TooltipTrigger
            className={cn(
              'inline-flex size-3.5 shrink-0 items-center justify-center rounded-full',
              'text-current opacity-80 transition-opacity hover:opacity-100',
              'border-0 bg-transparent p-0 shadow-none outline-none',
              'focus-visible:ring-1 focus-visible:ring-current/50',
            )}
            aria-label="Parallel scenario information"
            onPointerDown={stopInfoEvent}
            onClick={stopInfoEvent}
          >
            <Info className="size-3" aria-hidden />
          </TooltipTrigger>
          <TooltipContent
            side={side}
            sideOffset={6}
            className="max-w-xs text-center"
          >
            {infoText}
          </TooltipContent>
        </Tooltip>
      ) : null}
      <PathDescriptionTooltip
        description={description}
        pathName={name}
        showNameInTooltip
        side={side}
      >
        <span
          className={cn(
            'min-w-0 truncate leading-none',
            // The phase tone is the time-marker register — mono, uppercase,
            // LETTERSPACED. The span's own tracking would silently beat the
            // wrapper's `tracking-wider`, shipping the register tight.
            phaseTone ? 'tracking-wider' : 'tracking-tight',
          )}
        >
          {name}
        </span>
      </PathDescriptionTooltip>
    </Badge>
  )
}
