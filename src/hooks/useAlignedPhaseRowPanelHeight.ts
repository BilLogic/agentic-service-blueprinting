import { useLayoutEffect, useState, type RefObject } from 'react'
import { getComparePanelScrollPaddingY } from '@/lib/sideBySideCompareLayout'

/**
 * Keeps every scenario panel in a phase row at one height: the larger of the
 * calculated shared height and the tallest measured blueprint content.
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
    setRowPanelHeight(sharedPanelHeight)
  }, [sharedPanelHeight])

  useLayoutEffect(() => {
    if (!alignPanelHeights || sharedPanelHeight === undefined) return

    const row = rowRef.current
    if (!row) return

    const measureRow = () => {
      const contentNodes = row.querySelectorAll<HTMLElement>(
        '[data-blueprint-panel-content]',
      )
      let maxPanelHeight = sharedPanelHeight
      contentNodes.forEach((node) => {
        maxPanelHeight = Math.max(
          maxPanelHeight,
          node.scrollHeight + getComparePanelScrollPaddingY(),
        )
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
