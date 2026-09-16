import type { CSSProperties } from 'react'

/**
 * Focus-mode dim: one TypeScript owner, CSS receives the numbers.
 *
 * Rest 0.3 / hover 0.7 is the canvas contract — de-emphasis you can still
 * read as "there", then a lift that is not yet the focused board. The
 * values live here because runtime math (the camera flight) and the
 * stylesheet both need them, and a comment forbidding a second copy cannot
 * sit above three literals.
 */

/** Opacity of a phase/scenario that is not the focus. */
export const FOCUS_DIM_OPACITY = 0.3

/** Opacity of a dimmed phase/scenario under hover or keyboard focus. */
export const FOCUS_DIM_HOVER_OPACITY = 0.7

/**
 * Custom properties the stylesheet and dimmed class strings read, so a
 * call site never restates the number.
 */
export const FOCUS_DIM_STYLE: CSSProperties = {
  '--focus-dim-opacity': String(FOCUS_DIM_OPACITY),
  '--focus-dim-hover-opacity': String(FOCUS_DIM_HOVER_OPACITY),
} as CSSProperties

/** Rest dim — the custom property TypeScript owns. */
export const FOCUS_DIM_REST_CLASS = '[opacity:var(--focus-dim-opacity)]'

/** Hover / focus-within lift, applied only when the dimmed card is a target. */
export const FOCUS_DIM_LIFT_CLASS =
  'hover:[opacity:var(--focus-dim-hover-opacity)] focus-within:[opacity:var(--focus-dim-hover-opacity)]'

/** Rest plus lift, for empty-state wrappers that are themselves the target. */
export const FOCUS_DIM_CLASS = `${FOCUS_DIM_REST_CLASS} ${FOCUS_DIM_LIFT_CLASS}`
