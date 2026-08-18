/**
 * URL view state — the one module that owns the view query-param names.
 *
 * Params: `slice` (slice id), `mode` (`present` only; absence of `mode` with a
 * `slice` param means slice focus view), `frame` (presentation frame index),
 * `cell` (cell id — reserved for the base blueprint's share link). Unknown
 * params are ignored on parse and dropped on serialize.
 *
 * `cell` belongs to the BASE view — a slice tab is a different reading of the
 * blueprint, so `slice` wins and `cell` is dropped when both appear rather
 * than opening a panel behind a tab.
 */

/** The view query-param vocabulary. External consumers (bots, docs) build
 * links against these names — change them only with a migration story. */
const PARAMS = {
  slice: 'slice',
  mode: 'mode',
  frame: 'frame',
  cell: 'cell',
} as const

export type UrlViewState =
  | { kind: 'blueprint'; cellId?: string }
  | { kind: 'slice'; sliceId: string }
  | { kind: 'present'; sliceId: string; frame: number }

/** Malformed or missing frames parse to 0; negative integers clamp to 0. */
function parseFrameParam(raw: string | null): number {
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
      return { kind: 'present', sliceId, frame: parseFrameParam(params.get(PARAMS.frame)) }
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
      params.set(PARAMS.frame, String(Math.max(0, Math.trunc(state.frame))))
      break
  }

  const search = params.toString()
  return search ? `?${search}` : ''
}
