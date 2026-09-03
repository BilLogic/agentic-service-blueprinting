/**
 * The words this app made up, defined once.
 *
 * TWO, and that is the point. There were once eleven, and nine of them were
 * ordinary English on a form label — `Status`, `Summary`, `Position`, `Paths`,
 * `Dependencies`, `Resources`. A definition on every label teaches a reader
 * that hovering is worth doing about eleven times before it teaches anything,
 * and the words that genuinely needed explaining were the ones that got lost
 * in it.
 *
 * What survives is what a reader could not guess from English: a STORYBOARD is
 * not a story, and a TOUCHPOINT is not a point. Both read as plain field labels
 * — each beside Summary, Status and Owner rather than as a mystery tag stacked
 * among value badges. The definition rides the label's own hint popover — the
 * touch/press affordance every other field label already uses.
 *
 * A definition may hang off a label here because the label names a word this
 * app made up, not ordinary English on a form.
 *
 * Each entry is a card SECTION's body, under an eyebrow that already prints
 * the term, so neither opens by naming the term again.
 */
export const PANEL_TERMS = {
  touchpoint:
    'The tool or surface this moment happens through — an app screen, an email, a video call.',
  storyboard: 'The frames drawn for this moment, one per actor lane.',
} as const

/**
 * What a phase, a scenario, a path, a step, a lane and a service ARE.
 *
 * The entity kinds are the one vocabulary the app never defined. `PANEL_TERMS`
 * above explains the words INSIDE a panel — `Dependencies`, `Evidence` — on the
 * assumption that a reader who opened the panel knows what kind of thing they
 * opened it on. A panel full of a lane's contents answers "what is in this
 * lane" and never "what is a lane".
 *
 * These hang off the entity's own label ON THE BOARD, not off the panel badge.
 * A reader who does not know what a lane is has that question while looking at
 * the board, before anything is opened — and an explanation that arrives only
 * after the click is an explanation for somebody who no longer needs it.
 *
 * `label` is the word as the popover prints it; `definition` is the sentence.
 * One entry per kind and no exemptions: a reader learns the shape once — kind
 * above the rule, this instance below it — and it never varies.
 */
export const ENTITY_KIND_DEFINITIONS = {
  service: {
    label: 'Service',
    definition:
      'The whole service this blueprint maps, end to end. Everything else on the board is part of it.',
  },
  phase: {
    label: 'Phase',
    definition:
      'A chapter of the service, in time order. Each phase holds the scenarios that can happen during it.',
  },
  scenario: {
    label: 'Scenario',
    definition: 'A specific situation inside a phase, mapped on its own board.',
  },
  path: {
    label: 'Path',
    definition:
      'One route through a scenario: the main way, plus variants and exceptions. Paths are alternatives, not stages — nothing carries across them.',
  },
  step: {
    label: 'Step',
    definition:
      'A column of the board: one moment in time, read down every lane at once. Steps run left to right.',
  },
  lane: {
    label: 'Lane',
    definition:
      'A row of the board, for one kind of participant — the customer, frontstage staff, backstage work, the tools. A row reads across every step.',
  },
} as const

/** The six kinds that carry a definition. `path` is the one that is not a panel. */
export type EntityKindTerm = keyof typeof ENTITY_KIND_DEFINITIONS

/** The six kinds in the order a deployer authors and a reader meets them. */
export const ENTITY_KIND_ORDER = Object.keys(
  ENTITY_KIND_DEFINITIONS,
) as EntityKindTerm[]

/**
 * One authored, free-text example per core kind, grounding each definition in
 * this deployment. Keyed by the six `EntityKindTerm`s; a kind nobody has
 * written an example for simply has no entry, so the reader sees no empty slot.
 *
 * The type lives here — beside the kinds it is keyed by — so the read hook, the
 * write mutation and the popover that render it all name one shape rather than
 * three.
 */
export type EntityExamples = Partial<Record<EntityKindTerm, string>>

/** What a description slot says when nobody has written one yet. */
export const INSTANCE_DESCRIPTION_PLACEHOLDER =
  'Description needs to be added to database.'

/**
 * What an example slot says to an EDITOR when nobody has written one yet.
 *
 * Reader-invisible by design: a blank example renders nothing for a reader, and
 * this prompt only where the canvas is in design mode — the same "the app
 * admits a field is empty" nudge `INSTANCE_DESCRIPTION_PLACEHOLDER` is, aimed at
 * the deployer who can act on it.
 */
export const ENTITY_EXAMPLE_PLACEHOLDER =
  'Example needs to be added to database.'

/**
 * An instance's own description, or the prompt to write one.
 *
 * The placeholder is not filler: it is the only place the app admits a field
 * is empty, and it is what has got several of them filled in.
 */
export function instanceDescriptionText(
  description: string | null | undefined,
): string {
  const trimmed = description?.trim()
  return trimmed || INSTANCE_DESCRIPTION_PLACEHOLDER
}
