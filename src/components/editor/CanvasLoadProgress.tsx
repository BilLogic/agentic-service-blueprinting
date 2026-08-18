import { useEffect, useRef, useState } from 'react'
import { Diamond } from 'lucide-react'
import {
  loadProgressLabel,
  loadProgressPercent,
  loadProgressUnitPercent,
  type CanvasLoadStage,
} from '@/lib/canvasLoadProgress'
import { cn } from '@/lib/utils'

/**
 * Determinate canvas-load progress (plan 2026-08-17-001): mark, 2 px track,
 * stage label — centered over the canvas pad while the shaped skeleton
 * holds the geometry. Every tick is a completed query stage; there is no
 * timer fill, so a stalled stage shows a stalled bar, which is the honest
 * signal. Rendered inside the skeleton's own DeferredSkeleton session, so
 * it inherits the 250 ms hold (fast loads never see it) and leaves in the
 * same commit the content fades in.
 *
 * Presentation only (`aria-hidden`): the skeleton wrapper already carries
 * `role="status"` + the sr-only "Loading…", and a second announcement per
 * tick would be noise.
 */
export function CanvasLoadProgress({
  stages,
  units,
  className,
}: {
  stages: CanvasLoadStage[]
  /**
   * Real work-unit counts (settled requests / issued requests). When given,
   * the bar's width comes from these instead of the coarse stage fraction —
   * stages still name the work via the label.
   */
  units?: { loaded: number; total: number }
  className?: string
}) {
  const percent = units
    ? loadProgressUnitPercent(units.loaded, units.total)
    : loadProgressPercent(stages)
  const complete = percent >= 100

  /*
    Displayed width: anchored to the REAL percent (every settled request
    advances the anchor), with a slow creep between anchors so the bar is
    visibly alive while a request is on the wire — capped well short of the
    next anchor, so it can never claim work that has not finished. On
    completion it snaps to 100 (the caller holds the overlay long enough
    for that to be seen before content appears).
  */
  const percentRef = useRef(percent)
  useEffect(() => {
    percentRef.current = percent
  }, [percent])
  const [creep, setCreep] = useState(0)
  useEffect(() => {
    if (complete) return
    const timer = window.setInterval(() => {
      setCreep((current) => {
        const cap = Math.min(percentRef.current + 12, 94)
        const base = Math.max(current, percentRef.current)
        return base < cap ? base + 1 : current
      })
    }, 180)
    return () => window.clearInterval(timer)
  }, [complete])
  // Anchors always win over the creep, completion snaps to full, and the
  // creep's CONTRIBUTION is re-clamped to the current cap at render time —
  // if the real target regresses (the scenario set grew mid-load), a stale
  // high creep cannot overstate progress (todo 031).
  const display = complete
    ? 100
    : Math.min(Math.max(percent, creep), Math.min(percent + 12, 94))
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none flex flex-col items-center gap-3',
        className,
      )}
    >
      <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card/80">
        <Diamond className="size-4 text-muted-foreground" />
      </div>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-400 ease-out motion-reduce:transition-none"
          style={{ width: `${display}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {loadProgressLabel(stages)}
      </p>
    </div>
  )
}
