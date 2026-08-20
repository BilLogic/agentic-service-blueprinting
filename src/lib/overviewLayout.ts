/** Service overview canvas spacing — compact row/grid rhythm. */

/**
 * Horizontal breathing room between scenario panels in a phase row.
 * Large enough to keep adjacent hover/click targets visually separate after
 * the overview is scaled down, while still carrying the flow connector.
 */
export const OVERVIEW_SCENARIO_GAP = 360

/** Vertical gap between phase rows (excluding section insets). Generous:
 *  zoomed out, tight rows read as one undifferentiated wall and the phase
 *  badges collide with the row above. */
export const OVERVIEW_PHASE_ROW_GAP = 320

/**
 * Phase-frame padding around its scenario row. This exposed neutral band is
 * the phase-level interaction target, so it must read separately from the
 * scenario cards nested inside it.
 */
export const OVERVIEW_PHASE_SECTION_INSET = 120
export const OVERVIEW_PHASE_SECTION_TOP_INSET = 28
export const OVERVIEW_PHASE_SECTION_BOTTOM_INSET = 48

/** Downward flow arrow shaft area between overview phase rows. */
export const OVERVIEW_PHASE_FLOW_ARROW_HEIGHT =
  OVERVIEW_PHASE_ROW_GAP -
  OVERVIEW_PHASE_SECTION_BOTTOM_INSET -
  OVERVIEW_PHASE_SECTION_TOP_INSET

/** Canvas padding around the full overview stack. */
export const OVERVIEW_CANVAS_PADDING_Y = 32
export const OVERVIEW_CANVAS_PADDING_X = 32
