import type { CSSProperties, MouseEvent } from 'react'
import { Info } from 'lucide-react'
import { PathSummaryTooltip } from '@/components/blueprint/PathSummaryTooltip'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { PATH_TYPE_COLORS } from '@/lib/pathTypeTheme'
import { getBlueprintFillStyle } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathKind } from '@/types/database'

type ScenarioTitleBadgeProps = {
  name: string
  summary?: string | null
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** When set, badge matches path-type outline color (e.g. happy path on overview). */
  pathKind?: PathKind
  /** Panel chrome badge — darker gray from label rail, not primary/black. */
  tone?: 'default' | 'panel' | 'phase'
  /** Optional parallel-scenario (or similar) note shown via an info icon in the badge. */
  infoTooltip?: string | null
}

/** Default scenario badge with name + summary tooltip (phase overview). */
export function ScenarioTitleBadge({
  name,
  summary,
  className,
  style,
  side = 'top',
  pathKind,
  tone = 'default',
  infoTooltip,
}: ScenarioTitleBadgeProps) {
  const pathAccent = pathKind ? PATH_TYPE_COLORS[pathKind] : undefined
  const panelTone = tone === 'panel' && !pathKind
  const phaseTone = tone === 'phase' && !pathKind
  const infoText = infoTooltip?.trim() || null

  const stopInfoEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
  }

  return (
    <Badge
      data-blueprint-fill={pathAccent ? '' : undefined}
      data-scenario-panel-title-badge={panelTone ? '' : undefined}
      data-phase-title-badge={phaseTone ? '' : undefined}
      className={cn(
        'h-auto max-w-full cursor-default gap-1 overflow-visible border-transparent',
        pathKind && 'font-semibold',
        (panelTone || phaseTone) && 'font-semibold',
        className,
      )}
      style={{
        ...style,
        ...(pathAccent
          ? {
              ...getBlueprintFillStyle(pathAccent),
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
      <PathSummaryTooltip
        summary={summary}
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
      </PathSummaryTooltip>
    </Badge>
  )
}
