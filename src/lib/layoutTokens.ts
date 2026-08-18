/**
 * Shell layout dimensions whose values live in TypeScript because runtime
 * math depends on them (drag clamps, persistence, viewport clamping) —
 * CSS custom properties cannot serve a `Math.min`. Widths that only feed
 * class names (the cell panel's two postures) are tokens in
 * `styles/theme.css` instead; each value has exactly one home.
 */

/** The icon rail at the sidebar's left edge (matches `w-12`). */
export const RAIL_WIDTH = 48

// ONE width for all three sidebar surfaces — Blueprints, Slices, and Agent
// share the same panel column, and a width that jumps on every rail switch
// reads as layout instability, not per-surface tailoring. Still
// drag-resizable; the chosen width applies everywhere and persists as a
// single value.
export const SIDEBAR_DEFAULT_WIDTH = 320
export const SIDEBAR_MIN_WIDTH = 240
export const SIDEBAR_MAX_WIDTH = 640

/** The agent's floating window: birth position/size, and how small the
 * corner drag may make it before the chat inside stops being usable.
 * `as const` so no consumer can write through the shared objects. */
export const AGENT_FLOAT_DEFAULT = {
  x: 360,
  y: 96,
  width: 380,
  height: 460,
} as const
export const AGENT_FLOAT_MIN = { width: 280, height: 240 } as const
