import type { BlueprintLayer } from '@/types/blueprint'
import {
  BLUEPRINT_CELL_BORDER_COLOR,
  type BlueprintLaneRole,
} from '@/lib/blueprintCellStyle'
import {
  shouldShowInteractionLineAfter,
  shouldShowVisibilityLineAfter,
} from '@/lib/blueprintLayout'

/**
 * Board chrome — the frame the blueprint is drawn in.
 *
 * Every value references a step in colors.css. `slate` is the cool grey and
 * `gray` the pure neutral, chosen per token by which one the previous literal
 * sat closest to; relative ordering is preserved where it carries meaning, so a
 * hover is still darker than its base.
 *
 * These are inlined through `style` rather than applied as classes because the
 * board composes them into gradients and SVG attributes, but they are `var()`
 * either way — the board is on the same tokens as the rest of the app, and
 * follows the theme with it.
 *
 * THIRTEEN, NOT THIRTY. Seventeen keys used to sit here that nothing read.
 *
 * Fourteen were the phase-frame, scenario-badge and panel-hover chrome, stale
 * since that chrome moved into `blueprint.css` as real CSS rules —
 * `[data-phase-scenario-panel]`, `[data-phase-title-badge]` and friends own
 * those colours now, and a hover in CSS cannot consult a TypeScript constant.
 * Two more, `canvasDark` and `labelRailDark`, were a JavaScript answer to a
 * question CSS had already taken over: the theme flips in the stylesheet, so
 * nothing here has to pick its own dark variant. The last three were the panel
 * hover values, whose only reader was a helper the CSS rule replaced.
 *
 * The rule that keeps it at thirteen: if a colour can be expressed as a CSS
 * rule, it belongs in `blueprint.css`. What stays is only what the board
 * composes at runtime into a gradient stop or an SVG attribute, where there is
 * no selector to write.
 *
 * Two of the thirteen name a semantic token rather than a primitive, because a
 * semantic one says the same thing: the board's content surface *is* the app's
 * canvas, measured at Δ4/255 from `--canvas` in both themes. The other eleven
 * stay on primitives on purpose — they are a slate-tinted grey ladder with no
 * equivalent in the neutral semantic set (the nearest match to `divider` is off
 * by Δ97), and minting eleven semantic names to describe one board's chrome
 * would grow the token vocabulary to fit a single consumer.
 */
export const BLUEPRINT_THEME = {
  /** Blueprint content surface — path sections, cells, swim lanes. */
  canvas: 'var(--canvas)',
  /** Blueprint shell — label column, panel padding, compare chrome. */
  labelRail: 'var(--color-slate-500)',
  canvasBorder: 'var(--color-slate-700)',
  divider: 'var(--color-slate-800)',
  dividerLabel: 'var(--color-gray-900)',
  /** Figma-style interaction / visibility line tag. */
  dividerTagBg: 'var(--color-slate-1200)',
  dividerBg: 'var(--color-slate-500)',
  cellText: 'var(--color-slate-1200)',
  headerText: 'var(--color-gray-1200)',
  /** Thin rules between swim lanes — light grey, visible on canvas and label rail. */
  laneDivider: 'var(--color-slate-700)',
  arrow: 'var(--color-gray-900)',
  /** Side-by-side compare path sections (Figma-style grouping). */
  sectionFill: 'var(--canvas)',
  /** Outermost slide/canvas workspace — sits behind blueprint panels. */
  viewportPad: 'var(--color-gray-300)',
} as const

/** Set on interactive compare panels; children inherit label-rail hover. */
export const BLUEPRINT_PANEL_LABEL_RAIL_VAR = '--background-blueprint-panel-label-rail'
/** White swimlane / path section surfaces inside interactive panels. */
export const BLUEPRINT_PANEL_CANVAS_VAR = '--background-blueprint-panel-canvas'
export const BLUEPRINT_PANEL_SECTION_FILL_VAR = '--background-blueprint-panel-section'
/** Divider row backgrounds (interaction / visibility bands). */
export const BLUEPRINT_PANEL_DIVIDER_BG_VAR = '--background-blueprint-panel-divider'

export function blueprintPanelLabelRailColor(
  fallback: string = BLUEPRINT_THEME.labelRail,
): string {
  return `var(${BLUEPRINT_PANEL_LABEL_RAIL_VAR}, ${fallback})`
}

export function blueprintPanelCanvasColor(
  fallback: string = BLUEPRINT_THEME.canvas,
): string {
  return `var(${BLUEPRINT_PANEL_CANVAS_VAR}, ${fallback})`
}

export function blueprintPanelSectionFillColor(
  fallback: string = BLUEPRINT_THEME.sectionFill,
): string {
  return `var(${BLUEPRINT_PANEL_SECTION_FILL_VAR}, ${fallback})`
}

export function blueprintPanelDividerBgColor(
  fallback: string = BLUEPRINT_THEME.dividerBg,
): string {
  return `var(${BLUEPRINT_PANEL_DIVIDER_BG_VAR}, ${fallback})`
}

/*
 * There is no `getBlueprintPanelHoverCssVars()` any more. It set the four vars
 * above from React state on hover; `blueprint.css` now sets them in the
 * `[data-phase-scenario-panel]:hover` rule, which is both fewer moving parts
 * and the reason the old React version was removed — a pure-CSS hover cannot
 * go stale the way a hover held in state can.
 */

/**
 * Lane identity — the Radix family each swim lane is drawn from. The steps of
 * that family then supply the surface, hover, pressed, ring and text (see
 * `CELL_STEP`), so a lane is one name rather than five values.
 *
 * The keys are the vocabulary the lane map and Figma share, which is why they
 * survive the move from hex to family. `lime` exists in colors.css only for
 * `chartreuse`: the families Supabase ships leave a gap between amber (40°) and
 * green (140°), and folding that lane into yellow would seat it next to `cream`.
 */
/**
 * The lane set — eight hues plus a neutral, and the board draws from these only.
 *
 * Every other coloured thing on the canvas (annotations, path frames) picks from
 * this list rather than reaching into all eighteen families. A smaller set is
 * what makes the board read as one system instead of a swatch dump.
 *
 * Lanes used to carry their own names — `chartreuse`, `cream`, `powderBlue` —
 * that stopped matching the family behind them once the fills became scale
 * steps. `chartreuse` was `lime`; reading one next to the other invited the
 * reasonable conclusion that the board was off-palette. The names are gone.
 */

export type BlueprintLayerStyle = {
  /** What this lane is. blueprint.css turns the role into its steps. */
  lane: BlueprintLaneRole
  laneLabel: BlueprintLaneRole
  label: string
  accent: string
  accentMuted: BlueprintLaneRole
}

/**
 * Label column text tones — step 1200, the high-contrast text step, in a family
 * that echoes the section's lanes. Previously three invented dark hexes.
 */
export const BLUEPRINT_LABEL_TEXT = {
  frontstage: 'var(--color-green-1200)',
  customerFacing: 'var(--color-purple-1200)',
  backstage: 'var(--color-gold-1200)',
} as const

export type BlueprintLabelSection =
  | 'frontstage'
  | 'customerFacing'
  | 'backstage'

export function getBlueprintLabelSection(
  layer: BlueprintLayer,
  layers: BlueprintLayer[],
): BlueprintLabelSection {
  if (isBackstageBlueprintLayer(layer, layers)) {
    return 'backstage'
  }

  const layerIndex = layers.findIndex((entry) => entry.id === layer.id)
  const interactionAfterIndex = layers.findIndex((entry) =>
    shouldShowInteractionLineAfter(entry),
  )
  const visibilityAfterIndex = layers.findIndex((entry) =>
    shouldShowVisibilityLineAfter(entry, layers),
  )

  if (
    interactionAfterIndex !== -1 &&
    layerIndex > interactionAfterIndex &&
    (visibilityAfterIndex === -1 || layerIndex <= visibilityAfterIndex)
  ) {
    return 'customerFacing'
  }

  return 'frontstage'
}

export function getBlueprintLabelTextColor(
  section: BlueprintLabelSection,
): string {
  switch (section) {
    case 'frontstage':
      return BLUEPRINT_LABEL_TEXT.frontstage
    case 'customerFacing':
      return BLUEPRINT_LABEL_TEXT.customerFacing
    case 'backstage':
      return BLUEPRINT_LABEL_TEXT.backstage
  }
}

function cellStyleFromFill(
  fill: BlueprintLaneRole,
  label: string = BLUEPRINT_LABEL_TEXT.frontstage,
): BlueprintLayerStyle {
  return {
    lane: fill,
    laneLabel: fill,
    label,
    accent: BLUEPRINT_CELL_BORDER_COLOR,
    accentMuted: fill,
  }
}

const LAYER_STYLES: Record<string, BlueprintLayerStyle> = {
  Visual: cellStyleFromFill('visual'),
  'Step Visual': cellStyleFromFill('visual'),
  'Front Stage Tech': cellStyleFromFill('frontstage-tech',
    BLUEPRINT_LABEL_TEXT.customerFacing,
  ),
  'Front Stage Actions': cellStyleFromFill('frontstage-action',
    BLUEPRINT_LABEL_TEXT.customerFacing,
  ),
  'Back Stage Actions': cellStyleFromFill('frontstage-action',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Back Stage Tech': cellStyleFromFill('frontstage-tech',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Support Actions': cellStyleFromFill('support',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Physical Evidence': cellStyleFromFill('evidence',
    BLUEPRINT_LABEL_TEXT.frontstage,
  ),
  'Customer Actions': cellStyleFromFill('actor',
    BLUEPRINT_LABEL_TEXT.frontstage,
  ),
  'Frontstage Actions': cellStyleFromFill('frontstage-tech',
    BLUEPRINT_LABEL_TEXT.customerFacing,
  ),
  'Backstage Actions': cellStyleFromFill('backstage-action',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Tech Support Actions': cellStyleFromFill('backstage-action',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Management Actions': cellStyleFromFill('backstage-action',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  'Computer Systems': cellStyleFromFill('actor',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
}

const FRONTSTAGE_FALLBACK: BlueprintLayerStyle = cellStyleFromFill('support',
  BLUEPRINT_LABEL_TEXT.frontstage,
)

const BACKSTAGE_FALLBACK: BlueprintLayerStyle = cellStyleFromFill('support',
  BLUEPRINT_LABEL_TEXT.backstage,
)

/**
 * Canonical cell fills keyed by `layer_role` — the intentional coloring system.
 * Roles are locale-independent, so non-English lane labels still color correctly
 * (name-keyed `LAYER_STYLES` above is the legacy fallback for pre-role content).
 */
const ROLE_STYLES: Record<string, BlueprintLayerStyle> = {
  visual: cellStyleFromFill('visual'),
  step_visual: cellStyleFromFill('visual'),
  journey_stage: cellStyleFromFill('visual'),
  physical_evidence: cellStyleFromFill('evidence'),
  customer_actions: cellStyleFromFill('actor',
    BLUEPRINT_LABEL_TEXT.frontstage,
  ),
  frontstage_tech: cellStyleFromFill('frontstage-tech',
    BLUEPRINT_LABEL_TEXT.customerFacing,
  ),
  frontstage_actions: cellStyleFromFill('frontstage-action',
    BLUEPRINT_LABEL_TEXT.customerFacing,
  ),
  backstage_actions: cellStyleFromFill('backstage-action',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  backstage_tech: cellStyleFromFill('evidence',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
  support_systems: cellStyleFromFill('support',
    BLUEPRINT_LABEL_TEXT.backstage,
  ),
}

export type BlueprintZone = 'frontstage' | 'backstage'

export function getBlueprintLayerStyle(
  layerName: string,
  zone: BlueprintZone,
  role?: string | null,
): BlueprintLayerStyle {
  return (
    (role ? ROLE_STYLES[role] : undefined) ??
    LAYER_STYLES[layerName] ??
    (zone === 'backstage' ? BACKSTAGE_FALLBACK : FRONTSTAGE_FALLBACK)
  )
}

export function getBlueprintZoneColor(zone: BlueprintZone): string {
  return zone === 'backstage'
    ? BACKSTAGE_FALLBACK.accent
    : FRONTSTAGE_FALLBACK.accent
}

export function isBackstageBlueprintLayer(
  layer: BlueprintLayer,
  layers: BlueprintLayer[],
): boolean {
  const visibilityAfterIndex = layers.findIndex((entry) =>
    shouldShowVisibilityLineAfter(entry, layers),
  )
  if (visibilityAfterIndex === -1) return false
  const layerIndex = layers.findIndex((entry) => entry.id === layer.id)
  return layerIndex > visibilityAfterIndex
}

export function getBlueprintLayerZone(
  layer: BlueprintLayer,
  layers: BlueprintLayer[],
): BlueprintZone {
  return isBackstageBlueprintLayer(layer, layers) ? 'backstage' : 'frontstage'
}
