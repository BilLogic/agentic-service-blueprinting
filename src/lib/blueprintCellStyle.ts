import { cn } from '@/lib/utils'

/*
 * Blueprint colour vocabulary — two sets, deliberately disjoint.
 *
 * A LANE ROLE says what a swim lane *is*: evidence, actor, frontstage tech. Not
 * what colour it is. Naming lanes after hues is what made this hard to reason
 * about — `chartreuse` told you nothing about a blueprint, and stopped even
 * being true once fills became scale steps. A role survives a repalette.
 *
 * A TOUCHPOINT TONE is the colour someone picked for a tool. That one really is
 * a colour choice — "our scheduling tool is blue" is the blueprint owner's
 * decision — so
 * naming it after the hue is honest here where it was not for lanes.
 *
 * The two sets share no family, so a pill can never be mistaken for the lane it
 * sits in, whichever tone is picked.
 *
 * Which family each maps to lives in blueprint.css, keyed on
 * `data-blueprint-lane` / `data-blueprint-tone`. Nothing here assigns a colour.
 */
export type BlueprintLaneRole =
  /** Screenshots and journey stage — the pictorial band. */
  | 'visual'
  /** Physical evidence: what the customer can see or hold. */
  | 'evidence'
  /** Customer and staff actions — the people the service runs through. */
  | 'actor'
  /** Systems the customer touches directly. */
  | 'frontstage-tech'
  /** Staff actions the customer can see. */
  | 'frontstage-action'
  /** Systems only staff touch. */
  | 'backstage-tech'
  /** Staff actions the customer cannot see. */
  | 'backstage-action'
  /** Support processes and resources behind the internal line. */
  | 'support'

export const BLUEPRINT_LANE_ROLES = [
  'visual',
  'evidence',
  'actor',
  'frontstage-tech',
  'frontstage-action',
  'backstage-tech',
  'backstage-action',
  'support',
] as const satisfies readonly BlueprintLaneRole[]

/**
 * Tones a touchpoint colour can be set to. Disjoint from the families the lane
 * roles use, so a pill never reads as a lane.
 */
export type TouchpointTone =
  | 'crimson'
  | 'gold'
  | 'indigo'
  | 'purple'
  | 'red'
  | 'tomato'
  | 'yellow'

export const TOUCHPOINT_TONES = [
  'crimson',
  'gold',
  'indigo',
  'purple',
  'red',
  'tomato',
  'yellow',
] as const satisfies readonly TouchpointTone[]

/** Steps a cell uses, by role. */
export const CELL_STEP = {
  /** Resting surface. */
  surface: 500,
  hover: 600,
  pressed: 700,
  /**
   * Step 11, not the step-8 "border" step.
   *
   * Radix specifies step 8 as a border against the *app background* (steps 1–2).
   * On a step-5 surface — which is what a cell is — it measures 1.38:1 at worst
   * and fails SC 1.4.11 outright. Step 11 is the lowest step that clears 3:1
   * against step 5 across every family in both themes; worst case 3.60:1
   * (light/lime). `palette.test.ts` holds that line.
   */
  ring: 1100,
  /** High-contrast text. */
  text: 1200,
} as const

/** Same, for a touchpoint pill and its chosen tone. */
export function blueprintToneAttrs(
  tone: TouchpointTone,
): { 'data-blueprint-tone': TouchpointTone } {
  return { 'data-blueprint-tone': tone }
}

/**
 * The grid's rules stay one neutral across every lane — a per-family border
 * would make a row of differently-tinted cells read as ragged rather than as
 * one table.
 */
export const BLUEPRINT_CELL_BORDER_COLOR = 'var(--color-gray-1200)'

/**
 * Marks which lane a cell belongs to. The `[data-blueprint-lane]` rules in
 * blueprint.css turn that into the surface, hover, pressed and ring steps.
 *
 * An attribute, not a bag of custom properties: which lane a cell is in is row
 * data, but which colour that means is a styling decision, and it belongs in
 * the stylesheet. Nothing here assigns a colour.
 */
export function blueprintLaneAttrs(
  role: BlueprintLaneRole,
): { 'data-blueprint-lane': BlueprintLaneRole } {
  return { 'data-blueprint-lane': role }
}

export function blueprintCellButtonClassName({
  compact = false,
  variant = 'cell',
  className,
}: {
  compact?: boolean
  variant?: 'cell' | 'pill' | 'visual'
  className?: string
} = {}) {
  const shared = cn(
    'h-auto w-full font-normal whitespace-normal shadow-none ring-offset-0',
    compact ? 'text-xs' : 'text-sm',
  )

  if (variant === 'pill') {
    return cn(
      shared,
      'rounded-full text-center leading-snug',
      compact ? 'px-2.5 py-2' : 'px-3 py-2.5',
      className,
    )
  }

  if (variant === 'visual') {
    return cn(
      shared,
      'rounded-lg flex items-center justify-center',
      compact ? 'px-2 py-3' : 'px-3 py-4',
      className,
    )
  }

  return cn(
    shared,
    'rounded-lg flex-1 items-start justify-start text-left leading-relaxed',
    compact ? 'px-3 py-2.5' : 'px-4 py-3.5',
    className,
  )
}
