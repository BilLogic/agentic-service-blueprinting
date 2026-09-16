/**
 * How tall the slide sheet is, remembered across boots.
 *
 * The sheet was a fixed `max-h-56`. Five slides with three cited cells each
 * is more than 224px of card, so the rows that did not fit were reachable
 * only by scrolling INSIDE a strip that also scrolls sideways — two axes in
 * one small box, on the surface where slides are actually written.
 *
 * Same shape as `agent/placement.ts` and for the same reason: a drag writes
 * on every `pointermove`, and a synchronous `JSON.stringify` +
 * `localStorage` write per frame is a real cost for a value nobody reads
 * until the next boot. The gesture emits; only its end persists.
 */
import { storageKey } from '@/lib/storageNamespace'

/**
 * The key was a bare literal until it took the prefix `storageNamespace.ts`
 * owns, and taking it MOVES the key: a height saved before that reads once as
 * no height at all, and the sheet opens at its default.
 */
const STORAGE_KEY = storageKey('slide-sheet-height')

/** Two cards' worth, and enough of the third to say the strip continues. */
export const SLIDE_SHEET_MIN_HEIGHT = 140

/** Past this the sheet is the editor, and the canvas above it is a sliver. */
export const SLIDE_SHEET_MAX_HEIGHT = 560

export const SLIDE_SHEET_DEFAULT_HEIGHT = 224

function clamp(height: number): number {
  return Math.min(
    SLIDE_SHEET_MAX_HEIGHT,
    Math.max(SLIDE_SHEET_MIN_HEIGHT, Math.round(height)),
  )
}

function read(): number {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return SLIDE_SHEET_DEFAULT_HEIGHT
    const parsed = Number(stored)
    // A stored value from a taller window, or a hand-edited one, is clamped
    // rather than trusted: the sheet must not open past what the shell can
    // give it, and NaN must not become a height.
    return Number.isFinite(parsed) ? clamp(parsed) : SLIDE_SHEET_DEFAULT_HEIGHT
  } catch {
    // Private windows and blocked site data both throw here. A remembered
    // height is a nicety; the default is a correct answer.
    return SLIDE_SHEET_DEFAULT_HEIGHT
  }
}

// Read while this module evaluates, like the other stores the seam's header
// lists, and guarded the way they are: `window` is absent in Node, and the
// idiom says so rather than leaning on `read`'s catch to mean it.
let height = typeof window === 'undefined' ? SLIDE_SHEET_DEFAULT_HEIGHT : read()
const listeners = new Set<() => void>()

export function subscribeSlideSheetHeight(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSlideSheetHeight(): number {
  return height
}

/** During a drag. Emits, does not write. */
export function setSlideSheetHeight(next: number): void {
  const clamped = clamp(next)
  if (clamped === height) return
  height = clamped
  listeners.forEach((listener) => listener())
}

/** At the end of a gesture. */
export function persistSlideSheetHeight(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(height))
  } catch {
    // See `read`.
  }
}
