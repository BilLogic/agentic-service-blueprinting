import { DeferredSkeleton } from '@/components/ui/deferred-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * What each entity panel shows while its query is in flight.
 *
 * One generic placeholder — two bars and two equal boxes — stood in for four
 * structurally different panels. No panel has two equal full-width boxes: the
 * lane panel's tallest region is a list of one-line rows, the step panel's is
 * a row of 4:3 images. The swap was a re-flow, not a fill-in.
 *
 * And it always paints. Each of these four hooks is a strictly SEQUENTIAL
 * waterfall — `useLaneSpec` says so in its own comment, "three round-trips
 * rather than one" — so the total clears the 250 ms hold every time. Fidelity
 * here is what the reader sees on every open, not a rare frame.
 *
 * Heights come from the same row counts the loaded fields use, so a
 * `rows={3}` placeholder is the height of a `rows={3}` textarea rather than a
 * number that matched once.
 */

/** A textarea's placeholder at a given row count. */
function FieldSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <Skeleton className="h-3 w-20" />
      {/* `min-h` on the textarea is rows × line-height + padding; 20px a row
          plus 16px is what the loaded field measures. */}
      <Skeleton className="w-full" style={{ height: rows * 20 + 16 }} />
    </div>
  )
}

/** Badge, title, meta — every panel opens with these three. */
function IdentitySkeleton() {
  return (
    <div className="flex flex-col gap-1.5">
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-5 w-40" />
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <DeferredSkeleton
      loading
      skeleton={<div className="flex flex-col gap-4">{children}</div>}
    >
      {null}
    </DeferredSkeleton>
  )
}

/** Phase: three textareas, at the loaded panel's row counts. */
export function PhasePanelLoading() {
  return (
    <Frame>
      <IdentitySkeleton />
      <FieldSkeleton rows={2} />
      <FieldSkeleton />
      <FieldSkeleton />
    </Frame>
  )
}

/** Lane: a select, an input, and two string-lists of one row each. */
export function LanePanelLoading() {
  return (
    <Frame>
      <IdentitySkeleton />
      {[0, 1].map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
      ))}
      {[0, 1].map((key) => (
        <div key={key} className="flex flex-col gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-6 w-24 rounded-md" />
        </div>
      ))}
    </Frame>
  )
}

/**
 * Step: one textarea, and a frame row only when the step HAS frames.
 *
 * The count comes from the canvas store, which already knows how many
 * storyboard cells this step has — no request is made to shape a placeholder.
 */
export function StepPanelLoading({ frames = 0 }: { frames?: number }) {
  return (
    <Frame>
      <IdentitySkeleton />
      <FieldSkeleton rows={3} />
      {frames > 0 ? (
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-2">
            {Array.from({ length: frames }, (_, index) => (
              <div key={index} className="flex w-32 shrink-0 flex-col gap-1">
                <Skeleton className="aspect-[4/3] w-full rounded-md" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Frame>
  )
}

/**
 * Scenario: one textarea and one accordion row per path.
 *
 * The count is the paths CURRENTLY DISPLAYED on the canvas, which is free and
 * already in memory. It can undercount when paths are filtered out of view —
 * `useScenarioPaths` reads from the database precisely because "the canvas
 * holds only the paths currently selected for display". That is still better
 * than a fixed guess, and a request issued to improve a placeholder would have
 * inverted the whole point.
 */
export function ScenarioPanelLoading({ paths = 1 }: { paths?: number }) {
  return (
    <Frame>
      <IdentitySkeleton />
      <FieldSkeleton rows={2} />
      <div className="flex flex-col gap-1">
        <Skeleton className="h-3 w-12" />
        <div className="flex flex-col">
          {Array.from({ length: Math.max(1, paths) }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-2 border-b border-border py-2 last:border-b-0"
            >
              <Skeleton className="size-2.5 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

/** Service: a summary and the five business-model fields. */
export function ServicePanelLoading() {
  return (
    <Frame>
      <IdentitySkeleton />
      <FieldSkeleton rows={3} />
      {[0, 1, 2, 3, 4].map((key) => (
        <FieldSkeleton key={key} rows={2} />
      ))}
    </Frame>
  )
}
