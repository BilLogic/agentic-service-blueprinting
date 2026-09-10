/**
 * The panel type scale — five roles, named once.
 *
 * Five panels and three tabs had drifted into six treatments for four jobs: a
 * section label was `text-2xs font-medium text-muted-foreground` in the spec
 * sections and `text-3xs font-semibold uppercase tracking-wide` in the
 * dependency groups; a value was `text-sm text-foreground/80` in one place and
 * `text-xs text-muted-foreground` in another. Naming the roles is what makes
 * the repetition survive the next panel — a class list copied by hand drifts,
 * a constant does not.
 *
 * Labels are two roles, not one. A *section heading* (`sectionHeading`) is
 * the title of a group inside a dialog or popover: one size larger, one ink
 * darker, so it reads as a heading. A *field label* (`sectionLabel`) sits
 * beside or above a control and annotates it. They are not interchangeable.
 * A third spelling — `sectionLabel` with `font-medium` dropped — is not a
 * third role; it is `sectionLabel` with a class missing.
 */
export const PANEL_TEXT = {
  /**
   * The thing itself: a cell's own words, an entity's name.
   *
   * `font-semibold`, not bold: at 14px in a narrow drawer, bold sets the title
   * shouting over the prose directly under it, which is what the panel exists
   * to show.
   *
   * And NOT `tracking-tight leading-snug`, which is what it carried until
   * 2026-08-21. Both are display-type devices — they exist to pull a large
   * heading back together, where default tracking reads loose. At 14px they do
   * the opposite, and this "title" is very often a whole sentence rather than
   * a short name ("Watches one frame at a time, and follows the locator back
   * to where it sits on the board."). Negative tracking plus 1.375 leading on a
   * semibold sentence is the worst of the available combinations: the letters
   * crowd and the lines crowd at once. Default tracking, normal leading.
   */
  title: 'min-w-0 text-sm font-semibold leading-normal text-foreground',
  /** Counts and relationships under the title. Never restates the title. */
  meta: 'text-2xs leading-tight text-muted-foreground',
  /**
   * The stronger label: a group title in a dialog or popover, a dialog
   * field that reads as a heading, or chrome that already wore this
   * class list (the collapsed sidebar title, an agent session name).
   *
   * One size larger and one ink darker than `sectionLabel`, so it reads as a
   * heading rather than as an annotation on a control.
   */
  sectionHeading: 'text-xs font-medium text-foreground',
  /**
   * Names a field. Always the same weight, size and colour.
   *
   * Not a group title — that is `sectionHeading`.
   */
  sectionLabel: 'text-2xs font-medium text-muted-foreground',
  /** Authored prose — what the panel exists to show. */
  value: 'text-sm text-foreground/80',
} as const

/*
  `DEFINED_LABEL_CUE` was here, and it is deleted.

  It was a dotted underline in the label's own ink — the `<abbr>` idiom, worn
  at thirteen sites — and beside it a `cursor-help`. Both announced that a word
  carries a definition, and both were asked for and then explicitly not wanted:
  the underline makes text look like a link that is not one, and the help
  cursor changes what the pointer means. Nothing replaces them. Discovery gets
  quieter, deliberately, for a tool used daily; if that ever needs addressing
  the answer is a one-time hint, not the return of the underline.

  What did NOT go with them is reach. Every definition is a `DefinitionPopover`
  whose trigger supplies `tabIndex` and which opens on touch, so it is gettable
  without a pointer — which the underline never was and the cursor never could
  be.
*/
