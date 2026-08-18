/**
 * The reveal's stage ladder, named once.
 *
 * The 0-5 sequence is spoken in three places — this module, the canvas's
 * React state, and `[data-canvas-reveal='N']` in blueprint.css. Naming the
 * rungs here gives the first two one vocabulary, and `motion.test.ts` pins
 * the third to it, so inserting a stage cannot leave three of four edits
 * correct and the suite green.
 *
 * There is deliberately NO store here. An earlier cut published the stage
 * through a module-level store on the grounds that the canvas and the
 * sidebar were "several providers apart" — they are not: both are rendered
 * by `DesktopEditorShell`, with nothing between them. A callback prop does
 * the same work without process-global mutable state whose failure mode is
 * an opaque skeleton stranded over live UI.
 */

/** Nothing painted: the camera's working room, behind the loading bar. */
export const CANVAS_REVEAL_STAGING = 0
/** Phase frames and lane structure. */
export const CANVAS_REVEAL_LANES = 1
/** Scenario panels rise in. */
export const CANVAS_REVEAL_PANELS = 2
/** Cells fade in. */
export const CANVAS_REVEAL_CELLS = 3
/** Trigger arrows fade in — the last layer. */
export const CANVAS_REVEAL_ARROWS = 4
/** The reveal has finished (or was never running); the attribute is dropped. */
export const CANVAS_REVEAL_DONE = 5
