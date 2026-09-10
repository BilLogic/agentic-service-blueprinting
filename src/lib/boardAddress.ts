import { getPathColorKey } from '@/lib/pathColorTheme'
import { pickPreferredPath, type PathListItem } from '@/lib/pathSelection'
import { isSubslide, type NavItem, type SlideViewType } from '@/types/nav'

/**
 * A board's address — the phase, scenario, path selection and view mode that
 * say WHICH board a reader is looking at, as query params.
 *
 * The address bar used to stop at the service (`/plus-tutoring`), so a board
 * could not be sent to anyone, a reload started over at the overview, and back
 * left the app instead of stepping through the boards the reader had walked.
 *
 * ── WHY THE SEARCH AND NOT THE PATH ────────────────────────────────────────
 *
 * The prettier address is `/plus-tutoring/in-session/goal-setting`, and it is
 * not available: `phases`, `scenarios` and `paths` have no slug column — only
 * `services` does — so path segments would carry uuids, and minting slugs is a
 * new identity to keep unique rather than a way of writing down an existing
 * one. The first path segment is also the service's, written by the active
 * service store, which rebuilds the whole path from the slug and would drop
 * anything appended to it.
 *
 * So the board lives in the search, beside the view params `urlViewState.ts`
 * already owns, and `serviceRoute.ts` keeps the path to itself. The two halves
 * stay orthogonal, exactly as they were for `?cell=`.
 *
 * ── WHAT AN ABSENT PARAM MEANS ─────────────────────────────────────────────
 *
 * Absent is not a default spelled out; absent means "whatever this board says
 * about itself". No `view` means the layout the scenario remembers, no `paths`
 * means its happy-path default. That is what keeps a link honest as the
 * blueprint changes underneath it: a link written while the reader had made no
 * choice asserts no choice, and an editor who later re-lays a board out is not
 * overruled by every address ever copied. A param appears only when the reader
 * diverged from the board's own answer, and then it is a real statement about
 * what they were looking at, which the address is entitled to restore.
 *
 * `paths` repeats rather than joining with a separator: a path is identified by
 * `kind:name` and a name is free text in any language, so there is no character
 * a separator could claim. `paths=` present and empty is the one selection that
 * has to be spelled out — the reader turned every path off — because absence is
 * already spoken for.
 *
 * ── WHERE THE PARAM NAMES LIVE ─────────────────────────────────────────────
 *
 * Here, beside the only code that reads and writes them, and not with the
 * view params `urlViewState.ts` owns. That difference is about who else
 * produces a name: a deployment that lets an outside tool link INTO a board —
 * a bot citing a cell, an export writing share links — has to publish the
 * names that tool spells, and publishing a name is a promise not to rename it.
 * Nothing outside the app writes a board address, so these stay app-only, and
 * a deployment whose bot starts citing boards rather than cells moves them
 * into whatever module it publishes from.
 */

/** The board's query-param names. */
export const BOARD_PARAMS = {
  phase: 'phase',
  scenario: 'scenario',
  paths: 'paths',
  view: 'view',
} as const

export type BoardAddress = {
  /** Phase id, or null. Present as the fallback when the scenario is stale. */
  phaseId: string | null
  /** Scenario id, or null when the address names a phase or nothing. */
  scenarioId: string | null
  /**
   * Path identities (`kind:name`) shown on the addressed scenario's board.
   * `null` — unstated, so the scenario's own default stands. `[]` — the reader
   * turned them all off, which is a board and has to be sendable.
   */
  pathKeys: readonly string[] | null
  /** The layout the reader was looking at, when it differs from the row's. */
  view: SlideViewType | null
}

export const EMPTY_BOARD_ADDRESS: BoardAddress = {
  phaseId: null,
  scenarioId: null,
  pathKeys: null,
  view: null,
}

export function isEmptyBoardAddress(address: BoardAddress): boolean {
  return (
    address.phaseId === null &&
    address.scenarioId === null &&
    address.pathKeys === null &&
    address.view === null
  )
}

function sameKeys(
  a: readonly string[] | null,
  b: readonly string[] | null,
): boolean {
  if (a === null || b === null) return a === b
  return a.length === b.length && a.every((key, index) => key === b[index])
}

function sameAddress(a: BoardAddress, b: BoardAddress): boolean {
  return (
    a.phaseId === b.phaseId &&
    a.scenarioId === b.scenarioId &&
    a.view === b.view &&
    sameKeys(a.pathKeys, b.pathKeys)
  )
}

/** Parse a location search string. Unknown values are dropped, never thrown. */
export function parseBoardAddress(search: string): BoardAddress {
  const params = new URLSearchParams(search)
  const raw = params.getAll(BOARD_PARAMS.paths)
  const view = params.get(BOARD_PARAMS.view)

  return {
    phaseId: params.get(BOARD_PARAMS.phase) || null,
    scenarioId: params.get(BOARD_PARAMS.scenario) || null,
    // One empty value is the deliberate "no paths shown"; anything else is the
    // list, minus blanks a hand-edited URL may have left behind.
    pathKeys:
      raw.length === 0 ? null : raw.filter((key) => key.length > 0),
    view: view === 'stacked' || view === 'merged' ? view : null,
  }
}

/** Write the board's params onto a search the caller is building. */
export function appendBoardParams(
  params: URLSearchParams,
  address: BoardAddress,
): void {
  if (address.phaseId) params.set(BOARD_PARAMS.phase, address.phaseId)
  if (address.scenarioId) params.set(BOARD_PARAMS.scenario, address.scenarioId)
  if (address.pathKeys !== null) {
    if (address.pathKeys.length === 0) params.append(BOARD_PARAMS.paths, '')
    for (const key of address.pathKeys) params.append(BOARD_PARAMS.paths, key)
  }
  if (address.view) params.set(BOARD_PARAMS.view, address.view)
}

/** Every path identity a scenario offers, deduped, in catalog order. */
export function pathKeysForScenario(paths: readonly PathListItem[]): string[] {
  const keys: string[] = []
  for (const path of paths) {
    const key = getPathColorKey(path)
    if (!keys.includes(key)) keys.push(key)
  }
  return keys
}

/**
 * The path identities the address should carry for one scenario, or `null`
 * when the board is showing the scenario's own default and has nothing to say.
 */
export function boardPathKeys(
  paths: readonly PathListItem[],
  activePathKeys: readonly string[],
): string[] | null {
  if (paths.length === 0) return null
  const shown = pathKeysForScenario(paths).filter((key) =>
    activePathKeys.includes(key),
  )
  const preferred = pickPreferredPath(paths)
  const fallback = preferred ? [getPathColorKey(preferred)] : []
  if (
    shown.length === fallback.length &&
    shown.every((key) => fallback.includes(key))
  ) {
    return null
  }
  return shown
}

/**
 * The path identities to apply on arrival, or `null` to leave the board alone.
 *
 * An address naming paths this scenario does not have is a stale link, not an
 * instruction to empty the board: when nothing it names resolves, the
 * scenario's default stands. When some of it resolves, those are honoured and
 * the rest is dropped — the nearest valid board, the same rule a stale
 * scenario id follows. An address that named NO paths meant it.
 */
export function resolvePathKeys(
  paths: readonly PathListItem[],
  wanted: readonly string[],
): string[] | null {
  if (wanted.length === 0) return []
  const known = pathKeysForScenario(paths)
  const resolved = wanted.filter((key) => known.includes(key))
  return resolved.length === 0 ? null : resolved
}

export type BoardTarget = {
  phaseId: string | null
  scenarioId: string | null
}

/**
 * The nearest valid board an address names.
 *
 * A scenario that no longer exists degrades to its phase, and a phase that no
 * longer exists degrades to nothing — the service overview, which is where a
 * reader who followed a dead link should land rather than on a blank canvas or
 * an error. The scenario wins over the phase when both resolve and disagree:
 * the deeper of the two is the board, and the phase is only ever the parachute.
 */
export function resolveBoardTarget(
  slides: readonly NavItem[],
  address: BoardAddress,
): BoardTarget {
  const scenario = address.scenarioId
    ? slides.find(
        (slide) => slide.id === address.scenarioId && isSubslide(slide),
      )
    : undefined
  if (scenario) return { phaseId: scenario.parentId ?? null, scenarioId: scenario.id }

  const phase = address.phaseId
    ? slides.find((slide) => slide.id === address.phaseId && !isSubslide(slide))
    : undefined
  if (phase) return { phaseId: phase.id, scenarioId: null }

  return { phaseId: null, scenarioId: null }
}

/**
 * The address as a module-level fact, so the URL writers can reach it.
 *
 * `ViewStateContext` writes the search whenever a tab or the open cell changes
 * and is mounted above everything that knows which board is on screen, so it
 * cannot be handed the address as a prop or read it from context. This is the
 * same shape and the same reason as `openCellStore`: one module fact, one write
 * path, read at serialize time by whoever is writing the URL — so a cell
 * opening can never blank the board out of the address bar.
 */
let current: BoardAddress = EMPTY_BOARD_ADDRESS

const listeners = new Set<() => void>()

export function getBoardAddress(): BoardAddress {
  return current
}

export function subscribeBoardAddress(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The one write path. */
export function setBoardAddress(next: BoardAddress): void {
  if (sameAddress(current, next)) return
  current = next
  for (const listener of listeners) listener()
}
