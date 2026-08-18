import type { PickMode } from '@/contexts/cellPickContext'
import { isSameBlueprintCellSelection } from '@/lib/blueprintCellSelection'
import type {
  BlueprintCellSelection,
  BlueprintPanelSurface,
} from '@/types/blueprintCellDetail'

/**
 * What a modifier means when a cell is clicked.
 *
 * One function, so the answer cannot differ between the cell button, the
 * marquee and anything added later. It was previously spread across three
 * call sites with slightly different opinions, which is exactly how a
 * selection grammar becomes "messy": every gesture was individually
 * defensible and no two agreed.
 *
 * ## The grammar, and where it departs from Figma
 *
 * | gesture              | Figma (canvas)     | here                        |
 * | -------------------- | ------------------ | --------------------------- |
 * | click                | replace            | **toggle**                  |
 * | ⇧ click              | add / toggle       | **range** from the anchor   |
 * | ⌘ / ctrl click       | deep-select child  | **open the detail panel**   |
 * | double click         | enter/edit         | nothing (two toggles)       |
 * | ⇧ drag (marquee)     | add to selection   | add                         |
 * | drag (marquee)       | replace            | replace                     |
 * | click empty canvas   | clear              | **nothing**                 |
 *
 * The departures share one reason: this selection is a **set being
 * assembled** over minutes, with exactly one verb at the end of it — make a
 * slice. Figma's grammar assumes the opposite, a selection that is the
 * subject of the next of many verbs, held for seconds.
 *
 * - **Click toggles rather than replaces.** Replace-on-click means the set can
 *   never be built by clicking; it can only be built by holding a modifier for
 *   every cell after the first, which nothing tells you.
 * - **Empty canvas does not clear.** A miss between two cells would throw away
 *   minutes of work gathered across blueprints. The ✕ in the bar clears.
 * - **⌘-click opens the detail panel, and double-click means nothing.**
 *   Opening a cell needs a deliberate gesture while plain clicks pick, and
 *   double-click cannot be that gesture in a toggle grammar: click-in,
 *   click-out *is* a fast double-click, so the two are indistinguishable by
 *   construction — reading a cell kept flipping its membership. A held
 *   modifier cannot be produced by clicking fast. Right-click → "View cell
 *   detail" is the discoverable route to the same place.
 *
 * Unpicking is always the same gesture as picking: click a picked cell and it
 * leaves. `range` is the one mode that cannot unpick, which is correct — a
 * range is a reach, not a toggle, and Figma's shift-range does not unpick
 * either.
 *
 * The detail panel follows the same rule as of this change: a bare click on
 * the cell the panel is already showing closes it (`detailClickCloses`). One
 * gesture, one meaning — "click a thing that is already on to turn it off" —
 * rather than the panel being the single surface you could only leave via ✕.
 */
export type ClickModifiers = {
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
}

export function pickModeForClick(
  event: ClickModifiers,
  /** A picker that is not gathering has no run to reach across. */
  gathers: boolean,
): PickMode {
  if (event.shiftKey) return gathers ? 'range' : 'toggle'
  return 'toggle'
}

/**
 * True when this click asks to *read* the cell rather than pick it.
 * The one gesture that must not be producible by clicking fast.
 */
export function clickOpensDetail(event: ClickModifiers): boolean {
  return event.metaKey || event.ctrlKey
}

export type DetailClickContext = {
  event: ClickModifiers & {
    /**
     * `false` for a synthetic click. The agent's `open_cell_panel` opens the
     * panel by dispatching a `MouseEvent` on the real cell — deliberately,
     * so there is no parallel code path to drift — which means the agent's
     * "open" and the human's "open" arrive at the same handler. This flag is
     * what tells them apart.
     */
    isTrusted: boolean
  }
  /** The surface the panel is showing, or `null` when it is closed. */
  openSurface: BlueprintPanelSurface | null
  /** What the panel currently has selected. `null` while closed or on a draft. */
  current: BlueprintCellSelection | null
  /** The cell that was just clicked. */
  next: BlueprintCellSelection
}

/**
 * True when this click means "close the panel" rather than "open this cell".
 *
 * Clicking the cell the panel is already showing closes it — the same
 * click-in/click-out shape the picker's `toggle` mode has, now on the detail
 * panel. Everything else opens, and four cases deliberately do NOT toggle:
 *
 * - **⌘/ctrl-click.** The grammar's read gesture is "open detail, touch
 *   nothing", and closing is touching something. It also has to keep working
 *   when a picker is armed, where it is the only route to the panel.
 * - **Synthetic clicks.** `open_cell_panel` must stay idempotent: an agent
 *   asked to open a cell that is already open should leave it open, not
 *   close it behind the user's back. Agent parity means the agent can reach
 *   every surface, not that it inherits every human reflex.
 * - **The `differences` surface.** The compare ledger can be open while a
 *   cell is still selected underneath it. Closing the whole panel when the
 *   thing on screen is not even the cell would be a non sequitur; the click
 *   swaps to `details` instead, which is what `openSurface !== 'details'`
 *   falling through to "open" does.
 * - **A draft cell.** A draft and a selection are mutually exclusive, so
 *   `current` is `null` whenever a draft is open and the equality check below
 *   can never match — the click opens the clicked cell, exactly as before.
 */
export function detailClickCloses({
  event,
  openSurface,
  current,
  next,
}: DetailClickContext): boolean {
  if (!event.isTrusted) return false
  if (clickOpensDetail(event)) return false
  if (openSurface !== 'details') return false
  return isSameBlueprintCellSelection(current, next)
}

/** Marquee: a bare sweep says "these", shift says "these as well". */
export function pickModeForMarquee(event: { shiftKey: boolean }): PickMode {
  return event.shiftKey ? 'add' : 'replace'
}

/**
 * Does this click belong to the picker at all?
 *
 * In Design mode every plain or shift click picks; ⌘/ctrl never does — it is
 * the open-detail gesture and must not also touch the selection.
 */
export function clickPicks(
  event: ClickModifiers,
  plainClick: boolean,
): boolean {
  if (clickOpensDetail(event)) return false
  return plainClick || event.shiftKey
}
