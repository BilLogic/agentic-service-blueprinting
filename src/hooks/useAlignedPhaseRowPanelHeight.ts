import { useLayoutEffect, useState, type RefObject } from 'react'
import { getComparePanelScrollPaddingY } from '@/lib/sideBySideCompareLayout'

export type AlignedPhaseRowHeights = {
  /** The shared height every unfocused panel in the row takes. */
  rowPanelHeight: number | undefined
  /** What the focused panel takes — never less than it had at overview. */
  focusedPanelHeight: number | undefined
}

/**
 * The one height a phase row's panels share, measured rather than predicted.
 *
 * THE ESTIMATE IS A PLACEHOLDER, NOT A FLOOR. It exists to size panels in
 * the commit before anything has been measured; the moment a measurement
 * lands it replaces the estimate outright, in both directions. Treating it
 * as a floor is what put 84px of dead gray under every board on the canvas —
 * measured on all six phase rows, the same 84px on each, because a constant
 * error in the prediction can never be corrected by a `Math.max` that only
 * ever rounds up. Two independent terms produced it:
 *
 *   64px  the panel-height estimates asked `getComparePanelScrollPaddingY()`
 *         with no options, so every one of them budgeted for the UNLOCKED
 *         scroll chrome — resize-handle inset plus artboard buffer — on
 *         panels that are height-locked and have no resize handle. This
 *         measuring pass and `ResizableComparePanel` both correctly pass
 *         `{ lockHeight: true }`, so estimate and measurement were never
 *         describing the same panel.
 *   20px  a path-section bottom inset the stacked board does not render.
 *
 * The estimates are threaded with the lock now, so the placeholder is close;
 * but nothing here depends on it being right any more, which is the point.
 * A future drift in any estimate shows up as one wrong pre-paint frame
 * instead of as permanent gray.
 *
 * Both effects are LAYOUT effects. Measurement in a passive effect would let
 * a frame paint at the estimate first, which is the pop this design exists
 * to avoid.
 */
export function useAlignedPhaseRowPanelHeight(
  rowRef: RefObject<HTMLDivElement | null>,
  /** Row height predicted from everything EXCEPT the focused scenario. */
  estimatedRowHeight: number | undefined,
  /** The focused scenario's own predicted height, if one is focused. */
  estimatedFocusedHeight: number | undefined,
  alignPanelHeights: boolean,
  measureKey: string,
): AlignedPhaseRowHeights {
  const [measured, setMeasured] = useState({ row: 0, focused: 0 })

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- layout-measurement flow: drops back to the estimate for the one commit before the measuring effect below runs
    setMeasured({ row: 0, focused: 0 })
  }, [measureKey])

  useLayoutEffect(() => {
    if (!alignPanelHeights) return

    const row = rowRef.current
    if (!row) return
    const scrollPad = getComparePanelScrollPaddingY({ lockHeight: true })

    const measureRow = () => {
      let rowMax = 0
      let focusedMax = 0
      row
        .querySelectorAll<HTMLElement>('[data-blueprint-panel-content]')
        .forEach((node) => {
          // Layout height only — `scrollHeight` also counts arrow overlays
          // and path frames bleeding past the board, which shows up as gray
          // surplus.
          const height = node.offsetHeight + scrollPad
          /*
            An EXCLUDED panel is measured, but into its own bucket. Only a
            focused scenario showing more than its default path selection is
            marked (see `excludeFromRowHeight`): that comparison would
            otherwise reach every dimmed neighbour through the shared max,
            which is how six untouched panels once grew from 2218px to
            4250px each. It is bucketed rather than dropped, because
            dropping it shrinks it — see `resolveScenarioPanelHeight`.

            Plain focus marks nothing, so focusing a scenario leaves every
            number in its row exactly where it was.
          */
          if (node.closest('[data-row-height-excluded]')) {
            focusedMax = Math.max(focusedMax, height)
          } else {
            rowMax = Math.max(rowMax, height)
          }
        })
      setMeasured((current) =>
        current.row === rowMax && current.focused === focusedMax
          ? current
          : { row: rowMax, focused: focusedMax },
      )
    }

    measureRow()
    const observer = new ResizeObserver(measureRow)
    row
      .querySelectorAll<HTMLElement>('[data-blueprint-panel-content]')
      .forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [alignPanelHeights, measureKey, rowRef])

  if (!alignPanelHeights) {
    return { rowPanelHeight: undefined, focusedPanelHeight: undefined }
  }

  /*
    A row whose only panel is the focused one has no siblings to protect, so
    its measurement is the row height. Without this the row would fall back
    to an estimate that deliberately excludes the only thing in it.
  */
  const rowPanelHeight =
    measured.row > 0
      ? measured.row
      : measured.focused > 0
        ? measured.focused
        : estimatedRowHeight

  const focusedMeasured =
    measured.focused > 0 ? measured.focused : estimatedFocusedHeight

  const focusedPanelHeight =
    focusedMeasured === undefined
      ? rowPanelHeight
      : Math.max(rowPanelHeight ?? 0, focusedMeasured)

  return { rowPanelHeight, focusedPanelHeight }
}
