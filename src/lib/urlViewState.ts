/**
 * URL view state — the one module that owns the view query-param names.
 *
 * Params: `slice` (slice id), `mode` (`present` only; absence of `mode` with a
 * `slice` param means slice focus view), `slide` (presentation slide index),
 * `cell` (cell id — opens the base blueprint with that cell's panel showing).
 * Unknown params are ignored on parse and dropped on serialize.
 *
 * `cell` is the share link an outside tool hands back: the agent's
 * blueprint_search cites a cell and attaches `…/?cell=<id>` so a reader can
 * open the exact cell it quoted. It belongs to the BASE view — a
 * slice tab is a different reading of the blueprint, so `slice` wins and `cell`
 * is dropped when both appear rather than opening a panel behind a tab.
 */

/*
 * The deep-link vocabulary, declared once. Anything that builds a link into
 * this app — the agent's citations, a share button, an external integration —
 * spells the params the same way, so keeping them in one object is what makes
 * "the link format" a thing that can be read rather than grepped for.
 */
const PARAMS = {
  cell: 'cell',
  slice: 'slice',
  mode: 'mode',
  slide: 'slide',
} as const

/**
 * The spelling this param had until this rename, still READ and never written.
 *
 * A present link is a thing people paste into a chat, so the old spelling has
 * to keep resolving. It costs one `??`, and it is what stops the rename from
 * quietly sending every existing link to slide 1.
 */
const RETIRED_SLIDE_PARAM = 'frame'

export type UrlViewState =
  | { kind: 'blueprint'; cellId?: string }
  | { kind: 'slice'; sliceId: string }
  | { kind: 'present'; sliceId: string; slide: number }

/** Malformed or missing indexes parse to 0; negative integers clamp to 0. */
function parseSlideParam(raw: string | null): number {
  if (raw === null) return 0
  const value = Number(raw)
  if (!Number.isInteger(value)) return 0
  return value < 0 ? 0 : value
}

/** Parse a location search string; null when no view params are present. */
export function parseUrlViewState(search: string): UrlViewState | null {
  const params = new URLSearchParams(search)
  const sliceId = params.get(PARAMS.slice)

  if (sliceId) {
    if (params.get(PARAMS.mode) === 'present') {
      return {
        kind: 'present',
        sliceId,
        slide: parseSlideParam(
          params.get(PARAMS.slide) ?? params.get(RETIRED_SLIDE_PARAM),
        ),
      }
    }
    return { kind: 'slice', sliceId }
  }

  const cellId = params.get(PARAMS.cell)
  if (cellId) return { kind: 'blueprint', cellId }

  return null
}

/** Serialize to a search string ('' for the plain blueprint view). */
export function serializeUrlViewState(state: UrlViewState): string {
  const params = new URLSearchParams()

  switch (state.kind) {
    case 'blueprint':
      if (state.cellId) params.set(PARAMS.cell, state.cellId)
      break
    case 'slice':
      params.set(PARAMS.slice, state.sliceId)
      break
    case 'present':
      params.set(PARAMS.slice, state.sliceId)
      params.set(PARAMS.mode, 'present')
      params.set(PARAMS.slide, String(Math.max(0, Math.trunc(state.slide))))
      break
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}
