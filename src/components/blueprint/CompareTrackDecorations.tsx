import {
  LAYER_COLUMN_WIDTH,
  STEP_COLUMN_GAP,
  STEP_COLUMN_WIDTH,
} from '@/lib/blueprintLayout'
import { COMPARE_STEP_HEADER_HEIGHT } from '@/lib/sideBySideCompareLayout'
import type { CompareGridTrack } from '@/lib/compareGridTracks'

/**
 * The chrome that belongs to the compare column AXIS rather than to any one
 * path: the step-name header row. Both compare canvases (stacked bands,
 * merged grid) draw the same axis, so they draw it with the same component.
 * (Pleats and the divergent-column tint were retired 2026-08-17.)
 */

/** Step names above the canvas. */
export function CompareStepHeaderRow({
  tracks,
}: {
  tracks: readonly CompareGridTrack[]
}) {
  return (
    <>
      {tracks.map((track, trackIndex) => (
        <div
          key={track.key}
          data-blueprint-column-header=""
          // `relative z-[1]`: when a path frame extends up to wrap this
          // row (single-path stacked, merged), the frame's opaque fill is
          // an absolutely-positioned later sibling — without a stacking
          // order the labels paint UNDER it and the header "vanishes".
          className="relative z-[1] flex min-w-0 items-end justify-center gap-1 overflow-hidden rounded-md px-2 pb-1.5"
          style={{ gridColumn: trackIndex + 2, gridRow: 1 }}
        >
          <span
            className="relative truncate text-xs font-medium text-muted-foreground"
            title={track.label}
          >
            {track.label}
          </span>
        </div>
      ))}
    </>
  )
}

/** Single-path equivalent of the compare step axis; geometry never depends on focus. */
export function ServiceStepHeaderRow({
  steps,
  playGutter = 0,
}: {
  steps: readonly { id: string; name: string }[]
  playGutter?: number
}) {
  return (
    <div
      className="flex shrink-0 items-stretch"
      style={{ height: COMPARE_STEP_HEADER_HEIGHT }}
      data-blueprint-column-header-row=""
    >
      <div
        aria-hidden
        className="shrink-0"
        style={{ width: LAYER_COLUMN_WIDTH + playGutter }}
      />
      {steps.map((step, index) => (
        <div key={step.id} className="flex shrink-0 items-end justify-center">
          <div
            data-blueprint-column-header=""
            className="relative flex min-w-0 items-end justify-center overflow-hidden rounded-md px-2 pb-1.5"
            style={{ width: STEP_COLUMN_WIDTH }}
          >
            <span
              className="relative truncate text-xs font-medium text-muted-foreground"
              title={step.name}
            >
              {step.name}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div
              aria-hidden
              className="shrink-0"
              style={{ width: STEP_COLUMN_GAP }}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}
