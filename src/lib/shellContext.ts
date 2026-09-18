/*
  THE SENTENCES A SHELL REPORTS ABOUT ITSELF TO THE AGENT.

  Each line here is read by a model, and two of them are read by the
  navigation tools as well — so they are not prose a shell may phrase its own
  way, they are the wire between a surface and whoever reads it. Every one
  arrived here after the same failure: the fact was true on screen and the
  sentence describing it was assembled longhand at each place that needed it,
  until one copy drifted and told its reader something the screen did not say.
  Extracted so each sentence can be asserted without mounting a shell.

  Deliberately narrow: this module owns the individual sentences, not the
  shape of a whole context. The phone has no sidebar and no docked panel to
  report, and a single assembled context would force it to answer for
  furniture it does not have.
*/

import { getSlideDisplayLabel } from '@/types/nav'
import type { NavItem } from '@/types/nav'

/**
 * How the editor shell describes its sidebar to the agent.
 *
 * This is a sentence the model reads, so it is code with a reader — and it
 * got that reader wrong. The shell publishes the sidebar's state three times
 * (the collapsed context, the floating navbar's gate, and this line) from one
 * fact that was written out longhand each time. Two copies said
 * `collapsed && !presenting && !isLanding`; the third said "collapsed"
 * whenever the aside was hidden at all, which is also true while presenting
 * and on the landing view.
 *
 * A reader mid-presentation asking "where did the sidebar go?" was told it was
 * collapsed and to expand it — when presentation hides the navbar entirely and
 * Return is the way back. `EditorShell` already warns about exactly this
 * conflation, in a comment on one of the two lines that got it right.
 *
 * Extracted so the sentence can be asserted without mounting the shell.
 */
export type SidebarPosture = {
  /** Which panel the rail has selected. */
  panel: string
  /** Collapsed BY THE READER — not merely an aside that is not on screen. */
  collapsed: boolean
  /** Narrow viewport: the aside draws over the canvas when open. */
  overlay: boolean
  /** Presentation is full-bleed; the aside is gone and Return is the way out. */
  presenting: boolean
}

/**
 * One line naming the sidebar's state, or as much of it as is true.
 *
 * Order is deliberate and matches the other shell lines: what it is, then
 * every qualifier that applies, each earning its clause independently.
 */
export function describeSidebar({
  panel,
  collapsed,
  overlay,
  presenting,
}: SidebarPosture): string {
  const notes = [
    collapsed ? 'collapsed' : null,
    overlay ? 'narrow viewport (it overlays the canvas when open)' : null,
    presenting ? 'presenting' : null,
  ].filter(Boolean)
  return `Sidebar: ${panel} panel${notes.length > 0 ? `, ${notes.join(', ')}` : ''}`
}

/** The two things a shell reports a selection of, in the tools' vocabulary. */
export type SelectionKind = 'phase' | 'scenario'

/**
 * What a shell knows about the phase or scenario it has selected.
 *
 * NOT `SelectedSlide`. A *slide* in this codebase is one row of a slice — a
 * moment of that slice as a reader meets it — and what a shell selects is a
 * phase or a scenario on the canvas. The glossary polices that word, and this
 * type is on the shell/agent wire: a name here that calls a phase a slide
 * teaches every later reader the wrong noun for the thing the tools navigate.
 */
export type SelectedItem = {
  id: string
  /** The reader-facing label, already resolved by the shell that has it. */
  label: string
}

/**
 * The nav item a shell has selected, in the shape the line wants — or nothing.
 *
 * The two shells spelled this ternary out four times between them, and each
 * copy had to remember that the label is `getSlideDisplayLabel`'s answer and
 * not the item's own `label` field. One copy forgetting that is a line whose
 * reader and whose model disagree about what is on screen, which is the
 * failure this module exists to prevent, one level up.
 */
export function selectionOf(
  item: NavItem | undefined,
  slides: NavItem[],
): SelectedItem | null {
  return item
    ? { id: item.id, label: getSlideDisplayLabel(item, slides) }
    : null
}

/*
  The one spelling of the sentence, and the reason rendering and recognition
  live together. The navigation tools do not trust a selection they cannot
  read back: they poll the shell context until this line names the id they
  asked for, because a camera that is idle is also what a cancelled flight
  looks like. So the line is not prose the shells may each phrase their own
  way — it is the wire between a shell and the tool verifying its move, and
  the phone proved what happens when one end drifts. It shipped without the
  phase line entirely and every agent-driven jump answered "the selected
  phase was not verified" while the canvas sat on exactly the phase asked
  for, which teaches a model to apologise for moves that landed.
*/
const SELECTION_LABEL: Record<SelectionKind, string> = {
  phase: 'Selected phase',
  scenario: 'Selected scenario',
}

/**
 * Why an absent selection is a view rather than a fault, in one word.
 *
 * A closed set, not free text: the qualifier is part of a line whose
 * recognisability is the whole point, and a shell that may write any words
 * inside those parentheses is a shell that can invent a fifth spelling of the
 * sentence without anything noticing.
 *
 * `overview` exists because the phone reports no `View level:` line the way
 * the desktop does — so on the zoomed-out board this qualifier is the ONLY
 * signal to the model that no scenario is open by design rather than by
 * mistake. Give the phone a view-level line of its own and this goes away.
 */
export type SelectionAbsence = 'overview'

/**
 * The line a shell reports its selected phase or scenario with.
 *
 * `note` qualifies an absent selection that is a view rather than a fault —
 * the phone's overview has no scenario open by design, and saying so bare
 * reads as something to fix. It rides inside the same sentence so the line
 * a tool recognises as no selection stays recognisable as one.
 */
export function describeSelection(
  kind: SelectionKind,
  selected: SelectedItem | null,
  note?: SelectionAbsence,
): string {
  if (!selected)
    return `${SELECTION_LABEL[kind]}: none${note ? ` (${note})` : ''}`
  return `${SELECTION_LABEL[kind]}: "${selected.label}" (${selected.id})`
}

/**
 * Whether a shell context names this id as its selected phase or scenario.
 *
 * Matched against the rendered line rather than by re-deriving the format:
 * the id closes its own line in parentheses, so a label carrying quotes or
 * parentheses of its own cannot be mistaken for the identifier. An absent
 * selection matches nothing, including the literal id `none` — a tool that
 * read that word as an identifier would report a landed navigation for a
 * selection that never happened.
 */
export function namesSelection(
  context: string,
  kind: SelectionKind,
  id: string,
): boolean {
  const opening = `${SELECTION_LABEL[kind]}: `
  return context
    .split('\n')
    .some(
      (line) =>
        line.startsWith(opening) &&
        line !== `${opening}none` &&
        !line.startsWith(`${opening}none (`) &&
        line.endsWith(`(${id})`),
    )
}
