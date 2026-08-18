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
          // `relative z-[1]`: when a path frame extends up to wrap this
          // row (single-path stacked, merged), the frame's opaque fill is
          // an absolutely-positioned later sibling — without a stacking
          // order the labels paint UNDER it and the header "vanishes".
          className="relative z-[1] flex min-w-0 items-end justify-center gap-1 overflow-hidden rounded-md px-2 pb-1.5"
          style={{ gridColumn: trackIndex + 2, gridRow: 1 }}
        >
          <span
            className="truncate text-xs font-medium text-muted-foreground"
            title={track.label}
          >
            {track.label}
          </span>
        </div>
      ))}
    </>
  )
}
