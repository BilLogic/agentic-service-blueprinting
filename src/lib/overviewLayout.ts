/** Service overview canvas spacing — compact row/grid rhythm. */

/**
 * Horizontal gap between scenario panels in a phase row. Wide enough that,
 * scaled down to overview zoom, neighbouring panels are still separate hover
 * and click targets, with room left for the flow connector between them.
 */
export const OVERVIEW_SCENARIO_GAP = 360

/** Vertical gap between phase rows (excluding section insets). Generous:
 *  zoomed out, tight rows read as one undifferentiated wall and the phase
 *  badges collide with the row above. */
export const OVERVIEW_PHASE_ROW_GAP = 320

/**
 * Phase frame padding around its scenario row. The exposed band is the
 * phase's own target — hover and click open the phase — so it has to read as
 * separate from the scenario panels nested inside it.
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
