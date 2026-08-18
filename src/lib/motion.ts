/**
 * The app's motion vocabulary, in one place.
 *
 * Everything derives from the sidebar collapse — the one motion that was
 * already right — so structural moves, crossfades and camera eases all read
 * as the same system rather than as per-screen inventions.
 *
 * The CSS side of these numbers lives in `styles/animations.css` as the
 * `--motion-*` tokens (plus `--ease-structural` in `@theme`); the values here
 * are for the JS that has to wait for them. A drift test pins the two files
 * to each other — change both or the suite fails.
 */

/** Structural width/size changes (sidebar collapse, presentation wipe). */
export const MOTION_STRUCTURAL_MS = 320
export const MOTION_STRUCTURAL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

/** Opacity crossfades, and the stagger between an out/in pair. */
export const MOTION_FADE_MS = 200
export const MOTION_FADE_STAGGER_MS = 75

/** Camera eases (rAF, `easeInOutCubic`). */
export const MOTION_CAMERA_MS = 420

/** Micro-interactions: hover, badges, threshold fades. */
export const MOTION_MICRO_MS = 150

/**
 * The step between rungs of the shell's entrance ladder — rail, then panel,
 * then the agent dock, each one beat behind the last.
 *
 * Shorter than {@link MOTION_FADE_STAGGER_MS}, and deliberately so: 75 ms is
 * the gap between an element leaving and its replacement arriving, where the
 * eye needs to read a handover. This is three parts of ONE surface arriving,
 * where the gap only has to be long enough to feel ordered — a ladder, not
 * three separate events.
 */
export const SHELL_ENTRANCE_STEP_MS = 50

/**
 * Read live rather than at mount: the OS setting can change mid-session and
 * every move should honor the current value.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
