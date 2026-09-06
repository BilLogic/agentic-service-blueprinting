/**
 * The panel type scale — four roles, named once.
 *
 * Five panels and three tabs had drifted into six treatments for four jobs: a
 * section label was `text-2xs font-medium text-muted-foreground` in the spec
 * sections and `text-3xs font-semibold uppercase tracking-wide` in the
 * dependency groups; a value was `text-sm text-foreground/80` in one place and
 * `text-xs text-muted-foreground` in another. Naming the roles is what makes
 * the repetition survive the next panel — a class list copied by hand drifts,
 * a constant does not.
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
  /** Names a field or a group. Always the same weight, size and colour. */
  sectionLabel: 'text-2xs font-medium text-muted-foreground',
  /** Authored prose — what the panel exists to show. */
  value: 'text-sm text-foreground/80',
} as const

/*
  `DEFINED_LABEL_CUE` was here, and it is deleted (#243).

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
