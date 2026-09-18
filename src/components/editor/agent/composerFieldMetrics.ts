import { cn } from '@/lib/utils'

/*
 * THE AGREEMENT the composer's field and the ink behind it are held to,
 * as the pure half of one module: `ComposerInkedField` beside this file
 * renders both copies of the draft and reads their class lists from here.
 * It is its own file because it is the seam — nothing in it touches the
 * tree, so what pins it needs no tree either, and a class list nobody can
 * build a second way is the whole mechanism.
 */

/**
 * EVERY metric the composer's field and the mirror behind it must agree on, in
 * one string both of them wear.
 *
 * The field is a real `<textarea>` and stays one: selection, IME composition,
 * the mobile keyboard, native undo and the mobile shell's own handling all
 * come from the browser, and a contenteditable rewrite would owe every one of
 * them back. So colouring a token inside it means drawing the same string
 * twice — a mirror behind the field renders the prose with each resolved token
 * in a coloured span, and the field sits on top with transparent text and a
 * visible caret.
 *
 * Two copies of one string agree on where a line breaks only if they agree on
 * every property that decides it. A half-pixel disagreement is the failure
 * this technique is known for: the coloured text sits a fraction off the
 * caret, and the field appears to shimmer as it is typed into. Hence one
 * string — both rungs of the responsive font size, the line height, the
 * padding, the wrapping — spread onto both, rather than two class lists a
 * later edit can move one of.
 *
 * The scrollbar gutter is in here for the same reason and is not cosmetic.
 * The field scrolls once the message passes six lines; the mirror behind it
 * has its overflow hidden and is scrolled programmatically. Without a reserved
 * gutter, a platform with classic scrollbars narrows the field's line box at
 * the line that overflows and leaves the mirror's alone, so the two wrap
 * differently from that line down and never recover.
 */
// geometry: min-h-7 is the 28px composer box and a 20px line sits in its
// padding — the same pair the field has always carried, now written once.
export const COMPOSER_FIELD_METRICS =
  'max-h-30 min-h-7 px-2 py-2 text-lg leading-5 whitespace-pre-wrap wrap-break-word [scrollbar-gutter:stable] md:text-sm'

/**
 * The agreement, resolved ONCE for both copies of the draft.
 *
 * This is the whole reason the two class lists cannot drift apart: there is no
 * second place either of them is built, so a metric cannot be spelled onto the
 * field by an edit that never learns the ink exists. It is the interface the
 * agreement is asserted through — one call returning both strings, rather
 * than a test reaching into the rendered tree for two nodes and splitting
 * their `class` attributes, which is the friction that made the old pair easy
 * to edit apart.
 *
 * `inking` is the transparency toggle. The field hands the drawing over only
 * while the mirror is actually up: transparent text with nothing behind it is
 * an empty composer, and a preedit string an IME is still composing lives in
 * the field and nowhere else.
 *
 * `relative` on the field is not cosmetic either: the mirror is absolutely
 * positioned and would paint over a static sibling however early it sits in
 * the tree, hiding the caret the reader is aiming with. The selection band is
 * translucent for the same stacking reason — an opaque one would cover the
 * only copy of the text a reader can see.
 */
export function composerInkedFieldClasses(inking: boolean): {
  field: string
  mirror: string
} {
  return {
    field: cn(
      COMPOSER_FIELD_METRICS,
      'relative selection:bg-primary/25',
      inking && 'text-transparent caret-foreground',
    ),
    mirror: cn(
      COMPOSER_FIELD_METRICS,
      'pointer-events-none absolute inset-0 overflow-hidden select-none',
    ),
  }
}
