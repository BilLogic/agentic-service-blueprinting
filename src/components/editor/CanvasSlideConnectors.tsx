import { computeSlideLayouts } from '@/lib/slideLayout'
import type { ArtboardSize } from '@/lib/blueprintLayout'
import type { BlueprintData } from '@/types/blueprint'
import { getMainSlides, getSubslides, type Slide } from '@/types/slides'

type CanvasSlideConnectorsProps = {
  slides: Slide[]
  blueprintsByScenario?: Map<string, BlueprintData>
  layoutOverrides?: Map<string, ArtboardSize>
}

type Line = { x1: number; y1: number; x2: number; y2: number }

/** Vertical phase flow; scenarios chained horizontally from their phase. */
export function CanvasSlideConnectors({
  slides,
  blueprintsByScenario = new Map(),
  layoutOverrides = new Map(),
}: CanvasSlideConnectorsProps) {
  const layouts = computeSlideLayouts(
    slides,
    blueprintsByScenario,
    layoutOverrides,
  )
  const lines: Line[] = []
  const mains = getMainSlides(slides)

  for (let i = 0; i < mains.length - 1; i++) {
    const from = layouts.get(mains[i].id)
    const to = layouts.get(mains[i + 1].id)
    if (!from || !to) continue
    lines.push({
      x1: from.x + from.width / 2,
      y1: from.y + from.height,
      x2: to.x + to.width / 2,
      y2: to.y,
    })
  }

  for (const main of mains) {
    const parent = layouts.get(main.id)
    if (!parent) continue

    const children = getSubslides(main.id, slides)

    children.forEach((child, index) => {
      const childLayout = layouts.get(child.id)
      if (!childLayout) return

      const childLeft = {
        x: childLayout.x,
        y: childLayout.y + childLayout.height / 2,
      }

      if (index === 0) {
        lines.push({
          x1: parent.x + parent.width,
          y1: parent.y + parent.height / 2,
          x2: childLeft.x,
          y2: childLeft.y,
        })
        return
      }

      const prev = layouts.get(children[index - 1].id)
      if (!prev) return
      lines.push({
        x1: prev.x + prev.width,
        y1: prev.y + prev.height / 2,
        x2: childLeft.x,
        y2: childLeft.y,
      })
    })
  }

  if (lines.length === 0) return null

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={1}
      height={1}
      aria-hidden
    >
      {lines.map((line, i) => (
        <path
          key={i}
          d={`M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`}
          fill="none"
          stroke="var(--border)"
          strokeWidth={2}
          strokeDasharray={line.y1 === line.y2 ? undefined : '6 4'}
        />
      ))}
    </svg>
  )
}
