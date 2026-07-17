import { SLIDE_GAP } from '@/lib/slideLayout'

/** Horizontal padding inside a phase section on the service overview canvas. */
export const PHASE_SECTION_INSET = 24
/** Extra top inset so the title badge sits on the section border (Figma-style). */
export const PHASE_SECTION_TOP_INSET = 28
/** Bottom padding below scenario panels inside the section frame. */
export const PHASE_SECTION_BOTTOM_INSET = 24

/** Vertical distance from one phase frame edge to the next (layout gap). */
export const PHASE_FLOW_ARROW_HEIGHT =
  SLIDE_GAP - PHASE_SECTION_BOTTOM_INSET - PHASE_SECTION_TOP_INSET
