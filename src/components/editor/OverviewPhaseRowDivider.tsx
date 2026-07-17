import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { OVERVIEW_PHASE_ROW_GAP } from '@/lib/overviewLayout'

/** Full-width rule between phase rows on the service overview canvas. */
export function OverviewPhaseRowDivider() {
  return (
    <div
      aria-hidden
      className="w-full shrink-0"
      style={{
        paddingTop: OVERVIEW_PHASE_ROW_GAP / 2,
        paddingBottom: OVERVIEW_PHASE_ROW_GAP / 2,
      }}
    >
      <div
        className="h-px w-full"
        style={{ backgroundColor: BLUEPRINT_THEME.canvasBorder }}
      />
    </div>
  )
}
