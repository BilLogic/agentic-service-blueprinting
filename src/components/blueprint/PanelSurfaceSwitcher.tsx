import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import type { BlueprintPanelSurface } from '@/contexts/BlueprintCellDetailContext'

/**
 * The Details │ Differences switch — TOP-LEVEL panel chrome (the two
 * surfaces are siblings of the whole panel), rendered from two call sites:
 * the details branch's own header row and the differences DrawerHeader. ONE
 * component, because two verbatim copies drifted apart once already.
 *
 * No count on the Differences tab: counts live in exactly two places
 * app-wide now — the menubar Diff count and each ledger group's trailing
 * number.
 */
export function PanelSurfaceSwitcher({
  value,
  onValueChange,
}: {
  value: BlueprintPanelSurface
  onValueChange: (surface: BlueprintPanelSurface) => void
}) {
  return (
    <SegmentedControl
      aria-label="Panel surface"
      value={value}
      onValueChange={onValueChange}
    >
      <SegmentedControlItem value="details" className="px-2">
        Details
      </SegmentedControlItem>
      <SegmentedControlItem value="differences" className="px-2">
        Differences
      </SegmentedControlItem>
    </SegmentedControl>
  )
}
