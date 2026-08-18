import { useLayoutEffect, useState, type RefObject } from 'react'
import { getComparePanelScrollPaddingY } from '@/lib/sideBySideCompareLayout'

/**
 * Keeps every scenario panel in a phase row at one height: the larger of the
 * calculated shared height and the tallest measured blueprint content.
 * Aligned overview panels are height-locked (no resize handle), so measurement
 * uses the tighter locked scroll chrome.
 */
export function useAlignedPhaseRowPanelHeight(
  rowRef: RefObject<HTMLDivElement | null>,
  sharedPanelHeight: number | undefined,
  alignPanelHeights: boolean,
  measureKey: string,
) {
  const [rowPanelHeight, setRowPanelHeight] = useState<number | undefined>(
    sharedPanelHeight,
  )

  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- layout-measurement flow: re-baselines to the shared height before the measuring effect below raises it
    setRowPanelHeight(sharedPanelHeight)
  }, [sharedPanelHeight])

  useLayoutEffect(() => {
    if (!alignPanelHeights || sharedPanelHeight === undefined) return

    const row = rowRef.current
    if (!row) return
    const scrollPad = getComparePanelScrollPaddingY({ lockHeight: true })

    const measureRow = () => {
      const contentNodes = row.querySelectorAll<HTMLElement>(
        '[data-blueprint-panel-content]',
      )
      let maxPanelHeight = sharedPanelHeight
      contentNodes.forEach((node) => {
        // The focused scenario opts out of the shared-row contract (it
        // renders the stacked arrangement at content height) — it must not
        // drive its dimmed siblings' locked height.
        if (node.closest('[data-canvas-focus-active]')) return
        // Layout height only — `scrollHeight` also counts arrow overlays and
        // path frames bleeding past the board, which shows up as gray surplus.
        maxPanelHeight = Math.max(maxPanelHeight, node.offsetHeight + scrollPad)
      })
      setRowPanelHeight((current) =>
        current === maxPanelHeight ? current : maxPanelHeight,
      )
    }

    measureRow()
    const observer = new ResizeObserver(measureRow)
    row
      .querySelectorAll<HTMLElement>('[data-blueprint-panel-content]')
      .forEach((node) => observer.observe(node))

    return () => observer.disconnect()
  }, [alignPanelHeights, measureKey, rowRef, sharedPanelHeight])

  return rowPanelHeight
}
