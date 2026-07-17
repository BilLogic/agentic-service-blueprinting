import type { CSSProperties } from 'react'
import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { Badge } from '@/components/ui/badge'
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
}: ScenarioTitleBadgeProps) {
  const pathAccent = pathType ? PATH_TYPE_COLORS[pathType] : undefined
  const panelTone = tone === 'panel' && !pathType
  const phaseTone = tone === 'phase' && !pathType

  return (
    <PathDescriptionTooltip
      description={description}
      pathName={name}
      showNameInTooltip
      side={side}
    >
      <Badge
        data-scenario-panel-title-badge={panelTone ? '' : undefined}
        data-phase-title-badge={phaseTone ? '' : undefined}
        className={cn(
          'max-w-full cursor-default truncate border-transparent',
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
        {name}
      </Badge>
    </PathDescriptionTooltip>
  )
}
